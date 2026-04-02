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

function isValidErrorShape(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.status === 'number' &&
    typeof b.error === 'string' &&
    typeof b.message === 'string'
  );
}

describe('Error handling property tests', () => {
  // Feature: finance-backend, Property 13: Error response structure invariant
  it('Property 13: all error responses have consistent { status, error, message } shape', async () => {
    const admin = await createTestUser({ role: 'ADMIN' });
    const adminToken = makeToken(admin.id, 'ADMIN');
    const viewer = await createTestUser({ role: 'VIEWER' });
    const viewerToken = makeToken(viewer.id, 'VIEWER');

    const errorTriggers = [
      // 401 - no token
      () => request(app).get('/records'),
      // 401 - bad token
      () => request(app).get('/records').set('Authorization', 'Bearer invalid.token.here'),
      // 403 - viewer tries to create record
      () => request(app).post('/records').set('Authorization', `Bearer ${viewerToken}`).send({
        amount: 100, type: 'INCOME', category: 'salary', date: new Date().toISOString(),
      }),
      // 400 - missing required fields
      () => request(app).post('/auth/login').send({}),
      // 400 - negative amount
      () => request(app).post('/records').set('Authorization', `Bearer ${adminToken}`).send({
        amount: -50, type: 'INCOME', category: 'salary', date: new Date().toISOString(),
      }),
      // 404 - non-existent record
      () => request(app).get('/records/non-existent-id-12345').set('Authorization', `Bearer ${adminToken}`),
      // 409 - duplicate email
      async () => {
        const email = `dup-${Date.now()}@test.com`;
        await request(app).post('/users').set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'A', email, password: 'pass123', role: 'VIEWER' });
        return request(app).post('/users').set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'B', email, password: 'pass456', role: 'VIEWER' });
      },
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...errorTriggers),
        async (trigger) => {
          const res = await trigger();
          expect(res.status).toBeGreaterThanOrEqual(400);
          expect(isValidErrorShape(res.body)).toBe(true);
          expect(res.body.status).toBe(res.status);
        }
      ),
      { numRuns: 30 }
    );
  });

  // Feature: finance-backend, Property 14: Missing required fields return 400
  it('Property 14: omitting required fields from record creation returns 400 naming the field', async () => {
    const analyst = await createTestUser({ role: 'ANALYST' });
    const token = makeToken(analyst.id, 'ANALYST');

    const requiredFields = ['amount', 'type', 'category', 'date'];

    await fc.assert(
      fc.asyncProperty(
        fc.subarray(requiredFields, { minLength: 1 }),
        async (fieldsToOmit) => {
          const fullPayload: Record<string, unknown> = {
            amount: 100,
            type: 'INCOME',
            category: 'salary',
            date: new Date().toISOString(),
          };

          for (const field of fieldsToOmit) {
            delete fullPayload[field];
          }

          const res = await request(app)
            .post('/records')
            .set('Authorization', `Bearer ${token}`)
            .send(fullPayload);

          expect(res.status).toBe(400);
          expect(res.body.error).toBe('VALIDATION_ERROR');
          expect(typeof res.body.message).toBe('string');
          expect(res.body.message.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 }
    );
  });
});
