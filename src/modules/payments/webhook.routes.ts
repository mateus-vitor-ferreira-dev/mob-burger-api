import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { handlePagarmeWebhook } from './webhook.controller.js';

const router = Router();

router.post('/', asyncHandler(handlePagarmeWebhook));

export default router;
