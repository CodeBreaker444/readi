import { Response, Router } from 'express';
import { authenticate, AuthRequest } from '../../backend/src/middleware/auth';
import { getDashboardData } from '../../backend/src/services/dashboard';
import { validateDashboardRequest } from '../../backend/src/validators/dashboard';
const router = Router();

 
router.post(
  '/:ownerId/dashboard/data',
  authenticate,
  validateDashboardRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const { ownerId } = req.params;
      
      const dashboardData = await getDashboardData({
        owner_id: parseInt(ownerId),
        user_id: req.userId!,
        user_timezone: req.body?.user_timezone || 'UTC',
        user_profile_code: req.body?.user_profile_code || '',
      });

      res.json({
        code: 1,
        status: 'SUCCESS',
        message: 'Dashboard data retrieved successfully',
        data: dashboardData,
      });
    } catch (error: any) {
      res.status(500).json({
        code: 0,
        status: 'ERROR',
        message: error.message || 'Internal server error',
      });
    }
  }
);

export default router;