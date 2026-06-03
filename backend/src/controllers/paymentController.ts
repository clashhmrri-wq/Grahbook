import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import prisma from '../config/db';

// Validation schema for creating a payment order
export const createPaymentSchema = z.object({
  body: z.object({
    orderId: z.string().uuid({ message: 'Valid order ID is required.' }),
    amount: z.number().positive({ message: 'Amount must be positive.' }),
  }),
});

// Validation schema for payment signature verification
export const verifyPaymentSchema = z.object({
  body: z.object({
    orderId: z.string().uuid({ message: 'Valid order ID is required.' }),
    razorpayOrderId: z.string().min(1, { message: 'Razorpay Order ID is required.' }),
    razorpayPaymentId: z.string().min(1, { message: 'Razorpay Payment ID is required.' }),
    razorpaySignature: z.string().min(1, { message: 'Razorpay signature is required.' }),
  }),
});

// Initialize Razorpay SDK. Support mock configuration if keys are missing.
const hasRazorpayConfig = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;
const razorpay = hasRazorpayConfig
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    })
  : null;

/**
 * Initialize payment order via Razorpay SDK (with mock fallback if keys are missing)
 */
export const createPaymentOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, amount } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    let razorpayOrderId = `rzp_mock_${crypto.randomBytes(8).toString('hex')}`;

    if (razorpay) {
      // Create Razorpay Order
      // Razorpay expects amount in paise (1 INR = 100 Paise)
      const options = {
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `receipt_order_${orderId.substring(0, 8)}`,
      };

      const razorpayOrder = await razorpay.orders.create(options);
      razorpayOrderId = razorpayOrder.id;
    }

    // Insert or update payment record in PostgreSQL
    const payment = await prisma.payment.upsert({
      where: { razorpayOrderId },
      update: {
        amount,
        status: 'PENDING',
      },
      create: {
        orderId,
        razorpayOrderId,
        amount,
        status: 'PENDING',
      },
    });

    res.status(201).json({
      success: true,
      message: razorpay ? 'Razorpay order created successfully' : 'Mock payment order initialized',
      isMockMode: !razorpay,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key',
      razorpayOrderId,
      paymentId: payment.id,
      amount,
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment transaction.',
    });
  }
};

/**
 * Verify Razorpay payment signature (supports mock verification if isMockMode is true)
 */
export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Check if the order exists
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    let isSignatureValid = false;

    if (razorpayOrderId.startsWith('rzp_mock_')) {
      // Mock validation mode
      isSignatureValid = true;
    } else if (hasRazorpayConfig && process.env.RAZORPAY_KEY_SECRET) {
      // Direct HMAC signature validation
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      isSignatureValid = generatedSignature === razorpaySignature;
    }

    if (!isSignatureValid) {
      res.status(400).json({
        success: false,
        message: 'Payment signature verification failed. Invalid transaction.',
      });
      return;
    }

    // Execute payment success updates in database transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update Payment status
      await tx.payment.update({
        where: { razorpayOrderId },
        data: {
          status: 'SUCCESS',
          razorpayPaymentId,
        },
      });

      // 2. Set order status to ACCEPTED
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'ACCEPTED',
        },
      });
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified and order accepted successfully!',
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment transaction.',
    });
  }
};
