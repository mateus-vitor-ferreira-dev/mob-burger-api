import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authMiddleware, requireAdmin } from '../../middlewares/auth.middleware.js';
import { validateCoupon, listCoupons, createCoupon, updateCoupon, deleteCoupon } from './coupons.controller.js';

const router = Router();

// Validação pública (requer auth de cliente para checar maxUsesPerUser)
router.post('/validate', authMiddleware, asyncHandler(validateCoupon));

// Admin CRUD
router.get('/', authMiddleware, requireAdmin, asyncHandler(listCoupons));
router.post('/', authMiddleware, requireAdmin, asyncHandler(createCoupon));
router.put('/:id', authMiddleware, requireAdmin, asyncHandler(updateCoupon));
router.delete('/:id', authMiddleware, requireAdmin, asyncHandler(deleteCoupon));

export default router;
