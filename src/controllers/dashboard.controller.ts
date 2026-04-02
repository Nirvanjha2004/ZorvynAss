import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSummary, getCategorySummary, getTrends, getRecentActivity } from '../services/dashboard.service';

export async function summaryController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSummary();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function categoryController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getCategorySummary();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function trendsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { period } = z.object({
      period: z.enum(['monthly', 'weekly']).default('monthly'),
    }).parse(req.query);
    const data = await getTrends(period);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function recentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { limit } = z.object({
      limit: z.coerce.number().int().positive().max(100).default(10),
    }).parse(req.query);
    const data = await getRecentActivity(limit);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
