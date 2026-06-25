import { Injectable, Inject } from '@nestjs/common';
import { PAYMENT_PROVIDER, IPaymentProvider } from './providers/payment-provider.interface';
import { CreatePaymentDto } from './dto/payment.dto';
import { VerifyPaymentDto } from './dto/payment.dto';
import { RefundPaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: IPaymentProvider,
  ) {}

  createPayment(dto: CreatePaymentDto) {
    return this.paymentProvider.createPayment(dto);
  }

  verifyPayment(dto: VerifyPaymentDto) {
    return this.paymentProvider.verifyPayment(dto);
  }

  refundPayment(dto: RefundPaymentDto) {
    return this.paymentProvider.refundPayment(dto);
  }
}
