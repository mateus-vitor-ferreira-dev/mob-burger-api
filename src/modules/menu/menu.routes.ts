import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getMenu, getProduct } from './menu.controller.js';

const router = Router();

router.get('/', asyncHandler(getMenu));
router.get('/product/:id', asyncHandler(getProduct));

export default router;
