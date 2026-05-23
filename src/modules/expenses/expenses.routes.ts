import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from './expenses.controller.js';

const router = Router();

router.get('/', asyncHandler(listExpenses));
router.post('/', asyncHandler(createExpense));
router.put('/:id', asyncHandler(updateExpense));
router.delete('/:id', asyncHandler(deleteExpense));

export default router;
