import type { Request, Response } from 'express';
import * as adminService from './admin.service.js';
import { success } from '../../utils/apiResponse.js';
import { HTTP } from '../../constants/httpStatus.js';
import type {
  CategoryInput,
  ProductInput,
  ProductOptionInput,
  OptionItemInput,
  DeliveryZoneInput,
  StoreConfigInput,
} from './admin.schema.js';

// ─── Categorias ───────────────────────────────────────────────────────────────

export async function listCategories(_req: Request, res: Response) {
  return success(res, await adminService.listCategoriesService());
}

export async function createCategory(req: Request, res: Response) {
  return success(
    res,
    await adminService.createCategoryService(req.body as CategoryInput),
    HTTP.CREATED,
  );
}

export async function updateCategory(req: Request, res: Response) {
  return success(
    res,
    await adminService.updateCategoryService(req.params.id, req.body as CategoryInput),
  );
}

export async function deleteCategory(req: Request, res: Response) {
  await adminService.deleteCategoryService(req.params.id);
  return res.status(HTTP.NO_CONTENT).send();
}

// ─── Produtos ─────────────────────────────────────────────────────────────────

export async function listProducts(_req: Request, res: Response) {
  return success(res, await adminService.listProductsService());
}

export async function createProduct(req: Request, res: Response) {
  return success(
    res,
    await adminService.createProductService(req.body as ProductInput),
    HTTP.CREATED,
  );
}

export async function updateProduct(req: Request, res: Response) {
  return success(
    res,
    await adminService.updateProductService(req.params.id, req.body as ProductInput),
  );
}

export async function deleteProduct(req: Request, res: Response) {
  await adminService.deleteProductService(req.params.id);
  return res.status(HTTP.NO_CONTENT).send();
}

export async function toggleProduct(req: Request, res: Response) {
  return success(res, await adminService.toggleProductService(req.params.id));
}

// ─── Opções de personalização ─────────────────────────────────────────────────

export async function listProductOptions(req: Request, res: Response) {
  return success(res, await adminService.listProductOptionsService(req.params.productId as string));
}

export async function createProductOption(req: Request, res: Response) {
  return success(
    res,
    await adminService.createProductOptionService(
      req.params.productId,
      req.body as ProductOptionInput,
    ),
    HTTP.CREATED,
  );
}

export async function updateProductOption(req: Request, res: Response) {
  return success(
    res,
    await adminService.updateProductOptionService(
      req.params.optionId,
      req.body as ProductOptionInput,
    ),
  );
}

export async function deleteProductOption(req: Request, res: Response) {
  await adminService.deleteProductOptionService(req.params.optionId);
  return res.status(HTTP.NO_CONTENT).send();
}

// ─── Itens de opção ───────────────────────────────────────────────────────────

export async function createOptionItem(req: Request, res: Response) {
  return success(
    res,
    await adminService.createOptionItemService(req.params.optionId, req.body as OptionItemInput),
    HTTP.CREATED,
  );
}

export async function updateOptionItem(req: Request, res: Response) {
  return success(
    res,
    await adminService.updateOptionItemService(req.params.itemId, req.body as OptionItemInput),
  );
}

export async function deleteOptionItem(req: Request, res: Response) {
  await adminService.deleteOptionItemService(req.params.itemId);
  return res.status(HTTP.NO_CONTENT).send();
}

// ─── Zonas de entrega ─────────────────────────────────────────────────────────

export async function listDeliveryZones(_req: Request, res: Response) {
  return success(res, await adminService.listDeliveryZonesService());
}

export async function upsertDeliveryZone(req: Request, res: Response) {
  return success(
    res,
    await adminService.upsertDeliveryZoneService(req.body as DeliveryZoneInput),
    HTTP.CREATED,
  );
}

export async function deleteDeliveryZone(req: Request, res: Response) {
  await adminService.deleteDeliveryZoneService(req.params.id as string);
  return success(res, null, HTTP.NO_CONTENT);
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getStats(req: Request, res: Response) {
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to   = req.query.to   ? new Date(req.query.to   as string) : undefined;
  return success(res, await adminService.getStatsService(from, to));
}

// ─── Config da loja ───────────────────────────────────────────────────────────

export async function getStoreConfig(_req: Request, res: Response) {
  return success(res, await adminService.getStoreConfigService());
}

export async function updateStoreConfig(req: Request, res: Response) {
  return success(res, await adminService.updateStoreConfigService(req.body as StoreConfigInput));
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export async function listStaff(_req: Request, res: Response) {
  return success(res, await adminService.listStaffService());
}

export async function createStaff(req: Request, res: Response) {
  const { email, password, role } = req.body as { email: string; password: string; role: 'ADMIN' | 'ATTENDANT' };
  return success(res, await adminService.createStaffService(email, password, role ?? 'ATTENDANT'), HTTP.CREATED);
}

export async function deleteStaff(req: Request, res: Response) {
  await adminService.deleteStaffService(req.params.id as string, req.user!.id);
  return success(res, null, HTTP.NO_CONTENT);
}
