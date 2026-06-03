import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

// Validation schema for creating a review
export const createReviewSchema = z.object({
  body: z.object({
    shopkeeperId: z.string().uuid({ message: 'Valid shopkeeper ID is required.' }),
    customerId: z.string().uuid({ message: 'Valid customer ID is required.' }),
    rating: z.number().int().min(1).max(5, { message: 'Rating must be between 1 and 5 stars.' }),
    comment: z.string().max(500, { message: 'Comment cannot exceed 500 characters.' }).optional(),
  }),
});

/**
 * Write a neighborhood trust review for a Kirana store
 */
export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopkeeperId, customerId, rating, comment } = req.body;

    // Check if store and customer exist
    const shop = await prisma.shopkeeper.findUnique({ where: { id: shopkeeperId } });
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });

    if (!shop || !customer) {
      res.status(404).json({
        success: false,
        message: 'Shopkeeper or Customer profile not found.',
      });
      return;
    }

    const review = await prisma.review.create({
      data: {
        shopkeeperId,
        customerId,
        rating,
        comment: comment || null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Review posted successfully!',
      data: review,
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review.',
    });
  }
};

/**
 * Get all reviews for a specific store
 */
export const getShopReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shopkeeperId } = req.query;

    if (!shopkeeperId || typeof shopkeeperId !== 'string') {
      res.status(400).json({
        success: false,
        message: 'shopkeeperId query parameter is required.',
      });
      return;
    }

    const reviews = await prisma.review.findMany({
      where: { shopkeeperId },
      include: {
        customer: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews.',
    });
  }
};
