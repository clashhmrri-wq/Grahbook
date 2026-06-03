import { Router } from 'express';
import {
  createPaymentOrder,
  createPaymentSchema,
  verifyPayment,
  verifyPaymentSchema,
  createSaaSSubscription,
  createSaaSSubscriptionSchema,
  verifySaaSSubscription,
  verifySaaSSubscriptionSchema,
} from '../controllers/paymentController';
import { validateRequest } from '../middleware/validate';

const router = Router();

// Initialize payment order
// POST /api/payments/order
router.post('/order', validateRequest(createPaymentSchema), createPaymentOrder);

// Verify payment signature
// POST /api/payments/verify
router.post('/verify', validateRequest(verifyPaymentSchema), verifyPayment);

// Initialize SaaS subscription upgrade
// POST /api/payments/subscription
router.post('/subscription', validateRequest(createSaaSSubscriptionSchema), createSaaSSubscription);

// Verify SaaS subscription upgrade
// POST /api/payments/subscription/verify
router.post('/subscription/verify', validateRequest(verifySaaSSubscriptionSchema), verifySaaSSubscription);

export default router;
