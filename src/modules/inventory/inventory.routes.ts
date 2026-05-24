import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  handleListIngredients,
  handleCreateIngredient,
  handleUpdateIngredient,
  handleDeleteIngredient,
  handleGetProductIngredients,
  handleSetProductIngredients,
} from './inventory.controller.js';

const router = Router();

router.get('/ingredients', asyncHandler(handleListIngredients));
router.post('/ingredients', asyncHandler(handleCreateIngredient));
router.put('/ingredients/:id', asyncHandler(handleUpdateIngredient));
router.delete('/ingredients/:id', asyncHandler(handleDeleteIngredient));

router.get('/products/:productId/ingredients', asyncHandler(handleGetProductIngredients));
router.put('/products/:productId/ingredients', asyncHandler(handleSetProductIngredients));

export default router;
