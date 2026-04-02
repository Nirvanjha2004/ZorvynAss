import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { summaryController, categoryController, trendsController, recentController } from '../controllers/dashboard.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('VIEWER', 'ANALYST', 'ADMIN'));

router.get('/summary', summaryController);
router.get('/category', categoryController);
router.get('/trends', trendsController);
router.get('/recent', recentController);

export default router;
