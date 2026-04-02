# Implementation Plan: Finance Backend

## Overview

Incremental implementation of the finance backend API. Each task builds on the previous, ending with a fully wired system. Tests are placed close to the implementation they validate.

## Tasks

- [x] 1. Project setup and core infrastructure
  - Initialize a Node.js + TypeScript project with Express
  - Install dependencies: express, prisma, @prisma/client, jsonwebtoken, bcrypt, zod, fast-check, vitest, supertest and their type definitions
  - Configure `tsconfig.json`, `prisma/schema.prisma` with User and FinancialRecord models (enums: Role, Status, RecordType)
  - Create `src/errors/AppError.ts` with statusCode and type fields
  - Create `src/middleware/error.middleware.ts` global error handler that formats all errors as `{ status, error, message }` and suppresses stack traces
  - Set up Vitest config (`vitest.config.ts`) with a test database URL
  - _Requirements: 6.4, 6.5, 7.1_

- [x] 2. Authentication
  - [x] 2.1 Implement auth service and route
    - Create `src/schemas/auth.schema.ts` (Zod: email, password required)
    - Create `src/services/auth.service.ts`: `login(email, password)` — fetch user by email, verify bcrypt hash, check ACTIVE status, return signed JWT
    - Create `src/controllers/auth.controller.ts` and `src/routes/auth.routes.ts` (POST /auth/login)
    - Create `src/middleware/auth.middleware.ts`: verify JWT, attach `req.user`, return 401 on missing/invalid token
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Write property tests for authentication
    - **Property 2: Inactive user blocks login** — generate a user, set status INACTIVE, attempt login, expect 401
    - **Property 3: Invalid credentials return 401** — generate random wrong passwords, expect 401
    - **Property 4: Unauthenticated requests are rejected** — call protected endpoints without token, expect 401
    - **Validates: Requirements 1.5, 2.2, 2.3**

- [x] 3. User management
  - [x] 3.1 Implement user service and routes
    - Create `src/schemas/user.schema.ts` (Zod: name, email, password, role for create; role, status for update)
    - Create `src/services/users.service.ts`: `createUser`, `listUsers` (paginated), `updateUser`; hash password with bcrypt on create; never return password field
    - Create `src/controllers/users.controller.ts` and `src/routes/users.routes.ts` (POST /users, GET /users, PATCH /users/:id)
    - Create `src/middleware/rbac.middleware.ts`: `requireRole(...roles)` factory that checks `req.user.role` and returns 403 if not permitted
    - Apply `requireRole('ADMIN')` to all /users write routes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 7.3_

  - [x] 3.2 Write property tests for user management
    - **Property 1: User creation round trip** — create user, fetch by ID, verify fields match and no password in response
    - **Property 15: Password never exposed** — verify no API response for users contains a password field
    - **Property 5: Viewer is read-only** — send write requests as VIEWER, expect 403
    - **Property 6: Analyst cannot manage users** — send user management requests as ANALYST, expect 403
    - **Validates: Requirements 1.1, 1.6, 5.1, 5.2, 7.3**

- [x] 4. Financial records
  - [x] 4.1 Implement records service and routes
    - Create `src/schemas/record.schema.ts` (Zod: amount positive number, type enum, category string, date ISO string, notes optional; filter params: dateFrom, dateTo, category, type)
    - Create `src/services/records.service.ts`: `createRecord`, `listRecords` (paginated, filter by date/category/type, exclude soft-deleted), `updateRecord`, `softDeleteRecord` (set deletedAt)
    - Create `src/controllers/records.controller.ts` and `src/routes/records.routes.ts`
    - Apply `requireRole('ANALYST', 'ADMIN')` to POST/PATCH/DELETE; all roles can GET
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 6.2, 6.3, 7.2_

  - [x] 4.2 Write property tests for financial records
    - **Property 7: Record creation round trip** — create record, fetch by ID, verify fields match
    - **Property 8: Filter correctness** — generate records with varied fields, apply filters, verify all results satisfy filter criteria
    - **Property 9: Soft delete excludes from listing** — create record, delete it, list records, verify it is absent
    - **Validates: Requirements 3.1, 3.3, 3.5**

- [x] 5. Checkpoint — Ensure all tests pass
  - Run `vitest --run` and confirm all passing tests so far
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Dashboard summary APIs
  - [x] 6.1 Implement dashboard service and routes
    - Create `src/services/dashboard.service.ts`:
      - `getSummary()`: sum INCOME records → total_income, sum EXPENSE records → total_expenses, compute net_balance
      - `getCategorySummary()`: group non-deleted records by category, sum amounts per group
      - `getTrends(period: 'monthly' | 'weekly')`: group non-deleted records by truncated date period, sum per group
      - `getRecentActivity(limit: number)`: fetch non-deleted records ordered by date DESC
    - Create `src/controllers/dashboard.controller.ts` and `src/routes/dashboard.routes.ts`
    - Apply `requireRole('VIEWER', 'ANALYST', 'ADMIN')` (all authenticated roles) to all dashboard routes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.2 Write property tests for dashboard
    - **Property 10: Summary totals correctness** — create records with known amounts, call summary, verify totals match manual computation
    - **Property 11: Category totals correctness** — create records across categories, verify each category total matches sum of its records
    - **Property 12: Recent activity ordering** — create records with varied dates, verify response is sorted date DESC
    - **Validates: Requirements 4.1, 4.2, 4.4**

- [x] 7. Validation and error handling
  - [x] 7.1 Wire Zod validation into all routes
    - Create `src/middleware/validate.middleware.ts`: parse request body against a Zod schema, return 400 with field-level error messages on failure
    - Apply validate middleware to all POST and PATCH routes
    - Ensure negative amounts and invalid date strings are rejected with 400
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 7.2 Write property tests for validation and error structure
    - **Property 13: Error response structure invariant** — trigger various error conditions (400, 401, 403, 404, 409), verify all responses contain status, error, message fields
    - **Property 14: Missing required fields return 400** — generate payloads with random required fields omitted, verify 400 response names the missing fields
    - **Validates: Requirements 6.1, 6.5**

- [x] 8. Wire everything together
  - [x] 8.1 Create main app entry point
    - Create `src/app.ts`: register all routers, apply auth middleware globally to protected routes, apply error middleware last
    - Create `src/server.ts`: start Express server on configured port
    - Ensure all routes are mounted: /auth, /users, /records, /dashboard
    - _Requirements: all_

  - [x] 8.2 Write integration smoke tests
    - Test a full flow: register admin → login → create record → list records → get summary
    - Verify role enforcement end-to-end: viewer cannot create records
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Run `vitest --run` and confirm all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with minimum 100 iterations
- Test comments must include: `// Feature: finance-backend, Property N: <property text>`
- A test PostgreSQL database (or SQLite via Prisma) is used for all tests; each suite resets relevant tables before running
