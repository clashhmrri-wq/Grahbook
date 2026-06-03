import { Router } from 'express';
import { loginOrRegisterCustomer, loginCustomerSchema } from '../controllers/customerController';
import { validateRequest } from '../middleware/validate';

const router = Router();

// Login or register a customer using Indian phone number
// POST /api/customers/login
router.post('/login', validateRequest(loginCustomerSchema), loginOrRegisterCustomer);

export default router;
