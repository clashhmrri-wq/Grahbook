import { Router } from 'express';
import {
  createOrder,
  createOrderSchema,
  getShopkeeperOrders,
  getCustomerOrders,
  updateOrderStatus,
  updateStatusSchema,
  completeOrder,
  completeOrderSchema,
} from '../controllers/orderController';
import { validateRequest } from '../middleware/validate';

const router = Router();

// Create a new order
// POST /api/orders
router.post('/', validateRequest(createOrderSchema), createOrder);

// Get orders for shopkeeper
// GET /api/orders/shopkeeper?shopkeeperId=XYZ&status=RECEIVED
router.get('/shopkeeper', getShopkeeperOrders);

// Get orders for customer
// GET /api/orders/customer?customerId=XYZ
router.get('/customer', getCustomerOrders);

// Update order status (ACCEPTED, PREPARING, READY, CANCELLED)
// PATCH /api/orders/:id/status
router.patch('/:id/status', validateRequest(updateStatusSchema), updateOrderStatus);

// Settle / complete order via 4-digit handoff OTP verification
// POST /api/orders/:id/complete
router.post('/:id/complete', validateRequest(completeOrderSchema), completeOrder);

export default router;
