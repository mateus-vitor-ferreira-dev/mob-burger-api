import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { validateEnv } from './config/env.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { authMiddleware, requireAdmin } from './middlewares/auth.middleware.js';
import { sseHandler } from './modules/orders/orders.sse.js';

import authRoutes from './modules/auth/auth.routes.js';
import menuRoutes from './modules/menu/menu.routes.js';
import ordersRoutes from './modules/orders/orders.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';
import webhookRoutes from './modules/payments/webhook.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import driversRoutes from './modules/drivers/drivers.routes.js';
import couponsRoutes from './modules/coupons/coupons.routes.js';
import expensesRoutes from './modules/expenses/expenses.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import extrasRoutes from './modules/extras/extras.routes.js';

validateEnv();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(morgan('dev'));

// Webhook Stripe precisa do body cru (raw) antes do json parser
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use(globalLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SSE — painel do operador (protegido)
app.get('/api/orders/stream', authMiddleware, sseHandler);

// Rotas públicas
app.use('/api/extras', extrasRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/auth', authRoutes);

// Rotas protegidas — admin
app.use('/api/admin', authMiddleware, requireAdmin, adminRoutes);
app.use('/api/drivers', authMiddleware, requireAdmin, driversRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/expenses', authMiddleware, requireAdmin, expensesRoutes);
app.use('/api/admin/inventory', authMiddleware, requireAdmin, inventoryRoutes);

// 404
app.use((_req, res) => {
  res
    .status(404)
    .json({ error: { message: 'Rota não encontrada.', code: 'NOT_FOUND', status: 404 } });
});

app.use(errorMiddleware);

export default app;
