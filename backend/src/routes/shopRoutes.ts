import { Router } from 'express';
import { getNearbyShops, getShopDetails, nearbyShopsSchema } from '../controllers/shopController';
import { validateRequest } from '../middleware/validate';

const router = Router();

// Discover shops within 2-3km radius
// GET /api/shops/nearby?lat=...&lng=...&radius=...
router.get('/nearby', validateRequest(nearbyShopsSchema), getNearbyShops);

// Get specific store profile details
// GET /api/shops/:id
router.get('/:id', getShopDetails);

export default router;
