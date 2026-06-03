import { Router } from 'express';
import {
  createPaymentOrder,
  createPaymentSchema,
  verifyPayment,
  verifyPaymentSchema,
} from '../controllers/paymentController';
import { validateRequest } from '../middleware/validate';

const router = Router();

// Initialize Razorpay or Mock payment order
// POST /api/payments/order
router.post('/order', validateRequest(createPaymentSchema), createPaymentOrder);

// Verify Razorpay or Mock signature and accept order
// POST /api/payments/verify
router.post('/verify', validateRequest(verifyPaymentSchema), verifyPayment);

export default router;
