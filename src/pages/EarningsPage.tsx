import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  Calendar,
  ChevronRight,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, WalletTransaction } from '../lib/supabase';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PAYMENT_CONFIG } from '../config/app.config';
import { useToast } from '../contexts/ToastContext';

export default function EarningsPage() {
  const navigate = useNavigate();
  const { driver, refreshDriver } = useAuth();
  const { showError, showSuccess } = useToast();

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('mobile_money');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (driver) {
      fetchData();
    }
  }, [driver]);

  async function fetchData() {
    if (!driver) return;

    try {
      // Get transactions from logitrack_driver_transactions
      const { data: txData } = await supabase
        .from('logitrack_driver_transactions')
        .select('*')
        .eq('driver_id', driver.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions((txData as WalletTransaction[]) || []);

      // Calculate stats
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);

      // Get earnings from logitrack_deliveries
      const { data: deliveries } = await supabase
        .from('logitrack_deliveries')
        .select('driver_earnings, delivered_at')
        .eq('driver_id', driver.id)
        .in('status', ['delivered', 'completed'])
        .gte('delivered_at', monthStart.toISOString());

      let todayEarnings = 0;
      let weekEarnings = 0;
      let monthEarnings = 0;

      (deliveries || []).forEach((d: { driver_earnings: number | null; delivered_at: string }) => {
        const deliveredAt = new Date(d.delivered_at);
        const earning = d.driver_earnings || 0;

        if (deliveredAt >= todayStart) todayEarnings += earning;
        if (deliveredAt >= weekStart) weekEarnings += earning;
        monthEarnings += earning;
      });

      // Get pending withdrawals
      const { data: pendingTx } = await supabase
        .from('logitrack_driver_transactions')
        .select('amount')
        .eq('driver_id', driver.id)
        .eq('type', 'withdrawal')
        .eq('payout_status', 'pending');

      const pendingAmount = (pendingTx || []).reduce(
        (sum: number, tx: { amount: number }) => sum + Math.abs(tx.amount),
        0
      );

      setStats({
        today: todayEarnings,
        week: weekEarnings,
        month: monthEarnings,
        pending: pendingAmount,
      });
    } catch (err) {
      console.error('Error fetching earnings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function requestWithdrawal() {
    const amount = parseInt(withdrawAmount);

    if (!amount || amount < PAYMENT_CONFIG.minWithdrawalAmount) {
      showError(`Montant minimum: ${PAYMENT_CONFIG.minWithdrawalAmount} ${PAYMENT_CONFIG.currency}`);
      return;
    }

    if (amount > (driver?.wallet_balance || 0)) {
      showError('Solde insuffisant');
      return;
    }

    if (!withdrawAccount.trim()) {
      showError('Veuillez entrer votre numéro');
      return;
    }

    setWithdrawing(true);

    const { data, error } = await supabase.rpc('request_withdrawal', {
      p_amount: amount,
      p_method: withdrawMethod,
      p_account: withdrawAccount,
    });

    if (error || data?.error) {
      showError(data?.error || 'Erreur lors de la demande');
    } else {
      showSuccess('Demande de retrait envoyée !');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawAccount('');
      refreshDriver();
      fetchData();
    }

    setWithdrawing(false);
  }

  if (!driver) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-primary-500 text-white safe-top px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Mes gains</h1>
        </div>

        {/* Balance */}
        <div className="text-center">
          <p className="text-white/80 text-sm mb-1">Solde disponible</p>
          <p className="text-4xl font-bold">{driver.wallet_balance.toLocaleString()} F</p>
          {stats.pending > 0 && (
            <p className="text-white/70 text-sm mt-1">
              {stats.pending.toLocaleString()} F en attente de retrait
            </p>
          )}
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-xl shadow-sm p-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.today.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Aujourd'hui</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{stats.week.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Cette semaine</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.month.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Ce mois</p>
          </div>
        </div>
      </div>

      {/* Withdraw Button */}
      <div className="px-4 py-4">
        <button
          onClick={() => setShowWithdrawModal(true)}
          disabled={driver.wallet_balance < PAYMENT_CONFIG.minWithdrawalAmount}
          className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Wallet className="w-5 h-5" />
          Retirer mes gains
        </button>
        {driver.wallet_balance < PAYMENT_CONFIG.minWithdrawalAmount && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Minimum de retrait: {PAYMENT_CONFIG.minWithdrawalAmount} {PAYMENT_CONFIG.currency}
          </p>
        )}
      </div>

      {/* Transactions */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Historique</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-24" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune transaction</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-white rounded-xl p-4 flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}
                >
                  {tx.amount > 0 ? (
                    <ArrowDownCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <ArrowUpCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {tx.type === 'earning' && 'Gain livraison'}
                    {tx.type === 'withdrawal' && 'Retrait'}
                    {tx.type === 'bonus' && 'Bonus'}
                    {tx.type === 'penalty' && 'Pénalité'}
                    {tx.type === 'adjustment' && 'Ajustement'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(tx.created_at), 'dd MMM à HH:mm', { locale: fr })}
                  </p>
                  {tx.payout_status === 'pending' && (
                    <span className="inline-flex items-center gap-1 text-xs text-yellow-600 mt-1">
                      <Clock className="w-3 h-3" />
                      En attente
                    </span>
                  )}
                </div>
                <p
                  className={`font-bold ${
                    tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {tx.amount > 0 ? '+' : ''}
                  {tx.amount.toLocaleString()} F
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 safe-bottom">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Retirer mes gains</h2>

            {/* Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant (FCFA)
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={`Min. ${PAYMENT_CONFIG.minWithdrawalAmount}`}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Disponible: {driver.wallet_balance.toLocaleString()} {PAYMENT_CONFIG.currency}
              </p>
            </div>

            {/* Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Méthode de retrait
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setWithdrawMethod('mobile_money')}
                  className={`p-3 rounded-xl border-2 text-sm font-medium ${
                    withdrawMethod === 'mobile_money'
                      ? 'border-primary-500 bg-primary-50 text-primary-600'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  Mobile Money
                </button>
                <button
                  onClick={() => setWithdrawMethod('cash')}
                  className={`p-3 rounded-xl border-2 text-sm font-medium ${
                    withdrawMethod === 'cash'
                      ? 'border-primary-500 bg-primary-50 text-primary-600'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  Espèces
                </button>
              </div>
            </div>

            {/* Account */}
            {withdrawMethod === 'mobile_money' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro Mobile Money
                </label>
                <input
                  type="tel"
                  value={withdrawAccount}
                  onChange={(e) => setWithdrawAccount(e.target.value)}
                  placeholder="07 00 00 00 00"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={requestWithdrawal}
                disabled={withdrawing}
                className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl disabled:opacity-50"
              >
                {withdrawing ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
