import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, Avatar, Stack, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Grid, List,
  ListItem, ListItemIcon, ListItemText, LinearProgress,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { paymentsApi, PaymentResult, RefundResult } from '../../api/payments.api';
import { PageHeader } from '../../components/common/PageHeader';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  description: string;
  color: string;
  gradient: string;
  icon: React.ReactNode;
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'INR',
    period: 'forever',
    description: 'Perfect for personal use and small teams',
    color: '#94A3B8',
    gradient: 'linear-gradient(135deg, #64748B, #94A3B8)',
    icon: <WorkspacePremiumOutlinedIcon />,
    features: [
      '1 Organization',
      '3 Projects',
      '10 Tasks per project',
      '2 Team members',
      'Basic dashboard',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99900,
    currency: 'INR',
    period: 'per month',
    description: 'Best for growing teams and businesses',
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    icon: <RocketLaunchIcon />,
    features: [
      '5 Organizations',
      'Unlimited projects',
      'Unlimited tasks',
      '25 Team members',
      'Advanced analytics',
      'Priority support',
      'Real-time notifications',
      'Audit logs',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499900,
    currency: 'INR',
    period: 'per month',
    description: 'For large organizations needing full control',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #EC4899, #F43F5E)',
    icon: <BusinessOutlinedIcon />,
    features: [
      'Unlimited organizations',
      'Unlimited everything',
      'Unlimited members',
      'Custom domain',
      'Dedicated support',
      'SLA guarantee',
      'Custom integrations',
      'Payment & billing API',
      'SSO / SAML ready',
      'Compliance reports',
    ],
  },
];

function formatAmount(amount: number, currency: string) {
  if (amount === 0) return 'Free';
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${(amount / 100).toFixed(0)}`;
}

export default function BillingPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [currentPlan] = useState('free');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<PaymentResult | null>(null);
  const [refundResult, setRefundResult] = useState<RefundResult | null>(null);
  const [step, setStep] = useState<'confirm' | 'processing' | 'success' | 'refunded'>('confirm');
  const [refundOpen, setRefundOpen] = useState(false);

  // Step 1: Create payment
  const createMutation = useMutation({
    mutationFn: (plan: Plan) =>
      paymentsApi.create(plan.price, plan.currency, `${plan.name} Plan Subscription`, {
        planId: plan.id,
        planName: plan.name,
      }),
    onSuccess: async (result) => {
      setPaymentResult(result);
      setStep('processing');
      // Auto-verify after create (simulated gateway callback)
      verifyMutation.mutate({ paymentId: result.paymentId, providerReference: result.providerReference });
    },
    onError: () => enqueueSnackbar('Payment initiation failed', { variant: 'error' }),
  });

  // Step 2: Verify payment
  const verifyMutation = useMutation({
    mutationFn: ({ paymentId, providerReference }: { paymentId: string; providerReference: string }) =>
      paymentsApi.verify(paymentId, providerReference),
    onSuccess: (result) => {
      setVerifyResult(result);
      setStep('success');
      enqueueSnackbar('Payment successful! Plan upgraded.', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Payment verification failed', { variant: 'error' });
      setStep('confirm');
    },
  });

  // Step 3 (optional): Refund
  const refundMutation = useMutation({
    mutationFn: () =>
      paymentsApi.refund(paymentResult!.paymentId, paymentResult!.amount, 'Customer requested refund'),
    onSuccess: (result) => {
      setRefundResult(result);
      setRefundOpen(false);
      setStep('refunded');
      enqueueSnackbar('Refund processed successfully!', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Refund failed', { variant: 'error' }),
  });

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep('confirm');
    setPaymentResult(null);
    setVerifyResult(null);
    setRefundResult(null);
  };

  const handleConfirmPayment = () => {
    if (selectedPlan) createMutation.mutate(selectedPlan);
  };

  const isProcessing = createMutation.isPending || verifyMutation.isPending;

  return (
    <Box>
      <PageHeader
        title="Billing & Plans"
        subtitle="Upgrade your plan to unlock more features"
      />

      {/* Current Plan Banner */}
      <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #1E293B, #334155)', '&:hover': { transform: 'none' } }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ width: 48, height: 48, background: 'linear-gradient(135deg, #64748B, #94A3B8)', borderRadius: 2.5 }}>
                <WorkspacePremiumOutlinedIcon />
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 0.3 }}>Current Plan</Typography>
                <Typography variant="h6" fontWeight={700} color="#fff">Free Plan</Typography>
              </Box>
            </Stack>
            <Chip
              label="Active"
              sx={{ bgcolor: '#10B98120', color: '#10B981', fontWeight: 700, border: '1px solid #10B98140' }}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Plan Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <Grid size={{ xs: 12, md: 4 }} key={plan.id}>
              <Card sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: plan.popular ? `2px solid ${plan.color}` : '1px solid transparent',
                '&:hover': { transform: plan.id === 'free' ? 'none' : 'translateY(-4px)' },
              }}>
                {plan.popular && (
                  <Box sx={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    bgcolor: plan.color, color: '#fff', fontSize: 11, fontWeight: 700,
                    px: 2, py: 0.5, borderRadius: 10, whiteSpace: 'nowrap',
                  }}>
                    MOST POPULAR
                  </Box>
                )}

                {/* Colored top bar */}
                <Box sx={{ height: 4, background: plan.gradient, borderRadius: '4px 4px 0 0' }} />

                <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Plan header */}
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                    <Avatar sx={{ width: 42, height: 42, background: plan.gradient, borderRadius: 2 }}>
                      {plan.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>{plan.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{plan.description}</Typography>
                    </Box>
                  </Stack>

                  {/* Price */}
                  <Box sx={{ mb: 2.5 }}>
                    <Stack direction="row" alignItems="baseline" spacing={0.5}>
                      <Typography variant="h3" fontWeight={800} sx={{ color: plan.price === 0 ? 'text.primary' : plan.color }}>
                        {formatAmount(plan.price, plan.currency)}
                      </Typography>
                      {plan.price > 0 && (
                        <Typography variant="body2" color="text.secondary">/{plan.period}</Typography>
                      )}
                    </Stack>
                    {plan.price === 0 && (
                      <Typography variant="caption" color="text.secondary">{plan.period}</Typography>
                    )}
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* Features */}
                  <List dense sx={{ flexGrow: 1, p: 0 }}>
                    {plan.features.map((f) => (
                      <ListItem key={f} disableGutters sx={{ py: 0.4 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <CheckCircleOutlineIcon sx={{ fontSize: 16, color: plan.color }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={f}
                          primaryTypographyProps={{ variant: 'body2', color: 'text.secondary', fontSize: 13 }}
                        />
                      </ListItem>
                    ))}
                  </List>

                  {/* CTA Button */}
                  <Box sx={{ mt: 3 }}>
                    {isCurrent ? (
                      <Button fullWidth variant="outlined" disabled sx={{ borderRadius: 2 }}>
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => handleUpgrade(plan)}
                        sx={{
                          background: plan.gradient,
                          borderRadius: 2,
                          fontWeight: 700,
                          '&:hover': { background: plan.gradient, filter: 'brightness(1.1)' },
                        }}
                      >
                        Upgrade to {plan.name}
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Payment Architecture Note */}
      <Card sx={{ '&:hover': { transform: 'none' }, bgcolor: 'action.hover' }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Avatar sx={{ bgcolor: '#6366F115', borderRadius: 2 }}>
              <CreditCardOutlinedIcon sx={{ color: '#6366F1' }} />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                Payment Architecture — Strategy Pattern
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Currently using <strong>MockPaymentProvider</strong> for demo. Real providers (Stripe, Razorpay, PayU) can be swapped
                by implementing the <code>IPaymentProvider</code> interface — zero changes to controller or service code.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Payment Confirm / Processing / Success Dialog */}
      <Dialog
        open={!!selectedPlan}
        onClose={() => { if (!isProcessing) { setSelectedPlan(null); } }}
        maxWidth="sm"
        fullWidth
      >
        {/* CONFIRM STEP */}
        {step === 'confirm' && selectedPlan && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ background: selectedPlan.gradient, borderRadius: 2 }}>
                  <CreditCardOutlinedIcon fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Confirm Upgrade</Typography>
                  <Typography variant="caption" color="text.secondary">Review your order before payment</Typography>
                </Box>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <Card sx={{ mb: 2.5, '&:hover': { transform: 'none' }, border: `1px solid ${selectedPlan.color}30` }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="body1" fontWeight={600}>{selectedPlan.name} Plan</Typography>
                    <Chip
                      label={`${formatAmount(selectedPlan.price, selectedPlan.currency)} / ${selectedPlan.period}`}
                      sx={{ bgcolor: selectedPlan.color + '15', color: selectedPlan.color, fontWeight: 700 }}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{selectedPlan.description}</Typography>
                </CardContent>
              </Card>

              <Stack spacing={1} sx={{ px: 0.5 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  <Typography variant="body2">{formatAmount(selectedPlan.price, selectedPlan.currency)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">GST (18%)</Typography>
                  <Typography variant="body2">{formatAmount(Math.round(selectedPlan.price * 0.18), selectedPlan.currency)}</Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2" fontWeight={700}>Total</Typography>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: selectedPlan.color }}>
                    {formatAmount(Math.round(selectedPlan.price * 1.18), selectedPlan.currency)}
                  </Typography>
                </Stack>
              </Stack>

              <Alert severity="info" sx={{ mt: 2.5, borderRadius: 2 }}>
                MockPaymentProvider active — real money charged nahi hoga
              </Alert>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              <Button onClick={() => setSelectedPlan(null)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleConfirmPayment}
                sx={{ background: selectedPlan.gradient, fontWeight: 700 }}
              >
                Pay {formatAmount(Math.round(selectedPlan.price * 1.18), selectedPlan.currency)}
              </Button>
            </DialogActions>
          </>
        )}

        {/* PROCESSING STEP */}
        {step === 'processing' && (
          <>
            <DialogTitle>Processing Payment...</DialogTitle>
            <DialogContent>
              <Stack alignItems="center" spacing={3} sx={{ py: 3 }}>
                <Avatar sx={{ width: 72, height: 72, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', borderRadius: 3 }}>
                  <CreditCardOutlinedIcon sx={{ fontSize: 36 }} />
                </Avatar>
                <Box sx={{ width: '100%' }}>
                  <LinearProgress sx={{ borderRadius: 2, height: 6 }} />
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 1.5 }}>
                    {createMutation.isPending ? 'Initiating payment...' : 'Verifying with payment provider...'}
                  </Typography>
                </Box>
                {paymentResult && (
                  <Alert severity="success" sx={{ width: '100%', borderRadius: 2 }}>
                    Payment created — ID: <strong>{paymentResult.paymentId.slice(0, 8)}...</strong>
                  </Alert>
                )}
              </Stack>
            </DialogContent>
          </>
        )}

        {/* SUCCESS STEP */}
        {step === 'success' && verifyResult && selectedPlan && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ background: 'linear-gradient(135deg, #10B981, #34D399)', borderRadius: 2 }}>
                  <CheckCircleOutlineIcon fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Payment Successful!</Typography>
                  <Typography variant="caption" color="text.secondary">Your plan has been upgraded</Typography>
                </Box>
              </Stack>
            </DialogTitle>
            <DialogContent>
              {/* Receipt */}
              <Card sx={{ mb: 2, '&:hover': { transform: 'none' }, bgcolor: '#10B98108', border: '1px solid #10B98130' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <ReceiptOutlinedIcon sx={{ fontSize: 18, color: '#10B981' }} />
                    <Typography variant="subtitle2" fontWeight={700} color="#10B981">Payment Receipt</Typography>
                  </Stack>
                  <Stack spacing={1}>
                    {[
                      ['Plan', selectedPlan.name],
                      ['Amount', formatAmount(verifyResult.amount, verifyResult.currency)],
                      ['Status', verifyResult.status.toUpperCase()],
                      ['Payment ID', verifyResult.paymentId.slice(0, 16) + '...'],
                      ['Reference', verifyResult.providerReference],
                    ].map(([label, value]) => (
                      <Stack key={label} direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography variant="caption" fontWeight={600}
                          sx={label === 'Status' ? { color: '#10B981' } : {}}>
                          {value}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>

              <Button
                size="small"
                startIcon={<RefreshOutlinedIcon />}
                onClick={() => setRefundOpen(true)}
                sx={{ color: 'text.secondary', fontSize: 12 }}
              >
                Request Refund
              </Button>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button variant="contained" onClick={() => setSelectedPlan(null)} sx={{ fontWeight: 700 }}>
                Done
              </Button>
            </DialogActions>
          </>
        )}

        {/* REFUNDED STEP */}
        {step === 'refunded' && refundResult && (
          <>
            <DialogTitle>Refund Processed</DialogTitle>
            <DialogContent>
              <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: '#F59E0B20', borderRadius: 3 }}>
                  <RefreshOutlinedIcon sx={{ fontSize: 32, color: '#F59E0B' }} />
                </Avatar>
                <Typography variant="body1" textAlign="center" color="text.secondary">
                  Refund of <strong>{formatAmount(refundResult.amount, 'INR')}</strong> processed
                </Typography>
                <Alert severity="warning" sx={{ width: '100%', borderRadius: 2 }}>
                  Refund ID: <strong>{refundResult.refundId}</strong>
                </Alert>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button variant="contained" onClick={() => setSelectedPlan(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Refund Confirm Dialog */}
      <Dialog open={refundOpen} onClose={() => setRefundOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Request Refund</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to refund <strong>{selectedPlan && formatAmount(paymentResult?.amount || 0, 'INR')}</strong>?
            Your plan will be downgraded to Free.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setRefundOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={refundMutation.isPending}
            onClick={() => refundMutation.mutate()}
          >
            {refundMutation.isPending ? 'Processing...' : 'Confirm Refund'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
