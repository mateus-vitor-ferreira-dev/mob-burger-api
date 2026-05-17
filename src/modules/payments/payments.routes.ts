import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { createPaymentIntent } from './payments.controller.js';

const router = Router();

// Recebe orderId e method, retorna clientSecret (card) ou qrCode (pix)
router.post('/intent', asyncHandler(createPaymentIntent));

export default router;
