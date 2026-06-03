import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import prisma from '../config/db';

// Validation schemas for order payments
export const createPaymentSchema = z.object({
  body: z.object({
    orderId: z.string().uuid({ message: 'Valid order ID is required.' }),
    amount: z.number().positive({ message: 'Amount must be positive.' }),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    orderId: z.string().uuid({ message: 'Valid order ID is required.' }),
    razorpayOrderId: z.string().min(1, { message: 'Razorpay Order ID is required.' }),
    razorpayPaymentId: z.string().min(1, { message: 'Razorpay Payment ID is required.' }),
    razorpaySignature: z.string().min(1, { message: 'Razorpay signature is required.' }),
  }),
});

// Validation schemas for SaaS upgrades
export const createSaaSSubscriptionSchema = z.object({
  body: z.object({
    shopkeeperId: z.string().uuid({ message: 'Valid shopkeeper ID is required.' }),
    plan: z.enum(['BASIC', 'PREMIUM']),
  }),
});

export const verifySaaSSubscriptionSchema = z.object({
  body: z.object({
    shopkeeperId: z.string().uuid({ message: 'Valid shopkeeper ID is required.' }),
    razorpaySubscriptionId: z.string().min(1, { message: 'Subscription ID is required.' }),
    razorpayPaymentId: z.string().min(1, { message: 'Payment ID is required.' }),
    razorpaySignature: z.string().min(1, { message: 'Signature is required.' }),
  }),
});

// Initialize Razorpay SDK. Require keys in environment.
const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
  console.warn('⚠️ WARNING: Razorpay API keys are missing in your environment configuration (.env). API checkouts will throw errors.');
}

const razorpay = new Razorpay({
  key_id: key_id || 'dummy_key',
  key_secret: key_secret || 'dummy_secret',
});

/**
 * Initialize payment order via Razorpay SDK (Real integration)
 */
export const createPaymentOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, amount } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    if (!key_id || !key_secret) {
      res.status(500).json({ success: false, message: 'Payment gateway configuration missing.' });
      return;
    }

    // Create Razorpay Order
    // Razorpay expects amount in paise (1 INR = 100 Paise)
    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_order_${orderId.substring(0, 8)}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Insert or update payment record in PostgreSQL
    const payment = await prisma.payment.upsert({
      where: { razorpayOrderId: razorpayOrder.id },
      update: {
        amount,
        status: 'PENDING',
      },
      create: {
        orderId,
        razorpayOrderId: razorpayOrder.id,
        amount,
        status: 'PENDING',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Razorpay order created successfully',
      razorpayKeyId: key_id,
      razorpayOrderId: razorpayOrder.id,
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
 * Verify Razorpay payment signature
 */
export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    if (!key_secret) {
      res.status(500).json({ success: false, message: 'Payment gateway credentials missing.' });
      return;
    }

    // Direct HMAC signature validation (No mock flow)
    const generatedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      res.status(400).json({
        success: false,
        message: 'Payment signature verification failed. Invalid transaction.',
      });
      return;
    }

    // Execute database updates in transaction
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { razorpayOrderId },
        data: {
          status: 'SUCCESS',
          razorpayPaymentId,
        },
      });

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

/**
 * Initialize Razorpay SaaS Subscription for shopkeeper plan upgrades
 */
export const createSaaSSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopkeeperId, plan } = req.body;

    const shop = await prisma.shopkeeper.findUnique({ where: { id: shopkeeperId } });
    if (!shop) {
      res.status(404).json({ success: false, message: 'Shopkeeper not found.' });
      return;
    }

    if (!key_id || !key_secret) {
      res.status(500).json({ success: false, message: 'Subscription billing credentials missing.' });
      return;
    }

    // Upgrading to PREMIUM monthly plan (₹799)
    // In production, you would create a Plan ID via Razorpay Dashboard and link it here
    const premiumPlanId = process.env.RAZORPAY_PREMIUM_PLAN_ID || 'plan_GBPremium001';

    const options = {
      plan_id: premiumPlanId,
      total_count: 12, // 1 year billing cycle
      quantity: 1,
      customer_notify: 1 as const,
      notes: {
        shopkeeperId,
        plan,
      },
    };

    const subscription = (await razorpay.subscriptions.create(options)) as any;

    res.status(201).json({
      success: true,
      message: 'Subscription initialized successfully.',
      razorpayKeyId: key_id,
      razorpaySubscriptionId: subscription.id,
      plan,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize SaaS subscription billing.',
    });
  }
};

/**
 * Verify SaaS upgrade subscription signature and unlock premium features
 */
export const verifySaaSSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopkeeperId, razorpaySubscriptionId, razorpayPaymentId, razorpaySignature } = req.body;

    const shop = await prisma.shopkeeper.findUnique({ where: { id: shopkeeperId } });
    if (!shop) {
      res.status(404).json({ success: false, message: 'Shopkeeper not found.' });
      return;
    }

    if (!key_secret) {
      res.status(500).json({ success: false, message: 'Subscription verification keys missing.' });
      return;
    }

    // Validate Signature
    const generatedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      res.status(400).json({
        success: false,
        message: 'Signature mismatch. SaaS subscription verification failed.',
      });
      return;
    }

    // Upgrade shop subscription variables in PostgreSQL database
    const nextExpires = new Date();
    nextExpires.setDate(nextExpires.getDate() + 30); // Extend by 30 days

    await prisma.shopkeeper.update({
      where: { id: shopkeeperId },
      data: {
        saasPlan: 'PREMIUM',
        saasStatus: 'ACTIVE',
        saasExpiresAt: nextExpires,
      },
    });

    res.status(200).json({
      success: true,
      message: 'SaaS Subscription active! Premium features unlocked successfully.',
    });
  } catch (error) {
    console.error('Error verifying SaaS subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify SaaS subscription.',
    });
  }
};
