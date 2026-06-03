import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

// Zod Schema for validation
export const onboardShopkeeperSchema = z.object({
  body: z.object({
    ownerName: z.string().min(2, { message: 'Owner name must be at least 2 characters long.' }),
    shopName: z.string().min(2, { message: 'Shop name must be at least 2 characters long.' }),
    phoneNumber: z.string().regex(/^[6-9]\d{9}$/, {
      message: 'Mobile number must be a valid 10-digit Indian number starting with 6-9.',
    }),
    pinCode: z.string().regex(/^\d{6}$/, { message: 'PIN code must be a valid 6-digit number.' }),
    address: z.string().min(5, { message: 'Address must be at least 5 characters long.' }),
    city: z.string().min(2, { message: 'City name must be at least 2 characters long.' }),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    saasPlan: z.enum(['BASIC', 'PREMIUM']).default('BASIC'),
  }),
});

/**
 * Controller to onboard a new Kirana Shopkeeper.
 */
export const onboardShopkeeper = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      ownerName,
      shopName,
      phoneNumber,
      pinCode,
      address,
      city,
      latitude,
      longitude,
      saasPlan,
    } = req.body;

    // Check if shopkeeper already exists
    // Hinglish Check: Kya ye mobile number pehle se registered hai?
    const existingShop = await prisma.shopkeeper.findUnique({
      where: { phoneNumber },
    });

    if (existingShop) {
      res.status(400).json({
        success: false,
        message: 'Mobile number is already registered. Please login or use a different number.',
      });
      return;
    }

    // Set Trial period expiration to 30 days from registration date
    const saasExpiresAt = new Date();
    saasExpiresAt.setDate(saasExpiresAt.getDate() + 30); // 30 days free trial

    // Create the shopkeeper record in PostgreSQL
    const newShopkeeper = await prisma.shopkeeper.create({
      data: {
        ownerName,
        shopName,
        phoneNumber,
        pinCode,
        address,
        city,
        latitude,
        longitude,
        saasPlan,
        saasStatus: 'TRIAL',
        saasExpiresAt,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Shopkeeper onboarded successfully',
      welcome: `Congratulations ${ownerName}! Your store "${shopName}" has been registered successfully.`,
      subscriptionInfo: `Your 30-day free trial has started, valid until ${saasExpiresAt.toLocaleDateString('en-IN')}.`,
      data: {
        id: newShopkeeper.id,
        ownerName: newShopkeeper.ownerName,
        shopName: newShopkeeper.shopName,
        phoneNumber: newShopkeeper.phoneNumber,
        city: newShopkeeper.city,
        saasPlan: newShopkeeper.saasPlan,
        saasStatus: newShopkeeper.saasStatus,
        saasExpiresAt: newShopkeeper.saasExpiresAt,
        createdAt: newShopkeeper.createdAt,
      },
    });
  } catch (error) {
    console.error('Error in onboarding shopkeeper:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong during onboarding. Please try again later.',
    });
  }
};

/**
 * Fetch analytics data for a specific shopkeeper
 */
export const getShopkeeperAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if shopkeeper exists
    const shop = await prisma.shopkeeper.findUnique({ where: { id } });
    if (!shop) {
      res.status(404).json({
        success: false,
        message: 'Shopkeeper profile not found.',
      });
      return;
    }

    // Get today's start date
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Fetch Completed Orders aggregates
    const ordersAgg = await prisma.order.aggregate({
      where: {
        shopkeeperId: id,
        status: 'COMPLETED',
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Fetch Today's Orders aggregates
    const todayOrdersAgg = await prisma.order.aggregate({
      where: {
        shopkeeperId: id,
        status: 'COMPLETED',
        createdAt: {
          gte: startOfToday,
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Fetch total active orders (all orders that are NOT completed and NOT cancelled)
    const activeOrdersCount = await prisma.order.count({
      where: {
        shopkeeperId: id,
        status: {
          in: ['RECEIVED', 'ACCEPTED', 'PREPARING', 'READY'],
        },
      },
    });

    // Fetch Reviews average rating
    const ratingAgg = await prisma.review.aggregate({
      where: {
        shopkeeperId: id,
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    const totalEarnings = ordersAgg._sum.totalAmount ? Number(ordersAgg._sum.totalAmount) : 0;
    const completedOrdersCount = ordersAgg._count.id || 0;
    const todayEarnings = todayOrdersAgg._sum.totalAmount ? Number(todayOrdersAgg._sum.totalAmount) : 0;
    const todayOrdersCount = todayOrdersAgg._count.id || 0;
    const averageRating = ratingAgg._avg.rating ? Number(ratingAgg._avg.rating.toFixed(1)) : 0;
    const totalReviews = ratingAgg._count.id || 0;

    res.status(200).json({
      success: true,
      data: {
        totalEarnings,
        completedOrdersCount,
        todayEarnings,
        todayOrdersCount,
        activeOrdersCount,
        averageRating,
        totalReviews,
      },
    });
  } catch (error) {
    console.error('Error fetching shopkeeper analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics.',
    });
  }
};

/**
 * Get all shopkeepers list (for dev selector)
 */
export const getAllShopkeepers = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopkeepers = await prisma.shopkeeper.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        shopName: true,
        ownerName: true,
        phoneNumber: true,
      }
    });

    res.status(200).json({
      success: true,
      data: shopkeepers,
    });
  } catch (error) {
    console.error('Error fetching all shopkeepers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve shopkeepers list.',
    });
  }
};


