import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middlewares/validate.js';
import {
  categorySchema,
  productSchema,
  productOptionSchema,
  optionItemSchema,
  deliveryZoneSchema,
  storeConfigSchema,
  globalExtraSchema,
  comboConfigSchema,
  productPriceSchema,
} from './admin.schema.js';
import {
  getStats,
  getDailyRevenue,
  getTopProducts,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProduct,
  reorderProducts,
  listProductOptions,
  createProductOption,
  updateProductOption,
  deleteProductOption,
  createOptionItem,
  updateOptionItem,
  deleteOptionItem,
  listDeliveryZones,
  upsertDeliveryZone,
  deleteDeliveryZone,
  getStoreConfig,
  updateStoreConfig,
  listStaff,
  createStaff,
  deleteStaff,
  listAllExtras,
  createExtra,
  updateExtra,
  deleteExtra,
  toggleExtra,
  setComboConfig,
  patchProductPrice,
} from './admin.controller.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Admin — Categorias
 *     description: Gestão de categorias do cardápio (requer admin)
 *   - name: Admin — Produtos
 *     description: Gestão de produtos do cardápio (requer admin)
 *   - name: Admin — Personalizações
 *     description: Gestão de opções e itens de personalização (requer admin)
 *   - name: Admin — Entrega
 *     description: Zonas de entrega e taxas (requer admin)
 *   - name: Admin — Configuração
 *     description: Configurações gerais da loja (requer admin)
 */

// ─── Stats ───────────────────────────────────────────────────────────────────

router.get('/stats', asyncHandler(getStats));
router.get('/stats/daily', asyncHandler(getDailyRevenue));
router.get('/stats/top-products', asyncHandler(getTopProducts));

// ─── Categorias ───────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/admin/categories:
 *   get:
 *     tags: [Admin — Categorias]
 *     summary: Listar todas as categorias (incluindo inativas)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de categorias
 *   post:
 *     tags: [Admin — Categorias]
 *     summary: Criar categoria
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name: { type: string, example: Burgers }
 *               slug: { type: string, example: burgers }
 *               position: { type: integer, example: 1 }
 *               active: { type: boolean, example: true }
 *     responses:
 *       201:
 *         description: Categoria criada
 *       409:
 *         description: Slug já existe
 */
router.get('/categories', asyncHandler(listCategories));
router.post('/categories', validate(categorySchema), asyncHandler(createCategory));
router.patch('/categories/reorder', asyncHandler(reorderCategories));

/**
 * @openapi
 * /api/admin/categories/{id}:
 *   put:
 *     tags: [Admin — Categorias]
 *     summary: Atualizar categoria
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
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               position: { type: integer }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Categoria atualizada
 *       404:
 *         description: Categoria não encontrada
 *   delete:
 *     tags: [Admin — Categorias]
 *     summary: Excluir categoria (somente se não tiver produtos)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Categoria excluída
 *       409:
 *         description: Categoria possui produtos
 */
router.put('/categories/:id', validate(categorySchema), asyncHandler(updateCategory));
router.delete('/categories/:id', asyncHandler(deleteCategory));

// ─── Produtos ─────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/admin/products:
 *   get:
 *     tags: [Admin — Produtos]
 *     summary: Listar todos os produtos (incluindo inativos)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de produtos com categoria
 *   post:
 *     tags: [Admin — Produtos]
 *     summary: Criar produto
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, name, price]
 *             properties:
 *               categoryId: { type: string }
 *               name: { type: string, example: Classic Burger }
 *               description: { type: string }
 *               price: { type: number, example: 32.90 }
 *               imageUrl: { type: string, format: uri }
 *               active: { type: boolean, example: true }
 *     responses:
 *       201:
 *         description: Produto criado
 */
router.get('/products', asyncHandler(listProducts));
router.post('/products', validate(productSchema), asyncHandler(createProduct));

/**
 * @openapi
 * /api/admin/products/{id}:
 *   put:
 *     tags: [Admin — Produtos]
 *     summary: Atualizar produto
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
 *             properties:
 *               name: { type: string }
 *               price: { type: number }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Produto atualizado
 *       404:
 *         description: Produto não encontrado
 *   delete:
 *     tags: [Admin — Produtos]
 *     summary: Excluir produto
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Produto excluído
 */
router.put('/products/:id', validate(productSchema), asyncHandler(updateProduct));
router.delete('/products/:id', asyncHandler(deleteProduct));

/**
 * @openapi
 * /api/admin/products/{id}/toggle:
 *   patch:
 *     tags: [Admin — Produtos]
 *     summary: Ativar ou desativar produto
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Status do produto alterado
 */
router.patch('/products/:id/toggle', asyncHandler(toggleProduct));
router.patch('/products/:id/price', validate(productPriceSchema), asyncHandler(patchProductPrice));
router.patch('/products/reorder', asyncHandler(reorderProducts));

// ─── Opções de personalização ─────────────────────────────────────────────────

/**
 * @openapi
 * /api/admin/products/{productId}/options:
 *   post:
 *     tags: [Admin — Personalizações]
 *     summary: Adicionar grupo de opções a um produto
 *     description: Ex — "Ponto da carne" (RADIO, obrigatório) ou "Adicionais" (CHECKBOX)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [label, type]
 *             properties:
 *               label: { type: string, example: Ponto da carne }
 *               type: { type: string, enum: [RADIO, CHECKBOX] }
 *               required: { type: boolean, example: true }
 *     responses:
 *       201:
 *         description: Grupo de opções criado
 */
router.get('/products/:productId/options', asyncHandler(listProductOptions));
router.post(
  '/products/:productId/options',
  validate(productOptionSchema),
  asyncHandler(createProductOption),
);

/**
 * @openapi
 * /api/admin/products/{productId}/options/{optionId}:
 *   put:
 *     tags: [Admin — Personalizações]
 *     summary: Atualizar grupo de opções
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label: { type: string }
 *               type: { type: string, enum: [RADIO, CHECKBOX] }
 *               required: { type: boolean }
 *     responses:
 *       200:
 *         description: Grupo atualizado
 *   delete:
 *     tags: [Admin — Personalizações]
 *     summary: Excluir grupo de opções (e todos seus itens)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Grupo excluído
 */
router.put(
  '/products/:productId/options/:optionId',
  validate(productOptionSchema),
  asyncHandler(updateProductOption),
);
router.delete('/products/:productId/options/:optionId', asyncHandler(deleteProductOption));

/**
 * @openapi
 * /api/admin/products/{productId}/options/{optionId}/items:
 *   post:
 *     tags: [Admin — Personalizações]
 *     summary: Adicionar item a um grupo de opções
 *     description: Ex — "Mal passado" (sem custo extra) ou "Queijo extra" (+R$3,00)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: Mal passado }
 *               additionalPrice: { type: number, example: 0 }
 *     responses:
 *       201:
 *         description: Item criado
 */
router.post(
  '/products/:productId/options/:optionId/items',
  validate(optionItemSchema),
  asyncHandler(createOptionItem),
);

/**
 * @openapi
 * /api/admin/products/{productId}/options/{optionId}/items/{itemId}:
 *   put:
 *     tags: [Admin — Personalizações]
 *     summary: Atualizar item de opção
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               additionalPrice: { type: number }
 *     responses:
 *       200:
 *         description: Item atualizado
 *   delete:
 *     tags: [Admin — Personalizações]
 *     summary: Excluir item de opção
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: optionId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Item excluído
 */
router.put(
  '/products/:productId/options/:optionId/items/:itemId',
  validate(optionItemSchema),
  asyncHandler(updateOptionItem),
);
router.delete(
  '/products/:productId/options/:optionId/items/:itemId',
  asyncHandler(deleteOptionItem),
);

// ─── Zonas de entrega ─────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/admin/delivery-zones:
 *   get:
 *     tags: [Admin — Entrega]
 *     summary: Listar zonas de entrega
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de bairros com taxa
 *   post:
 *     tags: [Admin — Entrega]
 *     summary: Criar ou atualizar zona de entrega
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, fee]
 *             properties:
 *               name: { type: string, example: Centro }
 *               fee: { type: number, example: 5.00 }
 *               active: { type: boolean, example: true }
 *     responses:
 *       201:
 *         description: Zona criada ou atualizada
 */
router.get('/delivery-zones', asyncHandler(listDeliveryZones));
router.post('/delivery-zones', validate(deliveryZoneSchema), asyncHandler(upsertDeliveryZone));
router.delete('/delivery-zones/:id', asyncHandler(deleteDeliveryZone));

// ─── Config da loja ───────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/admin/config:
 *   get:
 *     tags: [Admin — Configuração]
 *     summary: Obter configurações da loja
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Configurações atuais
 *   put:
 *     tags: [Admin — Configuração]
 *     summary: Atualizar configurações da loja
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isOpen, openingHours]
 *             properties:
 *               isOpen: { type: boolean }
 *               openingHours:
 *                 type: object
 *                 example:
 *                   seg: { open: "11:00", close: "22:00", closed: false }
 *                   dom: { open: "11:00", close: "20:00", closed: false }
 *               whatsappNumber: { type: string, example: "5511999999999" }
 *     responses:
 *       200:
 *         description: Configurações atualizadas
 */
router.get('/config', asyncHandler(getStoreConfig));
router.put('/config', validate(storeConfigSchema), asyncHandler(updateStoreConfig));

// ─── Staff ────────────────────────────────────────────────────────────────────
router.get('/staff', asyncHandler(listStaff));
router.post('/staff', asyncHandler(createStaff));
router.delete('/staff/:id', asyncHandler(deleteStaff));

// ─── Adicionais globais ───────────────────────────────────────────────────────
router.get('/extras', asyncHandler(listAllExtras));
router.post('/extras', validate(globalExtraSchema), asyncHandler(createExtra));
router.put('/extras/:id', validate(globalExtraSchema), asyncHandler(updateExtra));
router.delete('/extras/:id', asyncHandler(deleteExtra));
router.patch('/extras/:id/toggle', asyncHandler(toggleExtra));

// ─── Combo config ─────────────────────────────────────────────────────────────
router.post('/products/:id/combo-config', validate(comboConfigSchema), asyncHandler(setComboConfig));

export default router;
