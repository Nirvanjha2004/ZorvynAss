import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import request from 'supertest';
import app from '../../app';
import { setupTestDb, clearDb, createTestUser, makeToken } from '../../test/helpers';

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearDb();
});

describe('Auth property tests', () => {
  // Feature: finance-backend, Property 2: Inactive user blocks login
  it('Property 2: inactive user cannot login with correct credentials', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          password: fc.string({ minLength: 6, maxLength: 30 }).filter(s => !s.includes('@')),
        }),
        async ({ name, password }) => {
          const email = `inactive-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
          await createTestUser({ name, email, password, status: 'INACTIVE' });

          const res = await request(app)
            .post('/auth/login')
            .send({ email, password });

          expect(res.status).toBe(401);
          expect(res.body.error).toBe('UNAUTHORIZED');
        }
      ),
      { numRuns: 10 }
    );
  });

  // Feature: finance-backend, Property 3: Invalid credentials return 401
  it('Property 3: wrong password always returns 401', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 6, maxLength: 20 }).filter(s => s !== 'correctpassword'),
        async (wrongPassword) => {
          const email = `creds-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
          await createTestUser({ email, password: 'correctpassword' });

          const res = await request(app)
            .post('/auth/login')
            .send({ email, password: wrongPassword });

          expect(res.status).toBe(401);
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: finance-backend, Property 4: Unauthenticated requests are rejected
  it('Property 4: protected endpoints reject requests without a token', async () => {
    const protectedEndpoints = [
      { method: 'get', path: '/users' },
      { method: 'get', path: '/records' },
      { method: 'get', path: '/dashboard/summary' },
      { method: 'get', path: '/dashboard/category' },
      { method: 'get', path: '/dashboard/recent' },
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...protectedEndpoints),
        async (endpoint) => {
          const res = await (request(app) as any)[endpoint.method](endpoint.path);
          expect(res.status).toBe(401);
        }
      ),
      { numRuns: 20 }
    );
  });
});
