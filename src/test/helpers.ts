import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Single shared test prisma client
export const testDb = new PrismaClient({
  datasources: { db: { url: 'file:./test.db' } },
});

export async function setupTestDb(): Promise<void> {
  // Push schema to test DB
  execSync('npx prisma db push --force-reset --skip-generate', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'pipe',
  });
}

export async function clearDb(): Promise<void> {
  await testDb.financialRecord.deleteMany();
  await testDb.user.deleteMany();
}

export async function createTestUser(overrides: {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  status?: string;
} = {}) {
  const password = overrides.password ?? 'password123';
  const hashed = await bcrypt.hash(password, 10);
  return testDb.user.create({
    data: {
      name: overrides.name ?? 'Test User',
      email: overrides.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      password: hashed,
      role: overrides.role ?? 'VIEWER',
      status: overrides.status ?? 'ACTIVE',
    },
  });
}

export function makeToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET ?? 'finance-backend-test-secret',
    { expiresIn: '1h' }
  );
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
