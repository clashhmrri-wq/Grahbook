import { Router } from 'express';
import {
  onboardShopkeeper,
  onboardShopkeeperSchema,
  getShopkeeperAnalytics,
  getAllShopkeepers,
} from '../controllers/shopkeeperController';
import { validateRequest } from '../middleware/validate';

const router = Router();

// Get all shopkeepers
// GET /api/shopkeepers
router.get('/', getAllShopkeepers);

// Onboard shopkeeper endpoint
// POST /api/shopkeepers/onboard
router.post('/onboard', validateRequest(onboardShopkeeperSchema), onboardShopkeeper);

// Get shopkeeper dashboard analytics
// GET /api/shopkeepers/:id/analytics
router.get('/:id/analytics', getShopkeeperAnalytics);

export default router;
