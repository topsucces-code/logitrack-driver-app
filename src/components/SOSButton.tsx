import { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  Phone,
  X,
  Shield,
  Car,
  Heart,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { Button } from "./ui/Button";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  sendSOSAlert,
  callEmergencyServices,
  callSupport,
  openWhatsAppSupport,
  SOSAlert,
} from "../services/sosService";
import { hapticHeavy, hapticError } from "../hooks/useHapticFeedback";

interface SOSButtonProps {
  deliveryId?: string;
  compact?: boolean;
}

type AlertType = SOSAlert["alert_type"];

const ALERT_TYPES: {
  type: AlertType;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    type: "emergency",
    label: "Urgence générale",
    icon: <AlertTriangle className="w-6 h-6" />,
    color: "bg-red-500",
  },
  {
    type: "security",
    label: "Problème de sécurité",
    icon: <Shield className="w-6 h-6" />,
    color: "bg-orange-500",
  },
  {
    type: "accident",
    label: "Accident",
    icon: <Car className="w-6 h-6" />,
    color: "bg-yellow-500",
  },
  {
    type: "medical",
    label: "Urgence médicale",
    icon: <Heart className="w-6 h-6" />,
    color: "bg-pink-500",
  },
  {
    type: "vehicle_issue",
    label: "Panne véhicule",
    icon: <AlertCircle className="w-6 h-6" />,
    color: "bg-blue-500",
  },
];

const HOLD_DURATION = 2000; // 2 seconds to activate SOS

export function SOSButton({ deliveryId, compact = false }: SOSButtonProps) {
  const { driver } = useAuth();
  const { showSuccess, showError } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState<AlertType | null>(null);
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // Handle long press for quick SOS
  const handlePressStart = () => {
    setIsHolding(true);
    setHoldProgress(0);

    // Progress animation
    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setHoldProgress(progress);
    }, 50);

    // Activate SOS after hold duration
    holdTimerRef.current = setTimeout(() => {
      hapticHeavy();
      setShowModal(true);
      setIsHolding(false);
      setHoldProgress(0);
      clearIntervals();
    }, HOLD_DURATION);
  };

  const handlePressEnd = () => {
    if (holdProgress < 100) {
      // Short press - show modal directly
      setShowModal(true);
    }
    setIsHolding(false);
    setHoldProgress(0);
    clearIntervals();
  };

  const clearIntervals = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearIntervals();
  }, []);

  // Send SOS alert
  const handleSendSOS = async () => {
    if (!driver || !selectedType) return;

    setSending(true);
    hapticHeavy();

    const result = await sendSOSAlert(
      driver.id,
      selectedType,
      deliveryId,
      description || undefined,
    );

    if (result.success) {
      showSuccess("Alerte SOS envoyée ! L'équipe support a été notifiée.");
      setShowModal(false);
      setSelectedType(null);
      setDescription("");
    } else {
      hapticError();
      showError(result.error || "Erreur lors de l'envoi de l'alerte");
    }

    setSending(false);
  };

  // Quick emergency call
  const handleEmergencyCall = () => {
    hapticHeavy();
    callEmergencyServices();
  };

  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
        >
          <AlertTriangle className="w-6 h-6" />
        </button>

        {showModal && (
          <SOSModal
            showModal={showModal}
            setShowModal={setShowModal}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            description={description}
            setDescription={setDescription}
            sending={sending}
            handleSendSOS={handleSendSOS}
            handleEmergencyCall={handleEmergencyCall}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Main SOS Button */}
      <div className="relative">
        <button
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          className={`
            relative w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg
            flex items-center justify-center gap-3 shadow-lg
            active:scale-[0.98] transition-all overflow-hidden
            ${isHolding ? "animate-pulse" : ""}
          `}
        >
          {/* Progress bar for hold */}
          {isHolding && (
            <div
              className="absolute inset-0 bg-red-700 transition-all"
              style={{ width: `${holdProgress}%` }}
            />
          )}

          <span className="relative z-10 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <span>{isHolding ? "Maintenez..." : "SOS - Urgence"}</span>
          </span>
        </button>

        <p className="text-xs text-gray-500 text-center mt-2">
          Appuyez pour les options ou maintenez 2s pour l'alerte rapide
        </p>
      </div>

      {/* SOS Modal */}
      {showModal && (
        <SOSModal
          showModal={showModal}
          setShowModal={setShowModal}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          description={description}
          setDescription={setDescription}
          sending={sending}
          handleSendSOS={handleSendSOS}
          handleEmergencyCall={handleEmergencyCall}
        />
      )}
    </>
  );
}

// Separated Modal Component
function SOSModal({
  showModal,
  setShowModal,
  selectedType,
  setSelectedType,
  description,
  setDescription,
  sending,
  handleSendSOS,
  handleEmergencyCall,
}: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  selectedType: AlertType | null;
  setSelectedType: (type: AlertType | null) => void;
  description: string;
  setDescription: (desc: string) => void;
  sending: boolean;
  handleSendSOS: () => void;
  handleEmergencyCall: () => void;
}) {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 safe-bottom max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Alerte SOS</h2>
              <p className="text-sm text-gray-500">
                Sélectionnez le type d'urgence
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Emergency Call Banner */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700 font-medium mb-3">
            En cas d'urgence vitale, appelez immédiatement :
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleEmergencyCall}
              variant="danger"
              size="sm"
              icon={<Phone className="w-4 h-4" />}
              className="flex-1"
            >
              Police (110)
            </Button>
            <Button
              onClick={() => (window.location.href = "tel:185")}
              variant="danger"
              size="sm"
              icon={<Heart className="w-4 h-4" />}
              className="flex-1"
            >
              SAMU (185)
            </Button>
          </div>
        </div>

        {/* Alert Type Selection */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Type d'alerte
          </p>
          <div className="grid grid-cols-2 gap-3">
            {ALERT_TYPES.map((alertType) => (
              <button
                key={alertType.type}
                onClick={() => setSelectedType(alertType.type)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedType === alertType.type
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-10 h-10 ${alertType.color} rounded-full flex items-center justify-center text-white mb-2`}
                >
                  {alertType.icon}
                </div>
                <p className="font-medium text-gray-900 text-sm">
                  {alertType.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Description (optional) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (optionnel)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez brièvement la situation..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleSendSOS}
            disabled={!selectedType}
            loading={sending}
            variant="danger"
            fullWidth
            size="lg"
            icon={<AlertTriangle className="w-5 h-5" />}
          >
            Envoyer l'alerte SOS
          </Button>

          {/* Contact Support */}
          <div className="flex gap-3">
            <Button
              onClick={callSupport}
              variant="outline"
              className="flex-1"
              icon={<Phone className="w-4 h-4" />}
            >
              Appeler Support
            </Button>
            <Button
              onClick={() => openWhatsAppSupport()}
              variant="outline"
              className="flex-1"
              icon={<MessageCircle className="w-4 h-4" />}
            >
              WhatsApp
            </Button>
          </div>

          <Button onClick={() => setShowModal(false)} variant="ghost" fullWidth>
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SOSButton;
