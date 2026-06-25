export interface CreatePaymentOptions {
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  paymentId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  currency: string;
  providerReference: string;
  metadata?: Record<string, any>;
}

export interface VerifyPaymentOptions {
  paymentId: string;
  providerReference: string;
}

export interface RefundPaymentOptions {
  paymentId: string;
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
}

export interface IPaymentProvider {
  createPayment(options: CreatePaymentOptions): Promise<PaymentResult>;
  verifyPayment(options: VerifyPaymentOptions): Promise<PaymentResult>;
  refundPayment(options: RefundPaymentOptions): Promise<RefundResult>;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
