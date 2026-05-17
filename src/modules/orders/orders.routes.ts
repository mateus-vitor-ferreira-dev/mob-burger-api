import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.js';
import { createOrderSchema, updateStatusSchema } from './orders.schema.js';
import { createOrder, getOrder, updateOrderStatus, listOrders } from './orders.controller.js';

const router = Router();

// Público — cliente cria pedido e acompanha
router.post('/', validate(createOrderSchema), asyncHandler(createOrder));
router.get('/:id', asyncHandler(getOrder));

// Protegido — operador gerencia pedidos
router.get('/', authMiddleware, asyncHandler(listOrders));
router.patch('/:id/status', authMiddleware, validate(updateStatusSchema), asyncHandler(updateOrderStatus));

export default router;
