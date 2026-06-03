import { Router } from 'express';
import {
  createProduct,
  getShopkeeperProducts,
  updateProduct,
  deleteProduct,
  createProductSchema,
  updateProductSchema,
} from '../controllers/productController';
import { validateRequest } from '../middleware/validate';

const router = Router();

// Add a product to shopkeeper store
router.post('/', validateRequest(createProductSchema), createProduct);

// Get all products of a shopkeeper
router.get('/', getShopkeeperProducts);

// Update product stock/price
router.put('/:id', validateRequest(updateProductSchema), updateProduct);

// Delete product
router.delete('/:id', deleteProduct);

export default router;
