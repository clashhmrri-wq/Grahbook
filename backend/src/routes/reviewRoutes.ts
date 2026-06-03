import { Router } from 'express';
import {
  createReview,
  createReviewSchema,
  getShopReviews,
} from '../controllers/reviewController';
import { validateRequest } from '../middleware/validate';

const router = Router();

// Write a neighborhood trust review
// POST /api/reviews
router.post('/', validateRequest(createReviewSchema), createReview);

// Get reviews for a specific shop
// GET /api/reviews?shopkeeperId=XYZ
router.get('/', getShopReviews);

export default router;
