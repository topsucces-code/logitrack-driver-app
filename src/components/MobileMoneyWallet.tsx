import { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  RefreshCcw,
  CheckCircle2,
  Clock,
  XCircle,
  MoreVertical,
  Trash2,
  Star,
  Loader2,
  Phone,
  User,
  AlertCircle,
} from 'lucide-react';
import {
  MobileMoneyWallet as WalletType,
  MobileMoneyProvider,
  MobileMoneyTransaction,
  TransactionStatus,
  TransactionType,
  EarningsSummary,
} from '../types/mobileMoney';
import {
  MOBILE_MONEY_PROVIDERS,
  getWallets,
  getTransactions,
  getEarningsSummary,
  addWallet,
  setDefaultWallet,
  removeWallet,
  formatCurrency,
  validatePhoneNumber,
} from '../services/mobileMoneyService';
import { paymentLogger } from '../utils/logger';

interface MobileMoneyDashboardProps {
  onWithdraw?: () => void;
}

export function MobileMoneyDashboard({ onWithdraw }: MobileMoneyDashboardProps) {
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [transactions, setTransactions] = useState<MobileMoneyTransaction[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);

  const loadData = async () => {
    try {
      const [walletsData, transactionsData, earningsData] = await Promise.all([
        getWallets(),
        getTransactions(undefined, 10),
        getEarningsSummary(),
      ]);
      setWallets(walletsData);
      setTransactions(transactionsData);
      setEarnings(earningsData);
    } catch (error) {
      paymentLogger.error('Erreur chargement données', { error });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const defaultWallet = wallets.find(w => w.isDefault);

  return (
    <div className="space-y-6">
      {/* Solde Total */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              <span className="text-sm font-medium text-white/80">Solde disponible</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <RefreshCcw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-4xl font-bold mb-2">{formatCurrency(totalBalance)}</p>

          {earnings && earnings.pending > 0 && (
            <p className="text-sm text-white/70 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              +{formatCurrency(earnings.pending)} en attente
            </p>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/20">
            <div>
              <p className="text-xs text-white/60">Aujourd'hui</p>
              <p className="text-lg font-semibold">
                {earnings ? formatCurrency(earnings.today).replace(' FCFA', '') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60">Cette semaine</p>
              <p className="text-lg font-semibold">
                {earnings ? formatCurrency(earnings.thisWeek).replace(' FCFA', '') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60">Ce mois</p>
              <p className="text-lg font-semibold">
                {earnings ? formatCurrency(earnings.thisMonth).replace(' FCFA', '') : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onWithdraw}
          className="flex items-center justify-center gap-2 py-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium rounded-xl"
        >
          <ArrowUpRight className="w-5 h-5" />
          Retirer
        </button>
        <button
          onClick={() => setShowAddWallet(true)}
          className="flex items-center justify-center gap-2 py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
        >
          <Plus className="w-5 h-5" />
          Ajouter compte
        </button>
      </div>

      {/* Comptes Mobile Money */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Mes comptes
        </h3>
        <div className="space-y-2">
          {wallets.map(wallet => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              onSetDefault={() => setDefaultWallet(wallet.id).then(loadData)}
              onRemove={() => removeWallet(wallet.id).then(loadData)}
            />
          ))}
          {wallets.length === 0 && (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Aucun compte Mobile Money</p>
              <button
                onClick={() => setShowAddWallet(true)}
                className="mt-3 text-primary-600 font-medium"
              >
                Ajouter un compte
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transactions récentes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Transactions récentes
          </h3>
          <button className="text-sm text-primary-600 font-medium">
            Voir tout
          </button>
        </div>
        <div className="space-y-2">
          {transactions.slice(0, 5).map(transaction => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
          {transactions.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              Aucune transaction
            </p>
          )}
        </div>
      </div>

      {/* Modal Ajouter Wallet */}
      {showAddWallet && (
        <AddWalletModal
          onClose={() => setShowAddWallet(false)}
          onSuccess={() => {
            setShowAddWallet(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Carte Wallet
function WalletCard({
  wallet,
  onSetDefault,
  onRemove,
}: {
  wallet: WalletType;
  onSetDefault: () => void;
  onRemove: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const provider = MOBILE_MONEY_PROVIDERS[wallet.provider];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 relative">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: provider.color + '20' }}
        >
          {provider.icon}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 dark:text-white">
              {provider.name}
            </p>
            {wallet.isDefault && (
              <span className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-[10px] font-medium rounded">
                Principal
              </span>
            )}
            {wallet.isVerified && (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {wallet.phoneNumber}
          </p>
        </div>

        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(wallet.balance)}
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-20 min-w-[150px]">
                {!wallet.isDefault && (
                  <button
                    onClick={() => {
                      onSetDefault();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Star className="w-4 h-4" />
                    Définir principal
                  </button>
                )}
                <button
                  onClick={() => {
                    onRemove();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Item Transaction
function TransactionItem({ transaction }: { transaction: MobileMoneyTransaction }) {
  const provider = MOBILE_MONEY_PROVIDERS[transaction.provider];

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getTypeInfo = (type: TransactionType) => {
    switch (type) {
      case 'earnings':
        return { icon: <ArrowDownLeft className="w-4 h-4" />, color: 'text-green-500', prefix: '+' };
      case 'withdrawal':
        return { icon: <ArrowUpRight className="w-4 h-4" />, color: 'text-red-500', prefix: '-' };
      case 'payment':
        return { icon: <CreditCard className="w-4 h-4" />, color: 'text-blue-500', prefix: '-' };
      case 'refund':
        return { icon: <RefreshCcw className="w-4 h-4" />, color: 'text-purple-500', prefix: '+' };
      default:
        return { icon: <Wallet className="w-4 h-4" />, color: 'text-gray-500', prefix: '' };
    }
  };

  const typeInfo = getTypeInfo(transaction.type);
  const date = new Date(transaction.createdAt);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center ${typeInfo.color}`}>
          {typeInfo.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
              {transaction.description}
            </p>
            {getStatusIcon(transaction.status)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {date.toLocaleDateString('fr-FR')} à {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="text-right">
          <p className={`font-semibold ${typeInfo.color}`}>
            {typeInfo.prefix}{formatCurrency(transaction.amount)}
          </p>
          {transaction.fees > 0 && (
            <p className="text-xs text-gray-400">
              Frais: {formatCurrency(transaction.fees)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal Ajouter Wallet
function AddWalletModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'provider' | 'details'>('provider');
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProvider | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectProvider = (provider: MobileMoneyProvider) => {
    setSelectedProvider(provider);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!selectedProvider || !phoneNumber || !accountName) return;

    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      setError('Numéro de téléphone invalide');
      return;
    }

    setLoading(true);
    setError('');

    const result = await addWallet(selectedProvider, phoneNumber, accountName);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Erreur lors de l\'ajout');
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {step === 'provider' ? 'Choisir un opérateur' : 'Détails du compte'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          {step === 'provider' ? (
            <div className="space-y-3">
              {Object.values(MOBILE_MONEY_PROVIDERS)
                .filter(p => p.isActive)
                .map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => handleSelectProvider(provider.id)}
                    className="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                      style={{ backgroundColor: provider.color + '20' }}
                    >
                      {provider.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {provider.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {provider.fees.percentage === 0
                          ? 'Sans frais'
                          : `Frais: ${provider.fees.percentage}%`}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
            </div>
          ) : (
            <div className="space-y-4">
              {selectedProvider && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: MOBILE_MONEY_PROVIDERS[selectedProvider].color + '20' }}
                  >
                    {MOBILE_MONEY_PROVIDERS[selectedProvider].icon}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {MOBILE_MONEY_PROVIDERS[selectedProvider].name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Code USSD: {MOBILE_MONEY_PROVIDERS[selectedProvider].ussdCode}
                    </p>
                  </div>
                </div>
              )}

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Numéro de téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+225 07 07 12 34 56"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nom du compte
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Konan Yao"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep('provider')}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
                >
                  Retour
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !phoneNumber || !accountName}
                  className="flex-1 py-3 btn-gradient text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Ajouter'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MobileMoneyDashboard;
