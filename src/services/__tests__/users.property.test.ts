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

// Arbitrary for valid user names (non-empty, printable)
const validName = fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.trim().length > 0);
const validPassword = fc.string({ minLength: 6, maxLength: 30 });
const validRole = fc.constantFrom('VIEWER', 'ANALYST', 'ADMIN');

describe('User management property tests', () => {
  // Feature: finance-backend, Property 1: User creation round trip
  it('Property 1: creating a user and fetching by ID returns matching fields with no password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({ name: validName, password: validPassword, role: validRole }),
        async ({ name, password, role }) => {
          const email = `roundtrip-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
          const adminUser = await createTestUser({ role: 'ADMIN' });
          const adminToken = makeToken(adminUser.id, 'ADMIN');

          const createRes = await request(app)
            .post('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name, email, password, role });

          expect(createRes.status).toBe(201);
          const created = createRes.body.data;

          const fetchRes = await request(app)
            .get(`/users/${created.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

          expect(fetchRes.status).toBe(200);
          const fetched = fetchRes.body.data;

          // Round trip: fields match
          expect(fetched.name).toBe(name);
          expect(fetched.email).toBe(email);
          expect(fetched.role).toBe(role);

          // Property 15: no password in response
          expect(fetched.password).toBeUndefined();
          expect(created.password).toBeUndefined();
        }
      ),
      { numRuns: 10 }
    );
  });

  // Feature: finance-backend, Property 15: Password never exposed
  it('Property 15: user list response never contains password field', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({ name: validName, password: validPassword }), { minLength: 1, maxLength: 5 }),
        async (users) => {
          const adminUser = await createTestUser({ role: 'ADMIN' });
          const adminToken = makeToken(adminUser.id, 'ADMIN');

          for (const u of users) {
            const email = `pw-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
            await request(app)
              .post('/users')
              .set('Authorization', `Bearer ${adminToken}`)
              .send({ name: u.name, email, password: u.password });
          }

          const listRes = await request(app)
            .get('/users')
            .set('Authorization', `Bearer ${adminToken}`);

          expect(listRes.status).toBe(200);
          for (const user of listRes.body.data) {
            expect(user.password).toBeUndefined();
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  // Feature: finance-backend, Property 5: Viewer is read-only
  it('Property 5: Viewer role cannot perform write operations on /users', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({ name: validName, password: validPassword }),
        async ({ name, password }) => {
          const viewerUser = await createTestUser({ role: 'VIEWER' });
          const viewerToken = makeToken(viewerUser.id, 'VIEWER');
          const email = `viewer-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;

          const createRes = await request(app)
            .post('/users')
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({ name, email, password });

          expect(createRes.status).toBe(403);
          expect(createRes.body.error).toBe('FORBIDDEN');
        }
      ),
      { numRuns: 10 }
    );
  });

  // Feature: finance-backend, Property 6: Analyst cannot manage users
  it('Property 6: Analyst role cannot create, update, or delete users', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({ name: validName, password: validPassword }),
        async ({ name, password }) => {
          const analystUser = await createTestUser({ role: 'ANALYST' });
          const analystToken = makeToken(analystUser.id, 'ANALYST');
          const email = `analyst-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;

          const createRes = await request(app)
            .post('/users')
            .set('Authorization', `Bearer ${analystToken}`)
            .send({ name, email, password });

          expect(createRes.status).toBe(403);
          expect(createRes.body.error).toBe('FORBIDDEN');
        }
      ),
      { numRuns: 10 }
    );
  });
});
