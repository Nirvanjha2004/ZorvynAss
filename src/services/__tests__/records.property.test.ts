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

const validAmount = fc.float({ min: Math.fround(0.01), max: Math.fround(1_000_000), noNaN: true, noDefaultInfinity: true });
const validType = fc.constantFrom('INCOME', 'EXPENSE');
const validCategory = fc.constantFrom('salary', 'food', 'rent', 'utilities', 'entertainment', 'other');
const validDate = fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
  .map(d => d.toISOString());

const recordPayload = fc.record({
  amount: validAmount,
  type: validType,
  category: validCategory,
  date: validDate,
  notes: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
});

describe('Financial records property tests', () => {
  // Feature: finance-backend, Property 7: Record creation round trip
  it('Property 7: creating a record and fetching by ID returns matching fields', async () => {
    await fc.assert(
      fc.asyncProperty(recordPayload, async (payload) => {
        const analyst = await createTestUser({ role: 'ANALYST' });
        const token = makeToken(analyst.id, 'ANALYST');

        const createRes = await request(app)
          .post('/records')
          .set('Authorization', `Bearer ${token}`)
          .send(payload);

        expect(createRes.status).toBe(201);
        const created = createRes.body.data;

        const fetchRes = await request(app)
          .get(`/records/${created.id}`)
          .set('Authorization', `Bearer ${token}`);

        expect(fetchRes.status).toBe(200);
        const fetched = fetchRes.body.data;

        expect(fetched.amount).toBeCloseTo(payload.amount, 2);
        expect(fetched.type).toBe(payload.type);
        expect(fetched.category).toBe(payload.category);
        // Date round trip: stored date should match input date (same moment)
        expect(new Date(fetched.date).getTime()).toBe(new Date(payload.date).getTime());
      }),
      { numRuns: 15 }
    );
  });

  // Feature: finance-backend, Property 8: Filter correctness
  it('Property 8: all records returned by list satisfy the applied filters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(recordPayload, { minLength: 3, maxLength: 8 }),
        validCategory,
        async (payloads, filterCategory) => {
          const analyst = await createTestUser({ role: 'ANALYST' });
          const token = makeToken(analyst.id, 'ANALYST');

          // Create all records
          for (const p of payloads) {
            await request(app)
              .post('/records')
              .set('Authorization', `Bearer ${token}`)
              .send(p);
          }

          // Filter by category
          const listRes = await request(app)
            .get(`/records?category=${filterCategory}`)
            .set('Authorization', `Bearer ${token}`);

          expect(listRes.status).toBe(200);
          for (const record of listRes.body.data) {
            expect(record.category).toBe(filterCategory);
          }

          // Filter by type
          const typeFilter = 'INCOME';
          const typeRes = await request(app)
            .get(`/records?type=${typeFilter}`)
            .set('Authorization', `Bearer ${token}`);

          expect(typeRes.status).toBe(200);
          for (const record of typeRes.body.data) {
            expect(record.type).toBe(typeFilter);
          }
        }
      ),
      { numRuns: 8 }
    );
  });

  // Feature: finance-backend, Property 9: Soft delete excludes from listing
  it('Property 9: soft-deleted records do not appear in list results', async () => {
    await fc.assert(
      fc.asyncProperty(recordPayload, async (payload) => {
        const analyst = await createTestUser({ role: 'ANALYST' });
        const token = makeToken(analyst.id, 'ANALYST');

        const createRes = await request(app)
          .post('/records')
          .set('Authorization', `Bearer ${token}`)
          .send(payload);

        expect(createRes.status).toBe(201);
        const recordId = createRes.body.data.id;

        const deleteRes = await request(app)
          .delete(`/records/${recordId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(deleteRes.status).toBe(204);

        // Should not appear in list
        const listRes = await request(app)
          .get('/records')
          .set('Authorization', `Bearer ${token}`);

        expect(listRes.status).toBe(200);
        const ids = listRes.body.data.map((r: any) => r.id);
        expect(ids).not.toContain(recordId);

        // Should not appear when fetched directly
        const fetchRes = await request(app)
          .get(`/records/${recordId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(fetchRes.status).toBe(404);
      }),
      { numRuns: 10 }
    );
  });
});
