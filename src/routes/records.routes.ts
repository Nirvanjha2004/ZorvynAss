import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  createRecordController,
  listRecordsController,
  getRecordController,
  updateRecordController,
  deleteRecordController,
} from '../controllers/records.controller';

const router = Router();

router.use(authMiddleware);

// All authenticated roles can read
router.get('/', requireRole('VIEWER', 'ANALYST', 'ADMIN'), listRecordsController);
router.get('/:id', requireRole('VIEWER', 'ANALYST', 'ADMIN'), getRecordController);

// Only ANALYST and ADMIN can write
router.post('/', requireRole('ANALYST', 'ADMIN'), createRecordController);
router.patch('/:id', requireRole('ANALYST', 'ADMIN'), updateRecordController);
router.delete('/:id', requireRole('ANALYST', 'ADMIN'), deleteRecordController);

export default router;
