import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listExtras } from './extras.controller.js';

const router = Router();

router.get('/', asyncHandler(listExtras));

export default router;
