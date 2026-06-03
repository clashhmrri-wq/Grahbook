import { Router } from 'express';
import { onboardShopkeeper, onboardShopkeeperSchema } from '../controllers/shopkeeperController';
import { validateRequest } from '../middleware/validate';

const router = Router();

// Onboard shopkeeper endpoint
// POST /api/shopkeepers/onboard
router.post('/onboard', validateRequest(onboardShopkeeperSchema), onboardShopkeeper);

export default router;
