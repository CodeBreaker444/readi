import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

const dashboardDataSchema = z.object({
  owner_id: z.string(),
  user_id: z.string(),
  user_timezone: z.string().optional().default('UTC'),
  user_profile_code: z.string().optional(),
});

export function validateDashboardRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    dashboardDataSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        code: 0,
        status: 'ERROR',
        message: 'Validation failed',
        errors: error.errors,
      });
      return;
    }
    next(error);
  }
}