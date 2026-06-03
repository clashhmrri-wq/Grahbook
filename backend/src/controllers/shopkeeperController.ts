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
