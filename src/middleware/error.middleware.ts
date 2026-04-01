import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    res.status(400).json({
      status: 400,
      error: 'VALIDATION_ERROR',
      message: messages.join('; '),
    });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: err.statusCode,
      error: err.type,
      message: err.message,
    });
    return;
  }

  // Prisma unique constraint violation
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        status: 409,
        error: 'CONFLICT',
        message: 'A record with that value already exists',
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        status: 404,
        error: 'NOT_FOUND',
        message: 'Resource not found',
      });
      return;
    }
  }

  // Unknown errors — never expose internals
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    status: 500,
    error: 'INTERNAL_ERROR',
    message: isDev && err instanceof Error ? err.message : 'An unexpected error occurred',
  });
}
