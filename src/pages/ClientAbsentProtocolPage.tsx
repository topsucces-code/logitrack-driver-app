import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { deliveryLogger } from '../utils/logger';
import {
  ArrowLeft,
  Phone,
  User,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Info,
} from 'lucide-react';
import { supabase, Delivery } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PROTOCOL_CONFIG } from '../config/app.config';
import { useToast } from '../contexts/ToastContext';

// Types pour les étapes
type ProtocolStep = 1 | 2 | 3;

interface CallAttempt {
  timestamp: Date;
  duration?: number;
}

export default function ClientAbsentProtocolPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { driver } = useAuth();
  const { showError } = useToast();

  // State
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<ProtocolStep>(1);
  const [callAttempts, setCallAttempts] = useState<CallAttempt[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [protocolStarted, setProtocolStarted] = useState(false);
  const [returning, setReturning] = useState(false);

  // Charger la livraison
  useEffect(() => {
    if (!id) return;

    async function fetchDelivery() {
      const { data, error } = await supabase
        .from('logitrack_deliveries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        deliveryLogger.error('Error fetching delivery', { error });
        navigate('/');
        return;
      }

      setDelivery(data as Delivery);
      setLoading(false);

      // Restaurer l'état du protocole si déjà commencé
      try {
        const savedState = localStorage.getItem(`protocol_${id}`);
        if (savedState) {
          const state = JSON.parse(savedState) as { callAttempts: Array<{ timestamp: string }>; timerSeconds: number };
          setCallAttempts(state.callAttempts.map((c) => ({ ...c, timestamp: new Date(c.timestamp) })));
          setTimerSeconds(state.timerSeconds || 0);
          setProtocolStarted(true);
          setTimerActive(true);
          updateStep(state.callAttempts.length);
        }
      } catch {
        // Si les données sont corrompues, on les supprime
        localStorage.removeItem(`protocol_${id}`);
      }
    }

    fetchDelivery();
  }, [id, navigate]);

  // Refs to avoid re-creating interval on every tick
  const callAttemptsRef = useRef(callAttempts);
  callAttemptsRef.current = callAttempts;

  const timerSecondsRef = useRef(timerSeconds);
  timerSecondsRef.current = timerSeconds;

  // Timer - uses refs to avoid deps on timerSeconds/callAttempts
  useEffect(() => {
    if (!timerActive) return;

    const interval = setInterval(() => {
      if (timerSecondsRef.current >= PROTOCOL_CONFIG.waitTimeSeconds) {
        clearInterval(interval);
        return;
      }
      setTimerSeconds(prev => {
        const newSeconds = prev + 1;
        // Sauvegarder l'état
        if (id) {
          localStorage.setItem(`protocol_${id}`, JSON.stringify({
            callAttempts: callAttemptsRef.current,
            timerSeconds: newSeconds,
          }));
        }
        return newSeconds;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, id]);

  // Mettre à jour l'étape en fonction des appels
  const updateStep = useCallback((callCount: number) => {
    if (callCount >= 3) {
      setStep(3);
    } else if (callCount >= 1) {
      setStep(2);
    } else {
      setStep(1);
    }
  }, []);

  // Formater le temps
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculer le temps restant
  const remainingTime = PROTOCOL_CONFIG.waitTimeSeconds - timerSeconds;
  const timerExpired = remainingTime <= 0;

  // Démarrer le protocole
  const startProtocol = () => {
    setProtocolStarted(true);
    setTimerActive(true);
    makeCall();
  };

  // Faire un appel
  const makeCall = () => {
    if (!delivery || callAttempts.length >= PROTOCOL_CONFIG.maxCalls) return;

    // Ouvrir l'application téléphone
    window.open(`tel:${delivery.delivery_contact_phone}`, '_system');

    // Enregistrer la tentative
    const newAttempt: CallAttempt = { timestamp: new Date() };
    const newAttempts = [...callAttempts, newAttempt];
    setCallAttempts(newAttempts);
    updateStep(newAttempts.length);

    // Sauvegarder l'état
    if (id) {
      localStorage.setItem(`protocol_${id}`, JSON.stringify({
        callAttempts: newAttempts,
        timerSeconds,
      }));
    }
  };

  // Retourner le colis
  const returnPackage = async () => {
    if (!delivery || !driver) return;

    setReturning(true);

    try {
      // Enregistrer l'incident client absent
      const { error: incidentError } = await supabase.from('logitrack_incidents').insert({
        delivery_id: delivery.id,
        tracking_code: delivery.id.slice(0, 8).toUpperCase(),
        reporter_type: 'driver',
        reporter_id: driver.id,
        reporter_name: driver.full_name,
        reporter_phone: driver.phone,
        driver_id: driver.id,
        category: 'customer',
        incident_type: 'client_absent',
        title: 'Client absent - Protocole complété',
        description: `Client injoignable après ${callAttempts.length} tentatives d'appel et ${formatTime(timerSeconds)} d'attente. Retour du colis au vendeur.`,
        priority: 'medium',
        status: 'resolved',
        photos: [],
        disputed_amount: 0,
        resolution: 'no_action',
        resolution_notes: 'Protocole client absent complété. Paiement partiel appliqué.',
      });

      if (incidentError) {
        deliveryLogger.error('Error creating incident', { error: incidentError });
      }

      // Mettre à jour le statut de la livraison
      const { error: updateError } = await supabase
        .from('logitrack_deliveries')
        .update({
          status: 'returning',
          cancellation_reason: `Client absent - Protocole complété: ${callAttempts.length} appels, ${formatTime(timerSeconds)} d'attente`,
        })
        .eq('id', delivery.id);

      if (updateError) {
        throw updateError;
      }

      // Nettoyer le localStorage
      localStorage.removeItem(`protocol_${id}`);

      // Naviguer vers le dashboard avec message de succès
      navigate('/', {
        state: {
          message: 'Protocole complété. Vous serez payé 50% de la course.',
          type: 'success'
        }
      });

    } catch (err) {
      deliveryLogger.error('Error returning package', { error: err });
      showError('Erreur lors du retour du colis');
    }

    setReturning(false);
  };

  // Annuler le protocole (client a répondu)
  const cancelProtocol = () => {
    localStorage.removeItem(`protocol_${id}`);
    navigate(`/delivery/${id}`);
  };

  if (loading || !delivery) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Conditions pour pouvoir retourner le colis
  const canReturn = (callAttempts.length >= PROTOCOL_CONFIG.maxCalls && timerExpired) ||
                   (callAttempts.length >= PROTOCOL_CONFIG.maxCalls && timerSeconds >= 300); // Au moins 5 min après 3 appels

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-amber-500 text-white safe-top px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(`/delivery/${id}`)}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <h1 className="text-lg font-bold">CLIENT ABSENT</h1>
            </div>
            <p className="text-sm text-amber-100">
              Étape {step}/3 : {step === 1 ? 'Premier appel' : step === 2 ? 'Tentatives supplémentaires' : 'Attente expirée'}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Info client */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Client</p>
          <p className="font-semibold text-gray-900">{delivery.delivery_contact_name || 'Client'}</p>
          <p className="text-sm text-gray-600">{delivery.delivery_address}</p>
          <p className="text-sm text-primary-600 mt-1">{delivery.delivery_contact_phone}</p>
        </div>

        {/* État du protocole */}
        {!protocolStarted ? (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Le client ne répond pas ?
            </h2>
            <p className="text-gray-600 mb-6">
              Démarrez le protocole client absent pour documenter vos tentatives de contact.
            </p>
            <button
              onClick={startProtocol}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Démarrer le protocole
            </button>
          </div>
        ) : (
          <>
            {/* Compteur d'appels */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-900">Appels effectués</span>
                </div>
                <span className="text-2xl font-bold text-amber-600">
                  {callAttempts.length}/{PROTOCOL_CONFIG.maxCalls}
                </span>
              </div>

              {/* Indicateurs visuels des appels */}
              <div className="flex gap-2 mb-4">
                {[1, 2, 3].map((num) => (
                  <div
                    key={num}
                    className={`flex-1 h-2 rounded-full ${
                      callAttempts.length >= num ? 'bg-amber-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              {callAttempts.length < PROTOCOL_CONFIG.maxCalls && (
                <button
                  onClick={makeCall}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" />
                  Appeler à nouveau ({callAttempts.length + 1}/{PROTOCOL_CONFIG.maxCalls})
                </button>
              )}

              {callAttempts.length >= PROTOCOL_CONFIG.maxCalls && (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Tous les appels effectués</span>
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-900">Temps d'attente</span>
              </div>

              <div className="text-center py-4">
                <p className="text-4xl font-mono font-bold text-gray-900">
                  {formatTime(timerSeconds)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  / {formatTime(PROTOCOL_CONFIG.waitTimeSeconds)}
                </p>

                {/* Barre de progression */}
                <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      timerExpired ? 'bg-green-500' : 'bg-amber-500'
                    }`}
                    style={{
                      width: `${Math.min((timerSeconds / PROTOCOL_CONFIG.waitTimeSeconds) * 100, 100)}%`,
                    }}
                  />
                </div>

                {timerExpired && (
                  <p className="mt-2 text-green-600 font-medium">
                    Temps d'attente complété
                  </p>
                )}
              </div>
            </div>

            {/* Informations */}
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">Après 15 minutes sans réponse :</p>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      Tu seras payé <strong>{PROTOCOL_CONFIG.partialPaymentPercent}%</strong> de la course
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      Le colis sera retourné au vendeur
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Historique des appels */}
            {callAttempts.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="font-medium text-gray-900 mb-3">Historique des appels</p>
                <div className="space-y-2">
                  {callAttempts.map((attempt, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
                    >
                      <span className="text-gray-600">
                        Appel {index + 1}
                      </span>
                      <span className="text-gray-500">
                        {attempt.timestamp.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions fixes en bas */}
      {protocolStarted && (
        <div className="bg-white border-t border-gray-200 p-4 safe-bottom space-y-3">
          {canReturn ? (
            <button
              onClick={returnPackage}
              disabled={returning}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {returning ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <RotateCcw className="w-5 h-5" />
              )}
              CLIENT INJOIGNABLE - RETOURNER COLIS
            </button>
          ) : (
            <button
              disabled
              className="w-full py-4 bg-gray-300 text-gray-500 font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              {callAttempts.length < PROTOCOL_CONFIG.maxCalls
                ? `Effectuez ${PROTOCOL_CONFIG.maxCalls - callAttempts.length} appel(s) supplémentaire(s)`
                : `Attendez encore ${formatTime(remainingTime)}`}
            </button>
          )}

          <button
            onClick={cancelProtocol}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5 text-green-500" />
            Le client a répondu
          </button>
        </div>
      )}
    </div>
  );
}
