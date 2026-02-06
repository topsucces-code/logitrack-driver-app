import { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  Wallet,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  ChevronDown,
  Info,
} from 'lucide-react';
import {
  MobileMoneyWallet,
  MobileMoneyProvider,
} from '../types/mobileMoney';
import {
  MOBILE_MONEY_PROVIDERS,
  getWallets,
  initiateWithdrawal,
  calculateFees,
  formatCurrency,
} from '../services/mobileMoneyService';

interface MobileMoneyWithdrawProps {
  onClose: () => void;
  onSuccess?: () => void;
  maxAmount?: number;
}

export function MobileMoneyWithdraw({
  onClose,
  onSuccess,
  maxAmount,
}: MobileMoneyWithdrawProps) {
  const [wallets, setWallets] = useState<MobileMoneyWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<MobileMoneyWallet | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      const data = await getWallets();
      setWallets(data);
      // Sélectionner le wallet par défaut
      const defaultWallet = data.find(w => w.isDefault) || data[0];
      setSelectedWallet(defaultWallet || null);
    } catch (error) {
      console.error('Erreur chargement wallets:', error);
    } finally {
      setLoading(false);
    }
  };

  const amountNum = parseInt(amount) || 0;
  const fees = selectedWallet ? calculateFees(amountNum, selectedWallet.provider) : 0;
  const totalAmount = amountNum + fees;
  const availableBalance = maxAmount ?? (selectedWallet?.balance || 0);
  const provider = selectedWallet ? MOBILE_MONEY_PROVIDERS[selectedWallet.provider] : null;

  const quickAmounts = [5000, 10000, 25000, 50000];

  const handleAmountChange = (value: string) => {
    // Garder uniquement les chiffres
    const cleaned = value.replace(/\D/g, '');
    setAmount(cleaned);
    setError('');
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
    setError('');
  };

  const handleWithdraw = async () => {
    if (!selectedWallet || amountNum <= 0) return;

    // Validations
    if (amountNum > availableBalance) {
      setError('Solde insuffisant');
      return;
    }

    if (provider && amountNum < provider.limits.minAmount) {
      setError(`Montant minimum: ${formatCurrency(provider.limits.minAmount)}`);
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const result = await initiateWithdrawal({
        amount: amountNum,
        provider: selectedWallet.provider,
        phoneNumber: selectedWallet.phoneNumber,
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Erreur lors du retrait');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center max-w-sm w-full animate-scale-up">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Retrait initié !
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {formatCurrency(amountNum)} en cours de transfert vers votre compte {provider?.name}
          </p>
          <p className="text-sm text-gray-400">
            Vous recevrez une confirmation par SMS
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Retirer de l'argent
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Solde disponible */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Solde disponible
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(availableBalance)}
            </p>
          </div>

          {/* Sélection du wallet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Retirer vers
            </label>
            <button
              onClick={() => setShowWalletPicker(true)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600"
            >
              {selectedWallet && provider ? (
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: provider.color + '20' }}
                  >
                    {provider.icon}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {provider.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedWallet.phoneNumber}
                    </p>
                  </div>
                </div>
              ) : (
                <span className="text-gray-500">Sélectionner un compte</span>
              )}
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Montant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Montant
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className="w-full py-4 px-4 text-3xl font-bold text-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                FCFA
              </span>
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 mt-3">
              {quickAmounts.map((qAmount) => (
                <button
                  key={qAmount}
                  onClick={() => handleQuickAmount(qAmount)}
                  disabled={qAmount > availableBalance}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                    amount === qAmount.toString()
                      ? 'bg-primary-500 text-white'
                      : qAmount > availableBalance
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {(qAmount / 1000).toFixed(0)}K
                </button>
              ))}
              <button
                onClick={() => handleQuickAmount(availableBalance)}
                className="flex-1 py-2 text-sm font-medium rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              >
                Max
              </button>
            </div>
          </div>

          {/* Détails */}
          {amountNum > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Montant</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatCurrency(amountNum)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Frais</span>
                <span className={fees === 0 ? 'text-green-500' : 'text-gray-900 dark:text-white'}>
                  {fees === 0 ? 'Gratuit' : formatCurrency(fees)}
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3 flex justify-between">
                <span className="text-gray-700 dark:text-gray-300 font-medium">Total</span>
                <span className="text-gray-900 dark:text-white font-bold">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Info frais Wave */}
          {provider?.id === 'wave' && (
            <div className="flex items-start gap-2 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
              <Info className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-cyan-700 dark:text-cyan-400">
                Les retraits via Wave sont sans frais !
              </p>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Bouton de retrait */}
          <button
            onClick={handleWithdraw}
            disabled={processing || amountNum <= 0 || !selectedWallet}
            className="w-full py-4 btn-gradient text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <ArrowUpRight className="w-5 h-5" />
                Retirer {amountNum > 0 ? formatCurrency(amountNum) : ''}
              </>
            )}
          </button>
        </div>

        {/* Wallet Picker Modal */}
        {showWalletPicker && (
          <WalletPickerModal
            wallets={wallets}
            selected={selectedWallet}
            onSelect={(wallet) => {
              setSelectedWallet(wallet);
              setShowWalletPicker(false);
            }}
            onClose={() => setShowWalletPicker(false)}
          />
        )}
      </div>
    </div>
  );
}

// Modal de sélection du wallet
function WalletPickerModal({
  wallets,
  selected,
  onSelect,
  onClose,
}: {
  wallets: MobileMoneyWallet[];
  selected: MobileMoneyWallet | null;
  onSelect: (wallet: MobileMoneyWallet) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-h-[60vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Choisir un compte
          </h3>
          <button onClick={onClose} className="p-2">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {wallets.map((wallet) => {
            const provider = MOBILE_MONEY_PROVIDERS[wallet.provider];
            const isSelected = selected?.id === wallet.id;

            return (
              <button
                key={wallet.id}
                onClick={() => onSelect(wallet)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: provider.color + '20' }}
                >
                  {provider.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {provider.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {wallet.phoneNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(wallet.balance)}
                  </p>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-primary-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MobileMoneyWithdraw;
