import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middlewares/validate.js';
import { loginSchema } from './auth.schema.js';
import { login, refreshToken } from './auth.controller.js';

const router = Router();

router.post('/login', validate(loginSchema), asyncHandler(login));
router.post('/refresh', asyncHandler(refreshToken));

export default router;
