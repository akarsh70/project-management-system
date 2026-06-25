# Payment Abstraction Layer — Hindlish mein

## Design Pattern: Strategy Pattern

Payment providers easily swap karne ke liye **Strategy design pattern** use kiya hai. Business logic same rehti hai, provider badal dete hain.

---

## Interface

```typescript
// payments/interfaces/payment-provider.interface.ts

export interface CreatePaymentOptions {
  amount: number;           // In smallest currency unit (paise/cents)
  currency: string;         // 'INR', 'USD', etc.
  description: string;
  metadata?: Record<string, string>;
}

export interface VerifyPaymentOptions {
  paymentId: string;
  signature?: string;
  orderId?: string;
}

export interface RefundPaymentOptions {
  paymentId: string;
  amount?: number;          // Partial refund ke liye (optional)
  reason?: string;
}

export interface PaymentResult {
  paymentId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  currency: string;
  providerReference?: string;
  error?: string;
}

export interface RefundResult {
  refundId: string;
  paymentId: string;
  status: 'success' | 'failed';
  amount: number;
  error?: string;
}

export interface IPaymentProvider {
  createPayment(options: CreatePaymentOptions): Promise<PaymentResult>;
  verifyPayment(options: VerifyPaymentOptions): Promise<PaymentResult>;
  refundPayment(options: RefundPaymentOptions): Promise<RefundResult>;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
```

---

## Current: MockPaymentProvider

Development aur testing ke liye:

```typescript
@Injectable()
export class MockPaymentProvider implements IPaymentProvider {
  async createPayment(options: CreatePaymentOptions): Promise<PaymentResult> {
    // Simulate 100ms processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      paymentId: `mock_pay_${Date.now()}`,
      status: 'completed',  // Mock always succeeds
      amount: options.amount,
      currency: options.currency,
      providerReference: `mock_ref_${Date.now()}`,
    };
  }

  async verifyPayment(options: VerifyPaymentOptions): Promise<PaymentResult> {
    return {
      paymentId: options.paymentId,
      status: 'completed',
      amount: 0,
      currency: 'INR',
    };
  }

  async refundPayment(options: RefundPaymentOptions): Promise<RefundResult> {
    return {
      refundId: `mock_refund_${Date.now()}`,
      paymentId: options.paymentId,
      status: 'success',
      amount: options.amount || 0,
    };
  }
}
```

---

## Future: Stripe Integration

```bash
npm install stripe
```

```typescript
import Stripe from 'stripe';

@Injectable()
export class StripePaymentProvider implements IPaymentProvider {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-06-20',
    });
  }

  async createPayment(options: CreatePaymentOptions): Promise<PaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: options.amount,
        currency: options.currency.toLowerCase(),
        description: options.description,
        metadata: options.metadata,
        automatic_payment_methods: { enabled: true },
      });

      return {
        paymentId: paymentIntent.id,
        status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
        amount: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        providerReference: paymentIntent.client_secret,
      };
    } catch (error) {
      return {
        paymentId: '',
        status: 'failed',
        amount: options.amount,
        currency: options.currency,
        error: error.message,
      };
    }
  }

  async verifyPayment(options: VerifyPaymentOptions): Promise<PaymentResult> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(options.paymentId);
    return {
      paymentId: paymentIntent.id,
      status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
      amount: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
    };
  }

  async refundPayment(options: RefundPaymentOptions): Promise<RefundResult> {
    const refund = await this.stripe.refunds.create({
      payment_intent: options.paymentId,
      amount: options.amount,
      reason: options.reason as Stripe.RefundCreateParams.Reason,
    });

    return {
      refundId: refund.id,
      paymentId: options.paymentId,
      status: refund.status === 'succeeded' ? 'success' : 'failed',
      amount: refund.amount,
    };
  }
}
```

---

## Future: Razorpay Integration (India)

```bash
npm install razorpay
```

```typescript
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayPaymentProvider implements IPaymentProvider {
  private razorpay: Razorpay;

  constructor(private configService: ConfigService) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get('RAZORPAY_KEY_ID'),
      key_secret: this.configService.get('RAZORPAY_KEY_SECRET'),
    });
  }

  async createPayment(options: CreatePaymentOptions): Promise<PaymentResult> {
    const order = await this.razorpay.orders.create({
      amount: options.amount,
      currency: options.currency,
      receipt: `receipt_${Date.now()}`,
      notes: options.metadata,
    });

    return {
      paymentId: order.id,
      status: 'pending',  // Razorpay: payment client side hota hai
      amount: order.amount as number,
      currency: order.currency,
      providerReference: order.id,
    };
  }

  async verifyPayment(options: VerifyPaymentOptions): Promise<PaymentResult> {
    // Razorpay webhook signature verify karo
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${options.orderId}|${options.paymentId}`);
    const expectedSignature = hmac.digest('hex');

    const isValid = expectedSignature === options.signature;

    return {
      paymentId: options.paymentId,
      status: isValid ? 'completed' : 'failed',
      amount: 0,
      currency: 'INR',
    };
  }

  async refundPayment(options: RefundPaymentOptions): Promise<RefundResult> {
    const refund = await this.razorpay.payments.refund(options.paymentId, {
      amount: options.amount,
      notes: { reason: options.reason },
    });

    return {
      refundId: refund.id,
      paymentId: options.paymentId,
      status: refund.entity === 'refund' ? 'success' : 'failed',
      amount: refund.amount,
    };
  }
}
```

---

## Provider Swap — Zero Business Logic Change

```typescript
// payments.module.ts — Sirf ye line change karo

@Module({
  providers: [
    PaymentsService,

    // DEVELOPMENT:
    { provide: PAYMENT_PROVIDER, useClass: MockPaymentProvider },

    // PRODUCTION (Stripe):
    // { provide: PAYMENT_PROVIDER, useClass: StripePaymentProvider },

    // PRODUCTION (Razorpay for India):
    // { provide: PAYMENT_PROVIDER, useClass: RazorpayPaymentProvider },
  ],
})
export class PaymentsModule {}
```

`PaymentsService` aur `PaymentsController` mein **koi bhi change nahi** hoga! ✅

```typescript
// payments.service.ts — Provider inject hota hai
@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: IPaymentProvider,  // Interface se inject
  ) {}

  async processPayment(dto: CreatePaymentDto): Promise<PaymentResult> {
    return this.paymentProvider.createPayment({
      amount: dto.amount,
      currency: dto.currency || 'INR',
      description: dto.description,
    });
  }
}
```

---

## Webhook Handling (Production)

```typescript
// payments.controller.ts
@Post('webhook/stripe')
@Public()  // Webhook auth JWT se nahi, signature se
async stripeWebhook(
  @Req() req: Request,
  @Headers('stripe-signature') signature: string,
) {
  const event = this.stripe.webhooks.constructEvent(
    req.rawBody,  // Raw body needed for signature verification
    signature,
    process.env.STRIPE_WEBHOOK_SECRET,
  );

  switch (event.type) {
    case 'payment_intent.succeeded':
      await this.paymentsService.handleSuccessfulPayment(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await this.paymentsService.handleFailedPayment(event.data.object);
      break;
  }

  return { received: true };
}
```

---

## Subscription Plans Architecture (Future)

```typescript
// Multi-tier SaaS pricing
enum PlanType {
  FREE = 'FREE',       // 5 projects, 3 members
  STARTER = 'STARTER', // 20 projects, 10 members  — ₹999/month
  PRO = 'PRO',         // Unlimited               — ₹4999/month
  ENTERPRISE = 'ENTERPRISE', // Custom             — Custom pricing
}

// organizations table mein add karo
planType: PlanType = PlanType.FREE;
planExpiresAt: Date;
stripeSubscriptionId: string;
```
