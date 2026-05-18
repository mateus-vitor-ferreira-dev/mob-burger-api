import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authMiddleware, requireCustomer } from '../../middlewares/auth.middleware.js';
import { createPaymentIntent } from './payments.controller.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Pagamentos
 *     description: Criação de intenções de pagamento via Stripe
 */

/**
 * @openapi
 * /api/payments/intent:
 *   post:
 *     tags: [Pagamentos]
 *     summary: Iniciar pagamento de um pedido
 *     description: |
 *       Comportamento por método de pagamento:
 *       - **PIX**: cria e confirma o PaymentIntent, retorna `qrCode` e `qrCodeImage`
 *       - **CARD**: retorna `clientSecret` para o Stripe Elements no frontend confirmar
 *       - **CASH_ON_DELIVERY / CARD_ON_DELIVERY**: confirma o pedido direto (sem Stripe)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: ID do pedido a ser pago
 *                 example: cmpbhkzk50005d0isujdnypy1
 *     responses:
 *       200:
 *         description: Dados de pagamento retornados conforme o método
 *         content:
 *           application/json:
 *             examples:
 *               pix:
 *                 summary: PIX
 *                 value:
 *                   success: true
 *                   data:
 *                     method: PIX
 *                     clientSecret: pi_xxx_secret_xxx
 *                     qrCode: "00020126580014br.gov.bcb.pix..."
 *                     qrCodeImage: "https://qr.stripe.com/..."
 *                     expiresAt: 1716069600
 *               card:
 *                 summary: Cartão
 *                 value:
 *                   success: true
 *                   data:
 *                     method: CARD
 *                     clientSecret: pi_xxx_secret_xxx
 *               cash:
 *                 summary: Pagamento na entrega
 *                 value:
 *                   success: true
 *                   data:
 *                     method: CASH_ON_DELIVERY
 *                     message: Pedido confirmado. Pagamento será realizado na entrega.
 *       403:
 *         description: Pedido pertence a outro cliente
 *       404:
 *         description: Pedido não encontrado
 *       409:
 *         description: Pedido já foi pago
 */
router.post('/intent', authMiddleware, requireCustomer, asyncHandler(createPaymentIntent));

export default router;
