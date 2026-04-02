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

const validAmount = fc.float({ min: Math.fround(0.01), max: Math.fround(10_000), noNaN: true, noDefaultInfinity: true })
  .map(n => Math.round(n * 100) / 100);
const validCategory = fc.constantFrom('salary', 'food', 'rent', 'utilities', 'entertainment');
const validDate = fc.date({ min: new Date('2023-01-01'), max: new Date('2024-12-31') })
  .map(d => d.toISOString());

interface RecordInput {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: string;
}

async function seedRecords(token: string, records: RecordInput[]) {
  for (const r of records) {
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${token}`)
      .send(r);
    if (res.status !== 201) throw new Error(`Failed to create record: ${JSON.stringify(res.body)}`);
  }
}

describe('Dashboard property tests', () => {
  // Feature: finance-backend, Property 10: Summary totals correctness
  it('Property 10: summary totals match manual computation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            amount: validAmount,
            type: fc.constantFrom('INCOME' as const, 'EXPENSE' as const),
            category: validCategory,
            date: validDate,
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (records) => {
          // Clear DB before each run to avoid accumulation across iterations
          await clearDb();

          const analyst = await createTestUser({ role: 'ANALYST' });
          const token = makeToken(analyst.id, 'ANALYST');

          await seedRecords(token, records);

          const expectedIncome = records
            .filter(r => r.type === 'INCOME')
            .reduce((sum, r) => sum + r.amount, 0);
          const expectedExpenses = records
            .filter(r => r.type === 'EXPENSE')
            .reduce((sum, r) => sum + r.amount, 0);
          const expectedNet = expectedIncome - expectedExpenses;

          const res = await request(app)
            .get('/dashboard/summary')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          const { total_income, total_expenses, net_balance } = res.body.data;

          expect(total_income).toBeCloseTo(expectedIncome, 1);
          expect(total_expenses).toBeCloseTo(expectedExpenses, 1);
          expect(net_balance).toBeCloseTo(expectedNet, 1);
        }
      ),
      { numRuns: 10 }
    );
  });

  // Feature: finance-backend, Property 11: Category totals correctness
  it('Property 11: category totals match sum of records per category', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            amount: validAmount,
            type: fc.constantFrom('INCOME' as const, 'EXPENSE' as const),
            category: validCategory,
            date: validDate,
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (records) => {
          // Clear DB before each run to avoid accumulation across iterations
          await clearDb();

          const analyst = await createTestUser({ role: 'ANALYST' });
          const token = makeToken(analyst.id, 'ANALYST');

          await seedRecords(token, records);

          // Compute expected per-category totals
          const expected = new Map<string, number>();
          for (const r of records) {
            expected.set(r.category, (expected.get(r.category) ?? 0) + r.amount);
          }

          const res = await request(app)
            .get('/dashboard/category')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          const categoryData: { category: string; total: number }[] = res.body.data;

          for (const [cat, expectedTotal] of expected.entries()) {
            const found = categoryData.find(c => c.category === cat);
            expect(found).toBeDefined();
            expect(found!.total).toBeCloseTo(expectedTotal, 1);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  // Feature: finance-backend, Property 12: Recent activity ordering
  it('Property 12: recent activity is sorted by date descending', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            amount: validAmount,
            type: fc.constantFrom('INCOME' as const, 'EXPENSE' as const),
            category: validCategory,
            date: validDate,
          }),
          { minLength: 2, maxLength: 8 }
        ),
        async (records) => {
          const analyst = await createTestUser({ role: 'ANALYST' });
          const token = makeToken(analyst.id, 'ANALYST');

          await seedRecords(token, records);

          const res = await request(app)
            .get('/dashboard/recent')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          const data: { date: string }[] = res.body.data;

          // Verify descending order
          for (let i = 0; i < data.length - 1; i++) {
            const current = new Date(data[i].date).getTime();
            const next = new Date(data[i + 1].date).getTime();
            expect(current).toBeGreaterThanOrEqual(next);
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
