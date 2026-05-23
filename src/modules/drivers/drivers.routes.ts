import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listDrivers, createDriver, updateDriver, deleteDriver } from './drivers.controller.js';

const router = Router();

router.get('/', asyncHandler(listDrivers));
router.post('/', asyncHandler(createDriver));
router.put('/:id', asyncHandler(updateDriver));
router.delete('/:id', asyncHandler(deleteDriver));

export default router;
