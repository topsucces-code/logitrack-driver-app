import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { paymentLogger } from "../utils/logger";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  Download,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase, WalletTransaction } from "../lib/supabase";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { PAYMENT_CONFIG } from "../config/app.config";
import { useToast } from "../contexts/ToastContext";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";

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
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("momo");
  const [withdrawAccount, setWithdrawAccount] = useState(
    driver?.momo_number || "",
  );
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
        .from("logitrack_driver_transactions")
        .select("*")
        .eq("driver_id", driver.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setTransactions((txData as WalletTransaction[]) || []);

      // Calculate stats
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);

      // Get earnings from logitrack_deliveries
      const { data: deliveries } = await supabase
        .from("logitrack_deliveries")
        .select("driver_earnings, delivered_at")
        .eq("driver_id", driver.id)
        .in("status", ["delivered", "completed"])
        .gte("delivered_at", monthStart.toISOString());

      let todayEarnings = 0;
      let weekEarnings = 0;
      let monthEarnings = 0;

      (deliveries || []).forEach(
        (d: { driver_earnings: number | null; delivered_at: string }) => {
          const deliveredAt = new Date(d.delivered_at);
          const earning = d.driver_earnings || 0;

          if (deliveredAt >= todayStart) todayEarnings += earning;
          if (deliveredAt >= weekStart) weekEarnings += earning;
          monthEarnings += earning;
        },
      );

      // Get pending withdrawals
      const { data: pendingTx } = await supabase
        .from("logitrack_driver_transactions")
        .select("amount")
        .eq("driver_id", driver.id)
        .eq("type", "withdrawal")
        .eq("payout_status", "pending");

      const pendingAmount = (pendingTx || []).reduce(
        (sum: number, tx: { amount: number }) => sum + Math.abs(tx.amount),
        0,
      );

      setStats({
        today: todayEarnings,
        week: weekEarnings,
        month: monthEarnings,
        pending: pendingAmount,
      });
    } catch (err) {
      paymentLogger.error("Error fetching earnings", { error: err });
    } finally {
      setLoading(false);
    }
  }

  async function requestWithdrawal() {
    const amount = parseInt(withdrawAmount);

    if (!amount || amount < PAYMENT_CONFIG.minWithdrawalAmount) {
      showError(
        `Montant minimum: ${PAYMENT_CONFIG.minWithdrawalAmount} ${PAYMENT_CONFIG.currency}`,
      );
      return;
    }

    if (amount > (driver?.wallet_balance || 0)) {
      showError("Solde insuffisant");
      return;
    }

    if (!withdrawAccount.trim()) {
      showError("Veuillez entrer votre numéro");
      return;
    }

    setWithdrawing(true);

    const { data, error } = await supabase.rpc("request_withdrawal", {
      p_amount: amount,
      p_method: withdrawMethod,
      p_account: withdrawAccount,
    });

    if (error || data?.error) {
      showError(data?.error || "Erreur lors de la demande");
    } else {
      showSuccess("Demande de retrait envoyée !");
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setWithdrawAccount("");
      refreshDriver();
      fetchData();
    }

    setWithdrawing(false);
  }

  function exportCSV() {
    if (transactions.length === 0) {
      showError("Aucune transaction à exporter");
      return;
    }

    const typeLabels: Record<string, string> = {
      earning: "Gain livraison",
      withdrawal: "Retrait",
      bonus: "Bonus",
      penalty: "Pénalité",
      adjustment: "Ajustement",
    };

    const statusLabels: Record<string, string> = {
      pending: "En attente",
      processing: "En cours",
      completed: "Terminé",
      failed: "Échoué",
    };

    const headers = ["Date", "Type", "Description", "Montant", "Statut"];
    const rows = transactions.map((tx) => [
      format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", { locale: fr }),
      typeLabels[tx.type] || tx.type,
      tx.description || "-",
      tx.amount.toString(),
      tx.payout_status
        ? statusLabels[tx.payout_status] || tx.payout_status
        : "-",
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `revenus_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!driver) return null;

  return (
    <div className="h-mobile-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-primary-500 text-white safe-top px-3 pt-3 pb-6">
        <div className="flex items-center gap-2.5 mb-4">
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold flex-1">Mes gains</h1>
          <button
            onClick={exportCSV}
            disabled={loading || transactions.length === 0}
            className="px-3 py-2 text-xs rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-50 flex items-center gap-1.5 font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        </div>

        {/* Balance */}
        <div className="text-center">
          <p className="text-white/80 text-xs mb-0.5">Solde disponible</p>
          <p className="text-3xl font-bold">
            {driver.wallet_balance.toLocaleString()} F
          </p>
          {stats.pending > 0 && (
            <p className="text-white/70 text-xs mt-1">
              {stats.pending.toLocaleString()} F en attente de retrait
            </p>
          )}
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-3 -mt-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {stats.today.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Aujourd'hui
            </p>
          </div>
          <div className="text-center border-x border-gray-100 dark:border-gray-700">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {stats.week.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Cette semaine
            </p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {stats.month.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Ce mois
            </p>
          </div>
        </div>
      </div>

      {/* Withdraw Button */}
      <div className="px-3 py-3">
        <Button
          onClick={() => setShowWithdrawModal(true)}
          disabled={driver.wallet_balance < PAYMENT_CONFIG.minWithdrawalAmount}
          fullWidth
          icon={<Wallet className="w-4 h-4" />}
        >
          Retirer mes gains
        </Button>
        {driver.wallet_balance < PAYMENT_CONFIG.minWithdrawalAmount && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Minimum de retrait: {PAYMENT_CONFIG.minWithdrawalAmount}{" "}
            {PAYMENT_CONFIG.currency}
          </p>
        )}
      </div>

      {/* Transactions */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Historique
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg p-4 flex items-center gap-3"
              >
                <Skeleton variant="circular" width={40} height={40} />
                <div className="flex-1">
                  <Skeleton width={120} height={16} className="mb-2" />
                  <Skeleton width={80} height={12} />
                </div>
                <Skeleton width={60} height={20} />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
            <TrendingUp className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Aucune transaction
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center gap-2.5"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.amount > 0 ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {tx.amount > 0 ? (
                    <ArrowDownCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowUpCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {tx.type === "earning" && "Gain livraison"}
                    {tx.type === "withdrawal" && "Retrait"}
                    {tx.type === "bonus" && "Bonus"}
                    {tx.type === "penalty" && "Pénalité"}
                    {tx.type === "adjustment" && "Ajustement"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {format(new Date(tx.created_at), "dd MMM à HH:mm", {
                      locale: fr,
                    })}
                  </p>
                  {tx.payout_status === "pending" && (
                    <span className="inline-flex items-center gap-1 text-xs text-yellow-600 mt-1">
                      <Clock className="w-3 h-3" />
                      En attente
                    </span>
                  )}
                </div>
                <p
                  className={`font-bold ${
                    tx.amount > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {tx.amount > 0 ? "+" : ""}
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
          <div className="bg-white dark:bg-gray-800 w-full rounded-t-2xl p-4 safe-bottom">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">
              Retirer mes gains
            </h2>

            {/* Amount */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Montant (FCFA)
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={`Min. ${PAYMENT_CONFIG.minWithdrawalAmount}`}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Disponible: {driver.wallet_balance.toLocaleString()}{" "}
                {PAYMENT_CONFIG.currency}
              </p>
            </div>

            {/* Method */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Méthode de retrait
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setWithdrawMethod("momo")}
                  className={`p-2.5 rounded-lg border-2 text-sm font-medium ${
                    withdrawMethod === "momo"
                      ? "border-primary-500 bg-primary-50 text-primary-600"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  Mobile Money
                </button>
                <button
                  onClick={() => setWithdrawMethod("cash")}
                  className={`p-2.5 rounded-lg border-2 text-sm font-medium ${
                    withdrawMethod === "cash"
                      ? "border-primary-500 bg-primary-50 text-primary-600"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  Espèces
                </button>
              </div>
            </div>

            {/* Account */}
            {withdrawMethod === "momo" && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Numéro Mobile Money
                </label>
                <input
                  type="tel"
                  value={withdrawAccount}
                  onChange={(e) => setWithdrawAccount(e.target.value)}
                  placeholder="07 00 00 00 00"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowWithdrawModal(false)}
                variant="outline"
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={requestWithdrawal}
                loading={withdrawing}
                className="flex-1"
              >
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
