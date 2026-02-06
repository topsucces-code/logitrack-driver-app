// Service Mobile Money pour Côte d'Ivoire
// Version mock pour développement - prêt pour intégration API réelle

import {
  MobileMoneyProvider,
  MobileMoneyProviderInfo,
  MobileMoneyWallet,
  MobileMoneyTransaction,
  TransactionType,
  TransactionStatus,
  PaymentRequest,
  WithdrawalRequest,
  PaymentResult,
  EarningsSummary,
} from '../types/mobileMoney';

// Configuration des opérateurs Mobile Money en Côte d'Ivoire
export const MOBILE_MONEY_PROVIDERS: Record<MobileMoneyProvider, MobileMoneyProviderInfo> = {
  orange_money: {
    id: 'orange_money',
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
  mtn_momo: {
    id: 'mtn_momo',
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
      percentage: 0, // Wave est gratuit pour les envois
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
  moov_money: {
    id: 'moov_money',
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

// Mock data pour les wallets
const mockWallets: MobileMoneyWallet[] = [
  {
    id: 'wallet-1',
    userId: 'current-user',
    provider: 'orange_money',
    phoneNumber: '+225 07 07 12 34 56',
    accountName: 'Konan Yao',
    balance: 45000,
    isDefault: true,
    isVerified: true,
    createdAt: '2024-01-15T10:00:00Z',
    lastUsed: '2024-02-05T14:30:00Z',
  },
  {
    id: 'wallet-2',
    userId: 'current-user',
    provider: 'wave',
    phoneNumber: '+225 05 05 98 76 54',
    accountName: 'Konan Yao',
    balance: 28500,
    isDefault: false,
    isVerified: true,
    createdAt: '2024-02-01T08:00:00Z',
    lastUsed: '2024-02-04T09:15:00Z',
  },
];

// Mock transactions
const mockTransactions: MobileMoneyTransaction[] = [
  {
    id: 'txn-001',
    walletId: 'wallet-1',
    type: 'earnings',
    status: 'completed',
    amount: 2500,
    fees: 0,
    totalAmount: 2500,
    currency: 'XOF',
    provider: 'orange_money',
    phoneNumber: '+225 07 07 12 34 56',
    reference: 'EARN-2024020501',
    description: 'Livraison #LT-2024-0523',
    metadata: { deliveryId: 'del-523' },
    createdAt: '2024-02-05T10:30:00Z',
    updatedAt: '2024-02-05T10:30:00Z',
    completedAt: '2024-02-05T10:30:00Z',
  },
  {
    id: 'txn-002',
    walletId: 'wallet-1',
    type: 'earnings',
    status: 'completed',
    amount: 3500,
    fees: 0,
    totalAmount: 3500,
    currency: 'XOF',
    provider: 'orange_money',
    phoneNumber: '+225 07 07 12 34 56',
    reference: 'EARN-2024020502',
    description: 'Livraison #LT-2024-0524',
    metadata: { deliveryId: 'del-524' },
    createdAt: '2024-02-05T12:45:00Z',
    updatedAt: '2024-02-05T12:45:00Z',
    completedAt: '2024-02-05T12:45:00Z',
  },
  {
    id: 'txn-003',
    walletId: 'wallet-1',
    type: 'withdrawal',
    status: 'completed',
    amount: 20000,
    fees: 200,
    totalAmount: 20200,
    currency: 'XOF',
    provider: 'orange_money',
    phoneNumber: '+225 07 07 12 34 56',
    reference: 'WD-2024020401',
    description: 'Retrait vers Orange Money',
    createdAt: '2024-02-04T18:00:00Z',
    updatedAt: '2024-02-04T18:05:00Z',
    completedAt: '2024-02-04T18:05:00Z',
  },
  {
    id: 'txn-004',
    walletId: 'wallet-1',
    type: 'earnings',
    status: 'pending',
    amount: 1800,
    fees: 0,
    totalAmount: 1800,
    currency: 'XOF',
    provider: 'orange_money',
    phoneNumber: '+225 07 07 12 34 56',
    reference: 'EARN-2024020503',
    description: 'Livraison #LT-2024-0525 (en attente)',
    metadata: { deliveryId: 'del-525' },
    createdAt: '2024-02-05T14:15:00Z',
    updatedAt: '2024-02-05T14:15:00Z',
  },
  {
    id: 'txn-005',
    walletId: 'wallet-2',
    type: 'withdrawal',
    status: 'completed',
    amount: 15000,
    fees: 0,
    totalAmount: 15000,
    currency: 'XOF',
    provider: 'wave',
    phoneNumber: '+225 05 05 98 76 54',
    reference: 'WD-2024020301',
    description: 'Retrait vers Wave',
    createdAt: '2024-02-03T16:30:00Z',
    updatedAt: '2024-02-03T16:32:00Z',
    completedAt: '2024-02-03T16:32:00Z',
  },
];

// Simuler un délai réseau
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Générer un ID unique
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Générer une référence de transaction
const generateReference = (type: TransactionType) => {
  const prefix = type === 'withdrawal' ? 'WD' : type === 'earnings' ? 'EARN' : 'TXN';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}-${date}-${random}`;
};

// Calculer les frais
export function calculateFees(amount: number, provider: MobileMoneyProvider): number {
  const providerInfo = MOBILE_MONEY_PROVIDERS[provider];
  if (!providerInfo) return 0;

  const { percentage, fixedFee, minFee, maxFee } = providerInfo.fees;
  let fees = (amount * percentage) / 100 + fixedFee;

  if (fees < minFee) fees = minFee;
  if (fees > maxFee) fees = maxFee;

  return Math.ceil(fees);
}

// Valider un numéro de téléphone ivoirien
export function validatePhoneNumber(phone: string): { valid: boolean; formatted: string; provider?: MobileMoneyProvider } {
  // Nettoyer le numéro
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Ajouter le préfixe si nécessaire
  if (cleaned.startsWith('0')) {
    cleaned = '+225' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+225')) {
    cleaned = '+225' + cleaned;
  }

  // Vérifier la longueur (10 chiffres après +225)
  const digits = cleaned.replace('+225', '');
  if (digits.length !== 10) {
    return { valid: false, formatted: phone };
  }

  // Détecter l'opérateur par le préfixe
  const prefix = digits.substring(0, 2);
  let provider: MobileMoneyProvider | undefined;

  if (['07', '08', '09'].includes(prefix)) {
    provider = 'orange_money';
  } else if (['05', '06'].includes(prefix)) {
    provider = 'mtn_momo';
  } else if (['01', '02', '03'].includes(prefix)) {
    provider = 'moov_money';
  }
  // Wave peut être utilisé avec n'importe quel numéro

  // Formater pour l'affichage
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

// ========== API Mock ==========

// Récupérer les wallets de l'utilisateur
export async function getWallets(): Promise<MobileMoneyWallet[]> {
  await delay(500);
  return [...mockWallets];
}

// Récupérer un wallet par ID
export async function getWallet(walletId: string): Promise<MobileMoneyWallet | null> {
  await delay(300);
  return mockWallets.find(w => w.id === walletId) || null;
}

// Ajouter un nouveau wallet
export async function addWallet(
  provider: MobileMoneyProvider,
  phoneNumber: string,
  accountName: string
): Promise<{ success: boolean; wallet?: MobileMoneyWallet; error?: string }> {
  await delay(1000);

  const validation = validatePhoneNumber(phoneNumber);
  if (!validation.valid) {
    return { success: false, error: 'Numéro de téléphone invalide' };
  }

  // Vérifier si le wallet existe déjà
  const existing = mockWallets.find(
    w => w.provider === provider && w.phoneNumber === validation.formatted
  );
  if (existing) {
    return { success: false, error: 'Ce compte est déjà enregistré' };
  }

  const newWallet: MobileMoneyWallet = {
    id: `wallet-${generateId()}`,
    userId: 'current-user',
    provider,
    phoneNumber: validation.formatted,
    accountName,
    balance: 0,
    isDefault: mockWallets.length === 0,
    isVerified: false,
    createdAt: new Date().toISOString(),
    lastUsed: null,
  };

  mockWallets.push(newWallet);

  return { success: true, wallet: newWallet };
}

// Définir le wallet par défaut
export async function setDefaultWallet(walletId: string): Promise<boolean> {
  await delay(300);

  mockWallets.forEach(w => {
    w.isDefault = w.id === walletId;
  });

  return true;
}

// Supprimer un wallet
export async function removeWallet(walletId: string): Promise<boolean> {
  await delay(500);

  const index = mockWallets.findIndex(w => w.id === walletId);
  if (index > -1) {
    mockWallets.splice(index, 1);
    return true;
  }
  return false;
}

// Récupérer les transactions
export async function getTransactions(
  walletId?: string,
  limit = 20,
  offset = 0
): Promise<MobileMoneyTransaction[]> {
  await delay(400);

  let transactions = [...mockTransactions];

  if (walletId) {
    transactions = transactions.filter(t => t.walletId === walletId);
  }

  // Trier par date décroissante
  transactions.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return transactions.slice(offset, offset + limit);
}

// Récupérer le résumé des gains
export async function getEarningsSummary(): Promise<EarningsSummary> {
  await delay(400);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const earnings = mockTransactions.filter(t => t.type === 'earnings');

  const today = earnings
    .filter(t => new Date(t.createdAt) >= todayStart && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const thisWeek = earnings
    .filter(t => new Date(t.createdAt) >= weekStart && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const thisMonth = earnings
    .filter(t => new Date(t.createdAt) >= monthStart && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const pending = earnings
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const available = mockWallets.reduce((sum, w) => sum + w.balance, 0);

  const totalWithdrawn = mockTransactions
    .filter(t => t.type === 'withdrawal' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    today,
    thisWeek,
    thisMonth,
    pending,
    available,
    totalWithdrawn,
  };
}

// Initier un paiement (simulation)
export async function initiatePayment(request: PaymentRequest): Promise<PaymentResult> {
  await delay(1500);

  const provider = MOBILE_MONEY_PROVIDERS[request.provider];
  if (!provider || !provider.isActive) {
    return { success: false, error: 'Opérateur non disponible' };
  }

  // Vérifier les limites
  if (request.amount < provider.limits.minAmount) {
    return { success: false, error: `Montant minimum: ${formatCurrency(provider.limits.minAmount)}` };
  }
  if (request.amount > provider.limits.maxPerTransaction) {
    return { success: false, error: `Montant maximum: ${formatCurrency(provider.limits.maxPerTransaction)}` };
  }

  const fees = calculateFees(request.amount, request.provider);

  const transaction: MobileMoneyTransaction = {
    id: `txn-${generateId()}`,
    walletId: mockWallets.find(w => w.provider === request.provider)?.id || 'wallet-1',
    type: 'payment',
    status: 'pending',
    amount: request.amount,
    fees,
    totalAmount: request.amount + fees,
    currency: 'XOF',
    provider: request.provider,
    phoneNumber: request.phoneNumber,
    reference: generateReference('payment'),
    description: request.description,
    metadata: {
      deliveryId: request.deliveryId,
      orderId: request.orderId,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockTransactions.unshift(transaction);

  // Simuler qu'on attend l'OTP ou la validation
  return {
    success: true,
    transaction,
    requiresOtp: true,
    otpMessage: `Un code de confirmation a été envoyé au ${request.phoneNumber}. Composez ${provider.ussdCode} pour valider.`,
  };
}

// Confirmer un paiement (après OTP)
export async function confirmPayment(
  transactionId: string,
  otp?: string
): Promise<PaymentResult> {
  await delay(2000);

  const transaction = mockTransactions.find(t => t.id === transactionId);
  if (!transaction) {
    return { success: false, error: 'Transaction non trouvée' };
  }

  // Simuler 90% de succès
  const isSuccess = Math.random() > 0.1;

  if (isSuccess) {
    transaction.status = 'completed';
    transaction.completedAt = new Date().toISOString();
    transaction.externalReference = `EXT-${generateId().toUpperCase()}`;

    return { success: true, transaction };
  } else {
    transaction.status = 'failed';
    transaction.failureReason = 'Solde insuffisant ou timeout';

    return { success: false, error: 'Paiement échoué. Veuillez réessayer.', transaction };
  }
}

// Initier un retrait
export async function initiateWithdrawal(request: WithdrawalRequest): Promise<PaymentResult> {
  await delay(1500);

  const wallet = mockWallets.find(
    w => w.provider === request.provider && w.phoneNumber.includes(request.phoneNumber.slice(-8))
  );

  if (!wallet) {
    return { success: false, error: 'Compte non trouvé' };
  }

  const fees = calculateFees(request.amount, request.provider);
  const totalAmount = request.amount + fees;

  if (wallet.balance < totalAmount) {
    return { success: false, error: `Solde insuffisant. Disponible: ${formatCurrency(wallet.balance)}` };
  }

  const provider = MOBILE_MONEY_PROVIDERS[request.provider];

  // Vérifier les limites
  if (request.amount < provider.limits.minAmount) {
    return { success: false, error: `Montant minimum: ${formatCurrency(provider.limits.minAmount)}` };
  }

  const transaction: MobileMoneyTransaction = {
    id: `txn-${generateId()}`,
    walletId: wallet.id,
    type: 'withdrawal',
    status: 'processing',
    amount: request.amount,
    fees,
    totalAmount,
    currency: 'XOF',
    provider: request.provider,
    phoneNumber: wallet.phoneNumber,
    reference: generateReference('withdrawal'),
    description: `Retrait vers ${provider.name}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockTransactions.unshift(transaction);

  // Simuler le traitement automatique après 2 secondes
  setTimeout(() => {
    transaction.status = 'completed';
    transaction.completedAt = new Date().toISOString();
    transaction.externalReference = `EXT-${generateId().toUpperCase()}`;
    wallet.balance -= totalAmount;
    wallet.lastUsed = new Date().toISOString();
  }, 2000);

  return {
    success: true,
    transaction,
    otpMessage: `Votre retrait de ${formatCurrency(request.amount)} est en cours de traitement.`,
  };
}

// Vérifier le statut d'une transaction
export async function checkTransactionStatus(transactionId: string): Promise<MobileMoneyTransaction | null> {
  await delay(500);
  return mockTransactions.find(t => t.id === transactionId) || null;
}

// Obtenir l'historique des gains par jour (pour les graphiques)
export async function getEarningsHistory(days = 7): Promise<{ date: string; amount: number }[]> {
  await delay(400);

  const history: { date: string; amount: number }[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    // Mock data avec variation
    const baseAmount = 15000 + Math.random() * 20000;
    const dayOfWeek = date.getDay();
    const multiplier = dayOfWeek === 0 ? 0.5 : dayOfWeek === 6 ? 0.7 : 1;

    history.push({
      date: dateStr,
      amount: Math.round(baseAmount * multiplier),
    });
  }

  return history;
}
