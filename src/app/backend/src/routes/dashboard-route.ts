import { Router } from 'express';
import dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/owner/:ownerId/dashboard/data
 * @desc    Get dashboard data for a specific owner
 * @access  Private (requires JWT token and API key)
 */
router.post(
  '/:ownerId/dashboard/data',
  authenticate,
  validate(dashboardDataSchema),
  dashboardController.getDashboardData
);

export default router;