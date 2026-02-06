import { useState } from 'react';
import {
  CreditCard,
  Phone,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  Clock,
  Shield,
  Info,
} from 'lucide-react';
import {
  MobileMoneyProvider,
  PaymentResult,
} from '../types/mobileMoney';
import {
  MOBILE_MONEY_PROVIDERS,
  initiatePayment,
  confirmPayment,
  calculateFees,
  formatCurrency,
  validatePhoneNumber,
} from '../services/mobileMoneyService';

interface MobileMoneyPaymentProps {
  amount: number;
  description: string;
  deliveryId?: string;
  recipientPhone?: string;
  onClose: () => void;
  onSuccess?: (result: PaymentResult) => void;
}

type PaymentStep = 'provider' | 'phone' | 'confirm' | 'processing' | 'success' | 'failed';

export function MobileMoneyPayment({
  amount,
  description,
  deliveryId,
  recipientPhone,
  onClose,
  onSuccess,
}: MobileMoneyPaymentProps) {
  const [step, setStep] = useState<PaymentStep>('provider');
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProvider | null>(null);
  const [phoneNumber, setPhoneNumber] = useState(recipientPhone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PaymentResult | null>(null);

  const provider = selectedProvider ? MOBILE_MONEY_PROVIDERS[selectedProvider] : null;
  const fees = selectedProvider ? calculateFees(amount, selectedProvider) : 0;
  const totalAmount = amount + fees;

  const handleSelectProvider = (providerId: MobileMoneyProvider) => {
    setSelectedProvider(providerId);
    if (recipientPhone) {
      setStep('confirm');
    } else {
      setStep('phone');
    }
  };

  const handlePhoneSubmit = () => {
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      setError('Numéro de téléphone invalide');
      return;
    }
    setPhoneNumber(validation.formatted);
    setError('');
    setStep('confirm');
  };

  const handleInitiatePayment = async () => {
    if (!selectedProvider) return;

    setStep('processing');
    setLoading(true);
    setError('');

    try {
      const paymentResult = await initiatePayment({
        amount,
        provider: selectedProvider,
        phoneNumber,
        description,
        deliveryId,
      });

      if (paymentResult.success && paymentResult.transaction) {
        // Simuler attente de confirmation
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Confirmer le paiement
        const confirmResult = await confirmPayment(paymentResult.transaction.id);

        setResult(confirmResult);

        if (confirmResult.success) {
          setStep('success');
          onSuccess?.(confirmResult);
        } else {
          setError(confirmResult.error || 'Paiement échoué');
          setStep('failed');
        }
      } else {
        setError(paymentResult.error || 'Erreur lors du paiement');
        setStep('failed');
      }
    } catch (err) {
      setError('Erreur de connexion');
      setStep('failed');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'provider':
        return (
          <div className="space-y-4">
            {/* Montant */}
            <div className="bg-primary-50 dark:bg-primary-900/30 rounded-xl p-4 text-center">
              <p className="text-sm text-primary-600 dark:text-primary-400 mb-1">
                Montant à payer
              </p>
              <p className="text-3xl font-bold text-primary-700 dark:text-primary-300">
                {formatCurrency(amount)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {description}
              </p>
            </div>

            {/* Opérateurs */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Choisissez un mode de paiement
              </p>
              <div className="space-y-2">
                {Object.values(MOBILE_MONEY_PROVIDERS)
                  .filter(p => p.isActive)
                  .map((prov) => {
                    const provFees = calculateFees(amount, prov.id);
                    return (
                      <button
                        key={prov.id}
                        onClick={() => handleSelectProvider(prov.id)}
                        className="w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                          style={{ backgroundColor: prov.color + '20' }}
                        >
                          {prov.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {prov.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {provFees === 0
                              ? 'Sans frais'
                              : `Frais: ${formatCurrency(provFees)}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {formatCurrency(amount + provFees)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        );

      case 'phone':
        return (
          <div className="space-y-4">
            {/* Provider selected */}
            {provider && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: provider.color + '20' }}
                >
                  {provider.icon}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {provider.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Total: {formatCurrency(totalAmount)}
                  </p>
                </div>
              </div>
            )}

            {/* Phone Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Numéro de téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setError('');
                  }}
                  placeholder="+225 07 07 12 34 56"
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-lg"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Un code de confirmation sera envoyé à ce numéro
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('provider')}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
              >
                Retour
              </button>
              <button
                onClick={handlePhoneSubmit}
                disabled={!phoneNumber}
                className="flex-1 py-3 btn-gradient text-white font-medium rounded-xl disabled:opacity-50"
              >
                Continuer
              </button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-4">
            {/* Récapitulatif */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Montant</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatCurrency(amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Frais</span>
                <span className={fees === 0 ? 'text-green-500' : 'text-gray-900 dark:text-white'}>
                  {fees === 0 ? 'Gratuit' : formatCurrency(fees)}
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3 flex justify-between">
                <span className="text-gray-700 dark:text-gray-300 font-semibold">Total</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {/* Détails paiement */}
            {provider && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: provider.color + '20' }}
                  >
                    {provider.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {provider.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {phoneNumber}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info USSD */}
            {provider && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-400">
                  <p>Après validation, composez <strong>{provider.ussdCode}</strong> pour confirmer le paiement</p>
                </div>
              </div>
            )}

            {/* Sécurité */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Shield className="w-4 h-4" />
              <span>Paiement sécurisé et crypté</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(recipientPhone ? 'provider' : 'phone')}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
              >
                Retour
              </button>
              <button
                onClick={handleInitiatePayment}
                className="flex-1 py-3 btn-gradient text-white font-semibold rounded-xl"
              >
                Payer {formatCurrency(totalAmount)}
              </button>
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Traitement en cours...
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Veuillez confirmer le paiement sur votre téléphone
            </p>
            {provider && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Phone className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-700 dark:text-orange-400">
                  Composez {provider.ussdCode}
                </span>
              </div>
            )}
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Paiement réussi !
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {formatCurrency(totalAmount)} payé avec succès
            </p>
            {result?.transaction && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-left mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Référence</span>
                  <span className="font-mono text-gray-900 dark:text-white">
                    {result.transaction.reference}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date().toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full py-3 btn-gradient text-white font-semibold rounded-xl"
            >
              Terminé
            </button>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Paiement échoué
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {error || 'Une erreur est survenue'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setStep('provider');
                  setError('');
                }}
                className="flex-1 py-3 btn-gradient text-white font-medium rounded-xl"
              >
                Réessayer
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        {step !== 'processing' && step !== 'success' && step !== 'failed' && (
          <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Paiement Mobile Money
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}

        <div className="p-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// Bouton de paiement compact
export function PayWithMobileMoneyButton({
  amount,
  description,
  deliveryId,
  recipientPhone,
  onSuccess,
  className = '',
}: {
  amount: number;
  description: string;
  deliveryId?: string;
  recipientPhone?: string;
  onSuccess?: (result: PaymentResult) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center justify-center gap-2 px-4 py-3 btn-gradient text-white font-medium rounded-xl ${className}`}
      >
        <CreditCard className="w-5 h-5" />
        Payer {formatCurrency(amount)}
      </button>

      {isOpen && (
        <MobileMoneyPayment
          amount={amount}
          description={description}
          deliveryId={deliveryId}
          recipientPhone={recipientPhone}
          onClose={() => setIsOpen(false)}
          onSuccess={(result) => {
            onSuccess?.(result);
            setIsOpen(false);
          }}
        />
      )}
    </>
  );
}

export default MobileMoneyPayment;
