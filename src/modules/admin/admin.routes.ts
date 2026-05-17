import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middlewares/validate.js';
import {
  createProduct, updateProduct, deleteProduct, toggleProduct,
  createCategory, listDeliveryZones, upsertDeliveryZone,
  getStoreConfig, updateStoreConfig,
} from './admin.controller.js';
import { productSchema, categorySchema, deliveryZoneSchema, storeConfigSchema } from './admin.schema.js';

const router = Router();

// Produtos
router.post('/products', validate(productSchema), asyncHandler(createProduct));
router.put('/products/:id', validate(productSchema), asyncHandler(updateProduct));
router.delete('/products/:id', asyncHandler(deleteProduct));
router.patch('/products/:id/toggle', asyncHandler(toggleProduct));

// Categorias
router.post('/categories', validate(categorySchema), asyncHandler(createCategory));

// Zonas de entrega
router.get('/delivery-zones', asyncHandler(listDeliveryZones));
router.post('/delivery-zones', validate(deliveryZoneSchema), asyncHandler(upsertDeliveryZone));

// Configurações da loja
router.get('/config', asyncHandler(getStoreConfig));
router.put('/config', validate(storeConfigSchema), asyncHandler(updateStoreConfig));

export default router;
