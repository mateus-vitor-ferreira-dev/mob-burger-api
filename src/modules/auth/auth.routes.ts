import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middlewares/validate.js';

const authSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: { message: 'Muitas tentativas. Aguarde 15 minutos.', code: 'TOO_MANY_REQUESTS' } },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: { message: 'Muitas tentativas de login. Aguarde 15 minutos.', code: 'TOO_MANY_REQUESTS' } },
  standardHeaders: true,
  legacyHeaders: false,
});
import {
  loginSchema,
  customerRegisterSchema,
  customerLoginSchema,
  googleAuthSchema,
  refreshTokenSchema,
} from './auth.schema.js';
import {
  login,
  customerRegister,
  customerLogin,
  googleAuth,
  refreshToken,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
} from './auth.controller.js';
import { authMiddleware, requireCustomer } from '../../middlewares/auth.middleware.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Auth — Staff
 *     description: Autenticação de administradores e atendentes
 *   - name: Auth — Cliente
 *     description: Autenticação de clientes do site
 */

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth — Staff]
 *     summary: Login de staff (admin/atendente)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@mobburger.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: senha123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Tokens'
 *                 - type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         email: { type: string }
 *                         role: { type: string, enum: [ADMIN, ATTENDANT] }
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(login));

/**
 * @openapi
 * /api/auth/customer/register:
 *   post:
 *     tags: [Auth — Cliente]
 *     summary: Cadastro de novo cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, password]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@email.com
 *               phone:
 *                 type: string
 *                 example: "11999999999"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: senha123
 *     responses:
 *       201:
 *         description: Conta criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Tokens'
 *                 - type: object
 *                   properties:
 *                     customer:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         name: { type: string }
 *                         email: { type: string }
 *       409:
 *         description: E-mail já cadastrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/customer/register', authSensitiveLimiter, validate(customerRegisterSchema), asyncHandler(customerRegister));

/**
 * @openapi
 * /api/auth/customer/login:
 *   post:
 *     tags: [Auth — Cliente]
 *     summary: Login de cliente por email e senha
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@email.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: senha123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Tokens'
 *                 - type: object
 *                   properties:
 *                     customer:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         name: { type: string }
 *                         email: { type: string }
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/customer/login', loginLimiter, validate(customerLoginSchema), asyncHandler(customerLogin));

/**
 * @openapi
 * /api/auth/google:
 *   post:
 *     tags: [Auth — Cliente]
 *     summary: Login ou cadastro via Google
 *     description: O frontend envia o idToken obtido pelo Google Sign-In. O backend valida e cria/encontra o cliente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: ID Token retornado pelo Google Sign-In no frontend
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6...
 *     responses:
 *       200:
 *         description: Login via Google realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Tokens'
 *                 - type: object
 *                   properties:
 *                     customer:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         name: { type: string }
 *                         email: { type: string }
 *       401:
 *         description: Token Google inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/google', loginLimiter, validate(googleAuthSchema), asyncHandler(googleAuth));

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth — Staff, Auth — Cliente]
 *     summary: Renovar access token
 *     description: Válido para staff e clientes. Envia o refreshToken e recebe um novo par de tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Tokens renovados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tokens'
 *       401:
 *         description: Refresh token inválido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', validate(refreshTokenSchema), asyncHandler(refreshToken));

router.get('/customer/me', authMiddleware, requireCustomer, asyncHandler(getMe));
router.patch('/customer/me', authMiddleware, requireCustomer, asyncHandler(updateMe));
router.patch('/customer/password', authMiddleware, requireCustomer, asyncHandler(changePassword));

router.post('/forgot-password', authSensitiveLimiter, asyncHandler(forgotPassword));
router.post('/reset-password', authSensitiveLimiter, asyncHandler(resetPassword));

export default router;
