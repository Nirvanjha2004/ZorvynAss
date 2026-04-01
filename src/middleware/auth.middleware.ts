import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError';
import { TokenPayload } from '../services/auth.service';

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('No token provided'));
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET ?? 'fallback-secret';

  try {
    const payload = jwt.verify(token, secret) as TokenPayload;
    req.user = payload;
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired token'));
  }
}
