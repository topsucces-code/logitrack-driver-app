// Service Mobile Money pour Côte d'Ivoire
// Connected to Supabase backend

import { supabase } from '../lib/supabase';
import {
  MobileMoneyProvider,
  MobileMoneyProviderInfo,
  MobileMoneyWallet,
  MobileMoneyTransaction,
  TransactionType,
  PaymentRequest,
  WithdrawalRequest,
  PaymentResult,
  EarningsSummary,
} from '../types/mobileMoney';

// Configuration des opérateurs Mobile Money en Côte d'Ivoire
export const MOBILE_MONEY_PROVIDERS: Record<MobileMoneyProvider, MobileMoneyProviderInfo> = {
  orange: {
    id: 'orange',
    name: 'Orange Money',
    shortName: 'OM',
    color: '#FF6B00',
    bgColor: 'bg-orange-500',
    darkBgColor: 'dark:bg-orange-600',
    icon: '🍊',
    ussdCode: '#144#',
    fees: {
      percentage: 1,
      fixedFee: 0,
      minFee: 25,
      maxFee: 5000,
    },
    limits: {
      minAmount: 100,
      maxPerTransaction: 1000000,
      maxPerDay: 3000000,
      maxPerMonth: 10000000,
    },
    isActive: true,
  },
  mtn: {
    id: 'mtn',
    name: 'MTN Mobile Money',
    shortName: 'MoMo',
    color: '#FFCC00',
    bgColor: 'bg-yellow-400',
    darkBgColor: 'dark:bg-yellow-500',
    icon: '📱',
    ussdCode: '*133#',
    fees: {
      percentage: 1,
      fixedFee: 0,
      minFee: 25,
      maxFee: 5000,
    },
    limits: {
      minAmount: 100,
      maxPerTransaction: 1000000,
      maxPerDay: 3000000,
      maxPerMonth: 10000000,
    },
    isActive: true,
  },
  wave: {
    id: 'wave',
    name: 'Wave',
    shortName: 'Wave',
    color: '#1DC3E3',
    bgColor: 'bg-cyan-500',
    darkBgColor: 'dark:bg-cyan-600',
    icon: '🌊',
    ussdCode: '*860#',
    fees: {
      percentage: 0,
      fixedFee: 0,
      minFee: 0,
      maxFee: 0,
    },
    limits: {
      minAmount: 500,
      maxPerTransaction: 1500000,
      maxPerDay: 5000000,
      maxPerMonth: 15000000,
    },
    isActive: true,
  },
  moov: {
    id: 'moov',
    name: 'Moov Money',
    shortName: 'Moov',
    color: '#00A859',
    bgColor: 'bg-green-500',
    darkBgColor: 'dark:bg-green-600',
    icon: '💚',
    ussdCode: '*155#',
    fees: {
      percentage: 1,
      fixedFee: 0,
      minFee: 25,
      maxFee: 5000,
    },
    limits: {
      minAmount: 100,
      maxPerTransaction: 1000000,
      maxPerDay: 2000000,
      maxPerMonth: 8000000,
    },
    isActive: true,
  },
};

// Calculer les frais
export function calculateFees(amount: number, provider: MobileMoneyProvider): number {
  const providerInfo = MOBILE_MONEY_PROVIDERS[provider];
  if (!providerInfo) return 0;

  const { percentage, fixedFee, minFee, maxFee } = providerInfo.fees;
  let fees = (amount * percentage) / 100 + fixedFee;

  if (fees < minFee) fees = minFee;
  if (maxFee > 0 && fees > maxFee) fees = maxFee;

  return Math.ceil(fees);
}

// Valider un numéro de téléphone ivoirien
export function validatePhoneNumber(phone: string): { valid: boolean; formatted: string; provider?: MobileMoneyProvider } {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = '+225' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+225')) {
    cleaned = '+225' + cleaned;
  }

  const digits = cleaned.replace('+225', '');
  if (digits.length !== 10) {
    return { valid: false, formatted: phone };
  }

  const prefix = digits.substring(0, 2);
  let provider: MobileMoneyProvider | undefined;

  if (['07', '08', '09'].includes(prefix)) {
    provider = 'orange';
  } else if (['05', '06'].includes(prefix)) {
    provider = 'mtn';
  } else if (['01', '02', '03'].includes(prefix)) {
    provider = 'moov';
  }

  const formatted = `+225 ${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;

  return { valid: true, formatted, provider };
}

// Formater un montant en FCFA
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-CI', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}

// Retry wrapper with exponential backoff for network calls
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 2000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt); // exponential backoff: 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// ========== Real Supabase API ==========

// Récupérer les wallets de l'utilisateur (from driver profile)
export async function getWallets(driverId?: string): Promise<MobileMoneyWallet[]> {
  let query = supabase
    .from('logitrack_drivers')
    .select('id, user_id, momo_provider, momo_number, momo_name, wallet_balance');

  if (driverId) {
    query = query.eq('id', driverId);
  } else {
    // Fallback: get current user's driver
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) return [];

  // Build wallet from driver's momo fields
  if (!data.momo_provider || !data.momo_number) {
    // Driver has no mobile money configured, return wallet with balance only
    return [{
      id: data.id,
      userId: data.user_id,
      provider: 'orange' as MobileMoneyProvider,
      phoneNumber: '',
      accountName: data.momo_name || '',
      balance: data.wallet_balance || 0,
      isDefault: true,
      isVerified: false,
      createdAt: '',
      lastUsed: null,
    }];
  }

  return [{
    id: data.id,
    userId: data.user_id,
    provider: data.momo_provider as MobileMoneyProvider,
    phoneNumber: data.momo_number,
    accountName: data.momo_name || '',
    balance: data.wallet_balance || 0,
    isDefault: true,
    isVerified: true,
    createdAt: '',
    lastUsed: null,
  }];
}

// Récupérer un wallet par ID (same as getWallets for single driver)
export async function getWallet(walletId: string): Promise<MobileMoneyWallet | null> {
  const wallets = await getWallets(walletId);
  return wallets[0] || null;
}

// Ajouter/mettre à jour le wallet du driver
export async function addWallet(
  provider: MobileMoneyProvider,
  phoneNumber: string,
  accountName: string,
  driverId?: string
): Promise<{ success: boolean; wallet?: MobileMoneyWallet; error?: string }> {
  const validation = validatePhoneNumber(phoneNumber);
  if (!validation.valid) {
    return { success: false, error: 'Numéro de téléphone invalide' };
  }

  let id = driverId;
  if (!id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non connecté' };
    const { data: driver } = await supabase
      .from('logitrack_drivers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!driver) return { success: false, error: 'Profil non trouvé' };
    id = driver.id;
  }

  const { error } = await supabase
    .from('logitrack_drivers')
    .update({
      momo_provider: provider,
      momo_number: validation.formatted,
      momo_name: accountName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  const wallets = await getWallets(id);
  return { success: true, wallet: wallets[0] };
}

// Définir le wallet par défaut (no-op since driver has single wallet)
export async function setDefaultWallet(_walletId: string): Promise<boolean> {
  return true;
}

// Supprimer un wallet (clear momo fields on driver)
export async function removeWallet(driverId: string): Promise<boolean> {
  const { error } = await supabase
    .from('logitrack_drivers')
    .update({
      momo_provider: null,
      momo_number: null,
      momo_name: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', driverId);

  return !error;
}

// Récupérer les transactions
export async function getTransactions(
  driverId?: string,
  limit = 20,
  offset = 0
): Promise<MobileMoneyTransaction[]> {
  let dId = driverId;
  if (!dId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data: driver } = await supabase
      .from('logitrack_drivers')
      .select('id, momo_provider, momo_number')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!driver) return [];
    dId = driver.id;
  }

  const { data, error } = await supabase
    .from('logitrack_driver_transactions')
    .select('*')
    .eq('driver_id', dId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return [];

  // Map DB rows to MobileMoneyTransaction type
  return data.map(row => ({
    id: row.id,
    walletId: dId!,
    type: mapTransactionType(row.type),
    status: row.status as MobileMoneyTransaction['status'],
    amount: Math.abs(row.amount),
    fees: 0,
    totalAmount: Math.abs(row.amount),
    currency: 'XOF' as const,
    provider: 'orange' as MobileMoneyProvider,
    phoneNumber: '',
    reference: row.id.slice(0, 12).toUpperCase(),
    description: row.description || mapTransactionDescription(row.type, Math.abs(row.amount)),
    createdAt: row.created_at,
    updatedAt: row.created_at,
    completedAt: row.status === 'completed' ? row.created_at : undefined,
  }));
}

function mapTransactionType(dbType: string): TransactionType {
  const map: Record<string, TransactionType> = {
    earning: 'earnings',
    earnings: 'earnings',
    withdrawal: 'withdrawal',
    bonus: 'deposit',
    penalty: 'payment',
  };
  return map[dbType] || 'earnings';
}

function mapTransactionDescription(type: string, amount: number): string {
  switch (type) {
    case 'earning':
    case 'earnings':
      return `Gains livraison - ${formatCurrency(amount)}`;
    case 'withdrawal':
      return `Retrait - ${formatCurrency(amount)}`;
    case 'bonus':
      return `Bonus - ${formatCurrency(amount)}`;
    default:
      return `Transaction - ${formatCurrency(amount)}`;
  }
}

// Récupérer le résumé des gains
export async function getEarningsSummary(driverId?: string): Promise<EarningsSummary> {
  const empty: EarningsSummary = { today: 0, thisWeek: 0, thisMonth: 0, pending: 0, available: 0, totalWithdrawn: 0 };

  let dId = driverId;
  if (!dId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return empty;
    const { data: driver } = await supabase
      .from('logitrack_drivers')
      .select('id, wallet_balance')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!driver) return empty;
    dId = driver.id;
  }

  // Get driver wallet balance
  const { data: driverData } = await supabase
    .from('logitrack_drivers')
    .select('wallet_balance')
    .eq('id', dId)
    .maybeSingle();

  const available = driverData?.wallet_balance || 0;

  // Get all transactions for this driver
  const { data: txns } = await supabase
    .from('logitrack_driver_transactions')
    .select('type, amount, status, created_at')
    .eq('driver_id', dId);

  if (!txns) return { ...empty, available };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  if (weekStart > todayStart) weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let today = 0, thisWeek = 0, thisMonth = 0, pending = 0, totalWithdrawn = 0;

  for (const t of txns) {
    const created = new Date(t.created_at);
    const isEarning = t.type === 'earning' || t.type === 'earnings' || t.type === 'bonus';
    const isWithdrawal = t.type === 'withdrawal';
    const amt = Math.abs(t.amount);

    if (isEarning && t.status === 'completed') {
      if (created >= todayStart) today += amt;
      if (created >= weekStart) thisWeek += amt;
      if (created >= monthStart) thisMonth += amt;
    }

    if (isEarning && t.status === 'pending') {
      pending += amt;
    }

    if (isWithdrawal && t.status === 'completed') {
      totalWithdrawn += amt;
    }
  }

  return { today, thisWeek, thisMonth, pending, available, totalWithdrawn };
}

// Obtenir l'historique des gains par jour
export async function getEarningsHistory(days = 7, driverId?: string): Promise<{ date: string; amount: number }[]> {
  let dId = driverId;
  if (!dId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data: driver } = await supabase
      .from('logitrack_drivers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!driver) return [];
    dId = driver.id;
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: txns } = await supabase
    .from('logitrack_driver_transactions')
    .select('amount, created_at')
    .eq('driver_id', dId)
    .eq('status', 'completed')
    .in('type', ['earning', 'earnings', 'bonus'])
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  // Build day-by-day map
  const dayMap: Record<string, number> = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dayMap[date.toISOString().slice(0, 10)] = 0;
  }

  if (txns) {
    for (const t of txns) {
      const dateKey = t.created_at.slice(0, 10);
      if (dayMap[dateKey] !== undefined) {
        dayMap[dateKey] += Math.abs(t.amount);
      }
    }
  }

  return Object.entries(dayMap).map(([date, amount]) => ({ date, amount }));
}

// Initier un retrait via RPC (with automatic retry on network errors)
export async function initiateWithdrawal(request: WithdrawalRequest): Promise<PaymentResult> {
  const provider = MOBILE_MONEY_PROVIDERS[request.provider];
  if (!provider || !provider.isActive) {
    return { success: false, error: 'Opérateur non disponible' };
  }

  if (request.amount < provider.limits.minAmount) {
    return { success: false, error: `Montant minimum: ${formatCurrency(provider.limits.minAmount)}` };
  }

  try {
    const { data, error } = await withRetry(
      async () => {
        const result = await supabase.rpc('request_logitrack_withdrawal', {
          p_amount: request.amount,
          p_method: provider.name,
          p_account: request.phoneNumber,
        });
        return result;
      },
      3,
      2000
    );

    if (error) {
      return { success: false, error: error.message };
    }

    if (data && !data.success) {
      return { success: false, error: data.error || 'Erreur lors du retrait' };
    }

    return {
      success: true,
      otpMessage: `Votre retrait de ${formatCurrency(request.amount)} est en cours de traitement.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Erreur réseau: ${message}` };
  }
}

// Initier un paiement via Edge Function
export async function initiatePayment(request: PaymentRequest): Promise<PaymentResult> {
  try {
    // Resolve driver_id from current auth user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié.' };

    const { data: driver } = await supabase
      .from('logitrack_drivers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!driver) return { success: false, error: 'Profil livreur introuvable.' };

    const { data, error } = await supabase.functions.invoke('process-mobile-payment', {
      body: {
        driver_id: driver.id,
        delivery_id: request.deliveryId || null,
        amount: request.amount,
        provider: request.provider,
        phone_number: request.phoneNumber,
      },
    });

    if (error) {
      return { success: false, error: error.message || 'Erreur lors du paiement.' };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Échec du paiement.' };
    }

    return {
      success: true,
      otpMessage: data.message,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur réseau.' };
  }
}

// Confirmer un paiement (vérifier le statut)
export async function confirmPayment(
  transactionId: string,
  _otp?: string
): Promise<PaymentResult> {
  try {
    const { data, error } = await supabase
      .from('logitrack_payment_requests')
      .select('id, status, external_ref, error_message')
      .eq('id', transactionId)
      .single();

    if (error || !data) {
      return { success: false, error: 'Transaction introuvable.' };
    }

    if (data.status === 'completed') {
      return { success: true };
    }

    if (data.status === 'failed') {
      return { success: false, error: data.error_message || 'Le paiement a échoué.' };
    }

    // Still processing
    return { success: false, error: 'Le paiement est en cours de traitement...' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur réseau.' };
  }
}

// Vérifier le statut d'une transaction
export async function checkTransactionStatus(transactionId: string): Promise<MobileMoneyTransaction | null> {
  const { data } = await supabase
    .from('logitrack_driver_transactions')
    .select('*')
    .eq('id', transactionId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    walletId: data.driver_id,
    type: mapTransactionType(data.type),
    status: data.status,
    amount: Math.abs(data.amount),
    fees: 0,
    totalAmount: Math.abs(data.amount),
    currency: 'XOF',
    provider: 'orange' as MobileMoneyProvider,
    phoneNumber: '',
    reference: data.id.slice(0, 12).toUpperCase(),
    description: data.description || '',
    createdAt: data.created_at,
    updatedAt: data.created_at,
  };
}
