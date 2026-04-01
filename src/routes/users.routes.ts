import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  createUserController,
  listUsersController,
  getUserController,
  updateUserController,
} from '../controllers/users.controller';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// Only admins can create or modify users
router.post('/', requireRole('ADMIN'), createUserController);
router.get('/', requireRole('ADMIN'), listUsersController);
router.get('/:id', requireRole('ADMIN'), getUserController);
router.patch('/:id', requireRole('ADMIN'), updateUserController);

export default router;
