import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  History,
  Settings,
  Bell,
  ChevronRight,
  TrendingUp,
  Calendar,
  Download,
  Filter,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MobileMoneyDashboard } from '../components/MobileMoneyWallet';
import { MobileMoneyWithdraw } from '../components/MobileMoneyWithdraw';
import {
  getTransactions,
  getEarningsHistory,
  formatCurrency,
} from '../services/mobileMoneyService';
import { MobileMoneyTransaction } from '../types/mobileMoney';

type TabType = 'overview' | 'history' | 'analytics';

export default function WalletPage() {
  const navigate = useNavigate();
  const { driver } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showWithdraw, setShowWithdraw] = useState(false);

  if (!driver) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 safe-top">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Mon Portefeuille
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Gérez vos gains et retraits
                </p>
              </div>
            </div>
            <button className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center relative">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon={<Wallet className="w-4 h-4" />}
            label="Aperçu"
          />
          <TabButton
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            icon={<History className="w-4 h-4" />}
            label="Historique"
          />
          <TabButton
            active={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
            icon={<TrendingUp className="w-4 h-4" />}
            label="Statistiques"
          />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="p-4">
            <MobileMoneyDashboard onWithdraw={() => setShowWithdraw(true)} />
          </div>
        )}

        {activeTab === 'history' && <TransactionHistory />}

        {activeTab === 'analytics' && <EarningsAnalytics />}
      </div>

      {/* Withdraw Modal */}
      {showWithdraw && (
        <MobileMoneyWithdraw
          onClose={() => setShowWithdraw(false)}
          onSuccess={() => setShowWithdraw(false)}
        />
      )}
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'text-primary-600 border-primary-500'
          : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Transaction History Component
function TransactionHistory() {
  const [transactions, setTransactions] = useState<MobileMoneyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'earnings' | 'withdrawal'>('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const data = await getTransactions(undefined, 50);
    setTransactions(data);
    setLoading(false);
  };

  const filteredTransactions = useMemo(() => transactions.filter((tx) => {
    if (filter === 'all') return true;
    if (filter === 'earnings') return tx.type === 'earnings';
    if (filter === 'withdrawal') return tx.type === 'withdrawal';
    return true;
  }), [transactions, filter]);

  // Group by date
  const groupedTransactions = useMemo(() => filteredTransactions.reduce((groups, tx) => {
    const date = new Date(tx.createdAt).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(tx);
    return groups;
  }, {} as Record<string, MobileMoneyTransaction[]>), [filteredTransactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <FilterChip
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label="Tout"
        />
        <FilterChip
          active={filter === 'earnings'}
          onClick={() => setFilter('earnings')}
          label="Gains"
          color="green"
        />
        <FilterChip
          active={filter === 'withdrawal'}
          onClick={() => setFilter('withdrawal')}
          label="Retraits"
          color="red"
        />
      </div>

      {/* Export Button */}
      <button className="w-full mb-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
        <Download className="w-5 h-5" />
        Exporter en PDF
      </button>

      {/* Transactions List */}
      {Object.keys(groupedTransactions).length === 0 ? (
        <div className="text-center py-12">
          <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Aucune transaction</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTransactions).map(([date, txs]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 capitalize">
                {date}
              </h3>
              <div className="space-y-2">
                {txs.map((tx) => (
                  <TransactionCard key={tx.id} transaction={tx} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color = 'primary',
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: 'primary' | 'green' | 'red';
}) {
  const colors = {
    primary: active
      ? 'bg-primary-500 text-white'
      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    green: active
      ? 'bg-green-500 text-white'
      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    red: active
      ? 'bg-red-500 text-white'
      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${colors[color]}`}
    >
      {label}
    </button>
  );
}

function TransactionCard({ transaction }: { transaction: MobileMoneyTransaction }) {
  const isEarning = transaction.type === 'earnings';
  const time = new Date(transaction.createdAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isEarning
            ? 'bg-green-100 dark:bg-green-900/30'
            : 'bg-red-100 dark:bg-red-900/30'
        }`}
      >
        {isEarning ? (
          <TrendingUp className="w-5 h-5 text-green-600" />
        ) : (
          <CreditCard className="w-5 h-5 text-red-600" />
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900 dark:text-white">
          {transaction.description}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {time} • {transaction.reference}
        </p>
      </div>
      <div className="text-right">
        <p
          className={`font-bold ${
            isEarning ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {isEarning ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </p>
        <p
          className={`text-xs ${
            transaction.status === 'completed'
              ? 'text-green-500'
              : transaction.status === 'pending'
                ? 'text-yellow-500'
                : 'text-red-500'
          }`}
        >
          {transaction.status === 'completed' && 'Complété'}
          {transaction.status === 'pending' && 'En attente'}
          {transaction.status === 'failed' && 'Échoué'}
        </p>
      </div>
    </div>
  );
}

// Earnings Analytics Component
function EarningsAnalytics() {
  const [history, setHistory] = useState<{ date: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 14 | 30>(7);

  useEffect(() => {
    loadHistory();
  }, [period]);

  const loadHistory = async () => {
    setLoading(true);
    const data = await getEarningsHistory(period);
    setHistory(data);
    setLoading(false);
  };

  const totalEarnings = useMemo(() => history.reduce((sum, d) => sum + d.amount, 0), [history]);
  const avgDaily = useMemo(() => history.length > 0 ? totalEarnings / history.length : 0, [history, totalEarnings]);
  const maxEarning = useMemo(() => Math.max(...history.map((d) => d.amount), 1), [history]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {[7, 14, 30].map((days) => (
          <button
            key={days}
            onClick={() => setPeriod(days as 7 | 14 | 30)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === days
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {days} jours
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Total période
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalEarnings)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Moyenne/jour
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(Math.round(avgDaily))}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Évolution des gains
        </h3>
        <div className="h-48 flex items-end justify-between gap-1">
          {history.map((day, index) => {
            const height = (day.amount / maxEarning) * 100;
            const date = new Date(day.date);
            const dayLabel = date.toLocaleDateString('fr-FR', { weekday: 'short' });

            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-primary-500 rounded-t-sm transition-all duration-300 hover:bg-primary-600"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${formatCurrency(day.amount)}`}
                />
                <p className="text-[10px] text-gray-500 mt-2 truncate w-full text-center">
                  {dayLabel}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Détail par jour
        </h3>
        <div className="space-y-3">
          {history.slice().reverse().map((day, index) => {
            const date = new Date(day.date);
            const dayLabel = date.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            });

            return (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {dayLabel}
                  </span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(day.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
