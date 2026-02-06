import { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { InsuranceType, INSURANCE_PLANS } from '../types/trust';
import { calculateInsurancePremium, createPackageInsurance } from '../services/trustService';

interface PackageInsuranceProps {
  deliveryId: string;
  estimatedValue?: number;
  onComplete: (insuranceId: string) => void;
  onSkip: () => void;
}

export function PackageInsurance({
  deliveryId,
  estimatedValue = 50000,
  onComplete,
  onSkip,
}: PackageInsuranceProps) {
  const [step, setStep] = useState<'select' | 'confirm' | 'processing' | 'done'>('select');
  const [selectedPlan, setSelectedPlan] = useState<InsuranceType>('standard');
  const [declaredValue, setDeclaredValue] = useState(estimatedValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [insuranceId, setInsuranceId] = useState('');

  const { premium, coverage } = calculateInsurancePremium(declaredValue, selectedPlan);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CI', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    setStep('processing');

    const result = await createPackageInsurance(deliveryId, declaredValue, selectedPlan);

    if (result.success && result.insurance) {
      setInsuranceId(result.insurance.id);
      setStep('done');
      setTimeout(() => onComplete(result.insurance!.id), 2000);
    } else {
      setError(result.error || 'Erreur lors de la souscription');
      setStep('confirm');
    }

    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 px-4 py-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8" />
          <h1 className="text-xl font-bold">Assurance Colis</h1>
        </div>
        <p className="text-white/80 text-sm">
          Protégez votre livraison contre les dommages et pertes
        </p>
      </div>

      <div className="p-4">
        {/* Sélection du plan */}
        {step === 'select' && (
          <div className="animate-fade-in">
            {/* Valeur déclarée */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Valeur déclarée du colis
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(Math.max(1000, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-lg font-semibold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  FCFA
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Valeur minimale: 1,000 FCFA
              </p>
            </div>

            {/* Plans d'assurance */}
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Choisissez votre niveau de protection
            </h3>

            <div className="space-y-3 mb-6">
              {(Object.entries(INSURANCE_PLANS) as [InsuranceType, typeof INSURANCE_PLANS[InsuranceType]][]).map(
                ([key, plan]) => {
                  const { premium: planPremium, coverage: planCoverage } = calculateInsurancePremium(
                    declaredValue,
                    key
                  );
                  const isSelected = selectedPlan === key;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedPlan(key)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">
                            {key === 'basic' ? '🛡️' : key === 'standard' ? '🛡️✨' : '🛡️⭐'}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {plan.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Couverture {plan.coveragePercent}%
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-blue-500" />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                          <p className="text-[10px] text-gray-500">Prime</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatCurrency(planPremium)}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                          <p className="text-[10px] text-gray-500">Couverture max</p>
                          <p className="text-sm font-bold text-green-600">
                            {formatCurrency(planCoverage)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>

            {/* Info box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6 flex gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Protection incluse:</p>
                <ul className="text-xs space-y-1">
                  <li>✓ Dommages pendant le transport</li>
                  <li>✓ Perte du colis</li>
                  <li>✓ Vol</li>
                  <li>✓ Remboursement sous 48h</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setStep('confirm')}
              className="w-full py-3 btn-gradient text-white font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              Continuer
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={onSkip}
              className="w-full mt-3 py-3 text-gray-500 dark:text-gray-400 text-sm"
            >
              Continuer sans assurance
            </button>
          </div>
        )}

        {/* Confirmation */}
        {step === 'confirm' && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirmation
            </h2>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600 dark:text-gray-400">Plan</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {INSURANCE_PLANS[selectedPlan].name}
                </span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600 dark:text-gray-400">Valeur déclarée</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(declaredValue)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600 dark:text-gray-400">Couverture</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(coverage)}
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">Prime à payer</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(premium)}
                  </span>
                </div>
              </div>
            </div>

            {/* Avertissement */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-6 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                En cas de réclamation, vous devrez fournir des preuves (photos, témoignages).
                La prime sera déduite de vos gains.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 mb-4">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
              >
                Modifier
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    Souscrire
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              Activation de l'assurance...
            </p>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Assurance activée !
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Votre colis est maintenant protégé
            </p>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 inline-block">
              <p className="text-green-700 dark:text-green-400 text-sm">
                Couverture: <strong>{formatCurrency(coverage)}</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Badge compact pour afficher l'état de l'assurance
export function InsuranceBadge({
  isInsured,
  coverage,
  onClick,
}: {
  isInsured: boolean;
  coverage?: number;
  onClick?: () => void;
}) {
  if (!isInsured) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-500"
      >
        <Shield className="w-3.5 h-3.5" />
        Non assuré
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-xs text-blue-600 dark:text-blue-400">
      <ShieldCheck className="w-3.5 h-3.5" />
      {coverage ? `Assuré ${(coverage / 1000).toFixed(0)}K` : 'Assuré'}
    </div>
  );
}
