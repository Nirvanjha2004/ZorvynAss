import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AppError } from '../errors/AppError';

export interface TokenPayload {
  userId: string;
  role: string;
}

export async function login(email: string, password: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw AppError.unauthorized('Invalid email or password');
  }

  if (user.status === 'INACTIVE') {
    throw AppError.unauthorized('Account is inactive');
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const secret = process.env.JWT_SECRET ?? 'fallback-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d';

  const token = jwt.sign(
    { userId: user.id, role: user.role } as TokenPayload,
    secret,
    { expiresIn } as jwt.SignOptions
  );

  return token;
}
