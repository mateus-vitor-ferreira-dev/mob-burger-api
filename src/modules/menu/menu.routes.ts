import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getMenu, getProduct } from './menu.controller.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Menu
 *     description: Cardápio público — sem autenticação
 */

/**
 * @openapi
 * /api/menu:
 *   get:
 *     tags: [Menu]
 *     summary: Listar cardápio completo
 *     description: Retorna todas as categorias ativas com seus produtos ativos e opções de personalização.
 *     responses:
 *       200:
 *         description: Cardápio agrupado por categoria
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: cmp123
 *                   name: Burgers
 *                   slug: burgers
 *                   position: 1
 *                   products:
 *                     - id: cmp456
 *                       name: Classic Burger
 *                       price: 32.90
 *                       options:
 *                         - label: Ponto da carne
 *                           type: RADIO
 *                           required: true
 *                           items:
 *                             - name: Mal passado
 *                               additionalPrice: 0
 */
router.get('/', asyncHandler(getMenu));

/**
 * @openapi
 * /api/menu/product/{id}:
 *   get:
 *     tags: [Menu]
 *     summary: Detalhes de um produto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID do produto
 *     responses:
 *       200:
 *         description: Produto com categoria e opções
 *       404:
 *         description: Produto não encontrado ou inativo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/product/:id', asyncHandler(getProduct));

export default router;
