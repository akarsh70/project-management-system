import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IPaymentProvider,
  CreatePaymentOptions,
  PaymentResult,
  VerifyPaymentOptions,
  RefundPaymentOptions,
  RefundResult,
} from './payment-provider.interface';

@Injectable()
export class MockPaymentProvider implements IPaymentProvider {
  private readonly logger = new Logger(MockPaymentProvider.name);
  private readonly payments = new Map<string, PaymentResult>();

  async createPayment(options: CreatePaymentOptions): Promise<PaymentResult> {
    await this.simulateDelay(100);

    const result: PaymentResult = {
      paymentId: uuidv4(),
      status: 'completed',
      amount: options.amount,
      currency: options.currency,
      providerReference: `MOCK-${uuidv4().substring(0, 8).toUpperCase()}`,
      metadata: options.metadata,
    };

    this.payments.set(result.paymentId, result);
    this.logger.log(`Mock payment created: ${result.paymentId} (${options.currency} ${options.amount})`);

    return result;
  }

  async verifyPayment(options: VerifyPaymentOptions): Promise<PaymentResult> {
    await this.simulateDelay(50);

    const payment = this.payments.get(options.paymentId);
    if (!payment) {
      return {
        paymentId: options.paymentId,
        status: 'failed',
        amount: 0,
        currency: 'USD',
        providerReference: options.providerReference,
      };
    }

    return { ...payment, status: 'completed' };
  }

  async refundPayment(options: RefundPaymentOptions): Promise<RefundResult> {
    await this.simulateDelay(100);

    const payment = this.payments.get(options.paymentId);
    const refundAmount = options.amount || payment?.amount || 0;

    const result: RefundResult = {
      refundId: `REFUND-${uuidv4().substring(0, 8).toUpperCase()}`,
      status: 'completed',
      amount: refundAmount,
    };

    this.logger.log(`Mock refund processed: ${result.refundId}`);
    return result;
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
