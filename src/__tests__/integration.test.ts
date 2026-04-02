import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { setupTestDb, clearDb, createTestUser, makeToken } from '../test/helpers';

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearDb();
});

describe('Integration smoke tests', () => {
  it('full flow: admin creates user → user logs in → creates record → lists records → gets summary', async () => {
    // 1. Create an admin user directly in DB
    const admin = await createTestUser({ role: 'ADMIN', email: 'admin@test.com', password: 'adminpass' });
    const adminToken = makeToken(admin.id, 'ADMIN');

    // 2. Admin creates an analyst user
    const analystEmail = 'analyst@test.com';
    const createUserRes = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Analyst User', email: analystEmail, password: 'analystpass', role: 'ANALYST' });

    expect(createUserRes.status).toBe(201);
    expect(createUserRes.body.data.role).toBe('ANALYST');
    expect(createUserRes.body.data.password).toBeUndefined();

    // 3. Analyst logs in
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: analystEmail, password: 'analystpass' });

    expect(loginRes.status).toBe(200);
    const analystToken = loginRes.body.data.token;
    expect(typeof analystToken).toBe('string');

    // 4. Analyst creates a financial record
    const recordDate = new Date('2024-03-15T10:00:00.000Z').toISOString();
    const createRecordRes = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ amount: 5000, type: 'INCOME', category: 'salary', date: recordDate });

    expect(createRecordRes.status).toBe(201);
    const recordId = createRecordRes.body.data.id;

    // 5. List records
    const listRes = await request(app)
      .get('/records')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
    expect(listRes.body.data.some((r: any) => r.id === recordId)).toBe(true);

    // 6. Get dashboard summary
    const summaryRes = await request(app)
      .get('/dashboard/summary')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.total_income).toBeCloseTo(5000, 1);
    expect(summaryRes.body.data.total_expenses).toBeCloseTo(0, 1);
    expect(summaryRes.body.data.net_balance).toBeCloseTo(5000, 1);
  });

  it('role enforcement: viewer cannot create records', async () => {
    const viewer = await createTestUser({ role: 'VIEWER' });
    const viewerToken = makeToken(viewer.id, 'VIEWER');

    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ amount: 100, type: 'INCOME', category: 'salary', date: new Date().toISOString() });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('role enforcement: viewer can read records and dashboard', async () => {
    const analyst = await createTestUser({ role: 'ANALYST' });
    const analystToken = makeToken(analyst.id, 'ANALYST');
    await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ amount: 200, type: 'EXPENSE', category: 'food', date: new Date().toISOString() });

    const viewer = await createTestUser({ role: 'VIEWER' });
    const viewerToken = makeToken(viewer.id, 'VIEWER');

    const listRes = await request(app).get('/records').set('Authorization', `Bearer ${viewerToken}`);
    expect(listRes.status).toBe(200);

    const summaryRes = await request(app).get('/dashboard/summary').set('Authorization', `Bearer ${viewerToken}`);
    expect(summaryRes.status).toBe(200);
  });

  it('soft delete: deleted record disappears from list', async () => {
    const analyst = await createTestUser({ role: 'ANALYST' });
    const token = makeToken(analyst.id, 'ANALYST');

    const createRes = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 300, type: 'INCOME', category: 'other', date: new Date().toISOString() });

    const id = createRes.body.data.id;

    await request(app).delete(`/records/${id}`).set('Authorization', `Bearer ${token}`);

    const listRes = await request(app).get('/records').set('Authorization', `Bearer ${token}`);
    expect(listRes.body.data.some((r: any) => r.id === id)).toBe(false);
  });

  it('inactive user cannot login', async () => {
    const email = 'inactive@test.com';
    await createTestUser({ email, password: 'pass123', status: 'INACTIVE' });

    const res = await request(app).post('/auth/login').send({ email, password: 'pass123' });
    expect(res.status).toBe(401);
  });

  it('duplicate email returns 409', async () => {
    const admin = await createTestUser({ role: 'ADMIN' });
    const token = makeToken(admin.id, 'ADMIN');
    const email = 'dup@test.com';

    await request(app).post('/users').set('Authorization', `Bearer ${token}`)
      .send({ name: 'First', email, password: 'pass123' });

    const res = await request(app).post('/users').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Second', email, password: 'pass456' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CONFLICT');
  });
});
