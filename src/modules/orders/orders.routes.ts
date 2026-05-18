import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authMiddleware, requireCustomer, requireStaff } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.js';
import { createOrderSchema, updateStatusSchema } from './orders.schema.js';
import { createOrder, getOrder, myOrders, listOrders, updateOrderStatus } from './orders.controller.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Pedidos — Cliente
 *     description: Criação e acompanhamento de pedidos pelo cliente
 *   - name: Pedidos — Operador
 *     description: Gestão de pedidos pelo atendente/caixa
 */

/**
 * @openapi
 * /api/orders:
 *   post:
 *     tags: [Pedidos — Cliente]
 *     summary: Criar pedido
 *     description: Requer cliente autenticado com telefone cadastrado. O `customerId` é extraído do token JWT.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, paymentMethod, items]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [DELIVERY, PICKUP]
 *               paymentMethod:
 *                 type: string
 *                 enum: [PIX, CARD, CASH_ON_DELIVERY, CARD_ON_DELIVERY]
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: integer, minimum: 1 }
 *                     observations: { type: string }
 *                     options:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           optionItemId: { type: string }
 *               delivery:
 *                 type: object
 *                 description: Obrigatório quando type = DELIVERY
 *                 properties:
 *                   street: { type: string }
 *                   number: { type: string }
 *                   neighborhood: { type: string }
 *                   complement: { type: string }
 *                   zoneId: { type: string }
 *     responses:
 *       201:
 *         description: Pedido criado com sucesso
 *       400:
 *         description: Produto indisponível ou dados inválidos
 *       422:
 *         description: Loja fechada ou telefone não cadastrado
 */
router.post('/', authMiddleware, requireCustomer, validate(createOrderSchema), asyncHandler(createOrder));

/**
 * @openapi
 * /api/orders/my:
 *   get:
 *     tags: [Pedidos — Cliente]
 *     summary: Meus pedidos
 *     description: Retorna todos os pedidos do cliente autenticado, do mais recente ao mais antigo.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de pedidos do cliente
 */
router.get('/my', authMiddleware, requireCustomer, asyncHandler(myOrders));

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     tags: [Pedidos — Cliente]
 *     summary: Acompanhar pedido por ID (tracking público)
 *     description: Público — qualquer pessoa com o ID do pedido pode acompanhar o status.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Detalhes do pedido com status atual
 *       404:
 *         description: Pedido não encontrado
 */
router.get('/:id', asyncHandler(getOrder));

/**
 * @openapi
 * /api/orders:
 *   get:
 *     tags: [Pedidos — Operador]
 *     summary: Listar todos os pedidos
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [AWAITING_PAYMENT, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, PICKED_UP, CANCELLED]
 *         description: Filtrar por status
 *     responses:
 *       200:
 *         description: Lista de pedidos
 */
router.get('/', authMiddleware, requireStaff, asyncHandler(listOrders));

/**
 * @openapi
 * /api/orders/{id}/status:
 *   patch:
 *     tags: [Pedidos — Operador]
 *     summary: Atualizar status do pedido
 *     description: |
 *       Transições válidas:
 *       - AWAITING_PAYMENT → CONFIRMED, CANCELLED
 *       - CONFIRMED → PREPARING, CANCELLED
 *       - PREPARING → READY, CANCELLED
 *       - READY → OUT_FOR_DELIVERY, PICKED_UP, CANCELLED
 *       - OUT_FOR_DELIVERY → DELIVERED, CANCELLED
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, PICKED_UP, CANCELLED]
 *     responses:
 *       200:
 *         description: Status atualizado e evento SSE disparado
 *       422:
 *         description: Transição de status inválida
 */
router.patch('/:id/status', authMiddleware, requireStaff, validate(updateStatusSchema), asyncHandler(updateOrderStatus));

export default router;
