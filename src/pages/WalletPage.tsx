import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  History,
  Bell,
  TrendingUp,
  Calendar,
  Download,
  CreditCard,
  Loader2,
  X,
  Search,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { MobileMoneyDashboard } from '../components/MobileMoneyWallet';
import { MobileMoneyWithdraw } from '../components/MobileMoneyWithdraw';
import {
  getTransactions,
  getEarningsHistory,
  formatCurrency,
} from '../services/mobileMoneyService';
import { MobileMoneyTransaction } from '../types/mobileMoney';
import jsPDF from 'jspdf';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../components/PullToRefreshIndicator';

type TabType = 'overview' | 'history' | 'analytics';

export default function WalletPage() {
  const navigate = useNavigate();
  const { driver } = useAuth();
  const { showError } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<MobileMoneyTransaction[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load recent transactions for notifications
  const loadNotifs = useCallback(async () => {
    const txs = await getTransactions(undefined, 5);
    setNotifications(txs);
  }, []);

  useEffect(() => {
    loadNotifs();
  }, [loadNotifs]);

  // Pull-to-refresh
  const handlePullRefresh = useCallback(async () => {
    await loadNotifs();
    setRefreshKey(k => k + 1);
  }, [loadNotifs]);

  const { pullDistance, pullState, pullToRefreshProps } = usePullToRefresh({
    onRefresh: handlePullRefresh,
  });

  // Close notifications on outside click
  useEffect(() => {
    if (!showNotifications) return;
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifications]);

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
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center relative"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</p>
                    <button onClick={() => setShowNotifications(false)}>
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500">Aucune notification</div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((tx) => (
                        <div key={tx.id} className="px-3 py-2.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.type === 'earnings' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{tx.description}</p>
                          </div>
                          <div className="flex items-center justify-between mt-0.5 ml-4">
                            <p className="text-[10px] text-gray-500">
                              {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className={`text-xs font-bold ${tx.type === 'earnings' ? 'text-green-600' : 'text-red-600'}`}>
                              {tx.type === 'earnings' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
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
      <div className="flex-1 overflow-y-auto" {...pullToRefreshProps}>
        <PullToRefreshIndicator pullDistance={pullDistance} pullState={pullState} />

        {activeTab === 'overview' && (
          <div className="p-4" key={`overview-${refreshKey}`}>
            <MobileMoneyDashboard onWithdraw={() => setShowWithdraw(true)} />
          </div>
        )}

        {activeTab === 'history' && <TransactionHistory key={`history-${refreshKey}`} />}

        {activeTab === 'analytics' && <EarningsAnalytics key={`analytics-${refreshKey}`} />}
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

// Date range quick filter type
type DateRangePreset = 'today' | 'week' | 'month' | 'all';

// Debounce hook
function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Get date range from preset
function getDateRangeFromPreset(preset: DateRangePreset): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);

  switch (preset) {
    case 'today': {
      const start = now.toISOString().slice(0, 10);
      return { start, end };
    }
    case 'week': {
      const weekStart = new Date(now);
      const day = weekStart.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday = start of week
      weekStart.setDate(weekStart.getDate() - diff);
      return { start: weekStart.toISOString().slice(0, 10), end };
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart.toISOString().slice(0, 10), end };
    }
    case 'all':
    default:
      return { start: '', end: '' };
  }
}

// Transaction History Component
function TransactionHistory() {
  const { showError } = useToast();
  const [transactions, setTransactions] = useState<MobileMoneyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'earnings' | 'withdrawal'>('all');

  // Search and date filter state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const data = await getTransactions(undefined, 50);
    setTransactions(data);
    setLoading(false);
  };

  // Handle date preset change
  const handleDatePreset = useCallback((preset: DateRangePreset) => {
    setDatePreset(preset);
    const range = getDateRangeFromPreset(preset);
    setDateStart(range.start);
    setDateEnd(range.end);
  }, []);

  // Handle manual date change (clears the preset)
  const handleDateStartChange = useCallback((value: string) => {
    setDateStart(value);
    setDatePreset('all');
  }, []);

  const handleDateEndChange = useCallback((value: string) => {
    setDateEnd(value);
    setDatePreset('all');
  }, []);

  // Check if any filter is active
  const hasActiveFilters = debouncedSearch !== '' || dateStart !== '' || dateEnd !== '' || filter !== 'all';

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilter('all');
    setDatePreset('all');
    setDateStart('');
    setDateEnd('');
  }, []);

  const handleExportPDF = async () => {
    if (transactions.length === 0) return;
    setExporting(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let y = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('LogiTrack Africa', margin, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Releve de transactions — ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, y);
      y += 12;

      // Table header
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60);
      doc.text('Date', margin + 2, y);
      doc.text('Description', margin + 35, y);
      doc.text('Montant', margin + 110, y);
      doc.text('Statut', margin + 145, y);
      y += 8;

      // Table rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      for (const tx of transactions) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }

        doc.setTextColor(40);
        const date = new Date(tx.createdAt).toLocaleDateString('fr-FR', {
          day: '2-digit', month: '2-digit', year: '2-digit',
        });
        doc.text(date, margin + 2, y);
        doc.text(tx.description.substring(0, 40), margin + 35, y);

        const prefix = tx.type === 'earnings' ? '+' : '-';
        doc.setTextColor(tx.type === 'earnings' ? 34 : 220, tx.type === 'earnings' ? 139 : 38, tx.type === 'earnings' ? 34 : 38);
        doc.text(`${prefix}${formatCurrency(tx.amount)} FCFA`, margin + 110, y);

        const statusLabels: Record<string, string> = { completed: 'Complete', pending: 'En attente', failed: 'Echoue' };
        doc.setTextColor(100);
        doc.text(statusLabels[tx.status] || tx.status, margin + 145, y);
        y += 6;
      }

      // Footer
      y += 8;
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('Document genere automatiquement par LogiTrack Africa', margin, y);

      doc.save(`logitrack-releve-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      showError('Erreur lors de l\'export PDF');
    } finally {
      setExporting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (filter === 'earnings' && tx.type !== 'earnings') return false;
      if (filter === 'withdrawal' && tx.type !== 'withdrawal') return false;

      // Search filter (reference or description)
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        const matchesRef = tx.reference.toLowerCase().includes(query);
        const matchesDesc = tx.description.toLowerCase().includes(query);
        if (!matchesRef && !matchesDesc) return false;
      }

      // Date range filter
      if (dateStart) {
        const txDate = tx.createdAt.slice(0, 10);
        if (txDate < dateStart) return false;
      }
      if (dateEnd) {
        const txDate = tx.createdAt.slice(0, 10);
        if (txDate > dateEnd) return false;
      }

      return true;
    });
  }, [transactions, filter, debouncedSearch, dateStart, dateEnd]);

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
    <div className="p-3 space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par reference ou description..."
          className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Date Range Filter */}
      <div className="space-y-2">
        {/* Quick date buttons */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {([
            { key: 'today', label: "Aujourd'hui" },
            { key: 'week', label: 'Cette semaine' },
            { key: 'month', label: 'Ce mois' },
            { key: 'all', label: 'Tout' },
          ] as { key: DateRangePreset; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleDatePreset(key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                datePreset === key
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom date range inputs */}
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={dateStart}
              onChange={(e) => handleDateStartChange(e.target.value)}
              className="w-full pl-8 pr-2 py-2.5 rounded-lg text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">a</span>
          <div className="flex-1 relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => handleDateEndChange(e.target.value)}
              className="w-full pl-8 pr-2 py-2.5 rounded-lg text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
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

      {/* Result count and reset */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
        </p>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reinitialiser
          </button>
        )}
      </div>

      {/* Export Button */}
      <button
        onClick={handleExportPDF}
        disabled={exporting || transactions.length === 0}
        className="w-full py-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300 font-medium disabled:opacity-50"
      >
        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {exporting ? 'Generation...' : 'Exporter en PDF'}
      </button>

      {/* Transactions List */}
      {Object.keys(groupedTransactions).length === 0 ? (
        <div className="text-center py-10">
          <History className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {hasActiveFilters ? 'Aucune transaction correspondante' : 'Aucune transaction'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-2 text-xs text-primary-600 dark:text-primary-400 underline"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTransactions).map(([date, txs]) => (
            <div key={date}>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 capitalize">
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
