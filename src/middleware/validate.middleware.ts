import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      _res.status(400).json({
        status: 400,
        error: 'VALIDATION_ERROR',
        message: messages.join('; '),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      _res.status(400).json({
        status: 400,
        error: 'VALIDATION_ERROR',
        message: messages.join('; '),
      });
      return;
    }
    req.query = result.data as Record<string, string>;
    next();
  };
}
