import bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../errors/AppError';
import { CreateUserInput, UpdateUserInput } from '../schemas/user.schema';

export type SafeUser = Omit<User, 'password'>;

function omitPassword(user: User): SafeUser {
  const { password: _pw, ...safe } = user;
  return safe;
}

export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict('A user with that email already exists');
  }

  const hashed = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashed,
      role: input.role,
    },
  });

  return omitPassword(user);
}

export async function listUsers(page = 1, limit = 20): Promise<{ data: SafeUser[]; meta: { page: number; limit: number; total: number } }> {
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    prisma.user.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.user.count(),
  ]);

  return {
    data: users.map(omitPassword),
    meta: { page, limit, total },
  };
}

export async function getUserById(id: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw AppError.notFound('User not found');
  return omitPassword(user);
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('User not found');

  const user = await prisma.user.update({
    where: { id },
    data: input,
  });

  return omitPassword(user);
}
