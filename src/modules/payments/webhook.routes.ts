import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { handleStripeWebhook } from './webhook.controller.js';

const router = Router();

router.post('/', asyncHandler(handleStripeWebhook));

export default router;
