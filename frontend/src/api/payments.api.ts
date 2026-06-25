import apiClient from './apiClient';

export interface PaymentResult {
  paymentId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  currency: string;
  providerReference: string;
  metadata?: Record<string, any>;
}

export interface RefundResult {
  refundId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
}

export const paymentsApi = {
  create: async (amount: number, currency: string, description: string, metadata?: Record<string, any>): Promise<PaymentResult> => {
    const res = await apiClient.post('/payments/create', { amount, currency, description, metadata });
    return res.data.data || res.data;
  },
  verify: async (paymentId: string, providerReference: string): Promise<PaymentResult> => {
    const res = await apiClient.post('/payments/verify', { paymentId, providerReference });
    return res.data.data || res.data;
  },
  refund: async (paymentId: string, amount?: number, reason?: string): Promise<RefundResult> => {
    const res = await apiClient.post('/payments/refund', { paymentId, amount, reason });
    return res.data.data || res.data;
  },
};
