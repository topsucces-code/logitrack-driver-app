// Types pour le système Mobile Money en Côte d'Ivoire

export type MobileMoneyProvider = 'orange_money' | 'mtn_momo' | 'wave' | 'moov_money';

export interface MobileMoneyProviderInfo {
  id: MobileMoneyProvider;
  name: string;
  shortName: string;
  color: string;
  bgColor: string;
  darkBgColor: string;
  icon: string;
  ussdCode: string;
  fees: {
    percentage: number;
    fixedFee: number;
    minFee: number;
    maxFee: number;
  };
  limits: {
    minAmount: number;
    maxPerTransaction: number;
    maxPerDay: number;
    maxPerMonth: number;
  };
  isActive: boolean;
}

export interface MobileMoneyWallet {
  id: string;
  userId: string;
  provider: MobileMoneyProvider;
  phoneNumber: string;
  accountName: string;
  balance: number;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: string;
  lastUsed: string | null;
}

export type TransactionType = 'payment' | 'withdrawal' | 'deposit' | 'transfer' | 'refund' | 'earnings';
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';

export interface MobileMoneyTransaction {
  id: string;
  walletId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  fees: number;
  totalAmount: number;
  currency: 'XOF';
  provider: MobileMoneyProvider;
  phoneNumber: string;
  reference: string;
  externalReference?: string;
  description: string;
  metadata?: {
    deliveryId?: string;
    orderId?: string;
    recipientName?: string;
    recipientPhone?: string;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failureReason?: string;
}

export interface PaymentRequest {
  amount: number;
  provider: MobileMoneyProvider;
  phoneNumber: string;
  description: string;
  deliveryId?: string;
  orderId?: string;
}

export interface WithdrawalRequest {
  amount: number;
  provider: MobileMoneyProvider;
  phoneNumber: string;
  pin?: string;
}

export interface PaymentResult {
  success: boolean;
  transaction?: MobileMoneyTransaction;
  error?: string;
  requiresOtp?: boolean;
  otpMessage?: string;
}

export interface EarningsSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  pending: number;
  available: number;
  totalWithdrawn: number;
}

export interface WithdrawalSchedule {
  id: string;
  walletId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'manual';
  minimumAmount: number;
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  isActive: boolean;
}
