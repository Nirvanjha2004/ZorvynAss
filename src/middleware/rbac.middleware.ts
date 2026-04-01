import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

type Role = 'VIEWER' | 'ANALYST' | 'ADMIN';

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role as Role)) {
      return next(
        AppError.forbidden(
          `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
        )
      );
    }

    next();
  };
}
