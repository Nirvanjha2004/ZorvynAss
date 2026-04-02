# Finance Backend

A RESTful backend API for a finance dashboard with role-based access control, financial record management, and aggregated analytics.

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: SQLite (via Prisma ORM) — swap `DATABASE_URL` for PostgreSQL in production
- **Auth**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Testing**: Vitest + fast-check (property-based testing)

## Setup

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

The server starts on `http://localhost:3000`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite file path or PostgreSQL URL |
| `JWT_SECRET` | *(required)* | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `PORT` | `3000` | HTTP port |

## Roles

| Role | Permissions |
|---|---|
| `VIEWER` | Read records, read dashboard summaries |
| `ANALYST` | Read + create/update/delete records |
| `ADMIN` | Full access including user management |

## API Reference

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | None | Login, returns JWT |

**Login body:**
```json
{ "email": "user@example.com", "password": "secret" }
```

### Users (Admin only)

| Method | Path | Description |
|---|---|---|
| POST | `/users` | Create user |
| GET | `/users` | List users (paginated) |
| GET | `/users/:id` | Get user by ID |
| PATCH | `/users/:id` | Update role or status |

**Create user body:**
```json
{ "name": "Alice", "email": "alice@example.com", "password": "pass123", "role": "ANALYST" }
```

**Update user body:**
```json
{ "role": "ADMIN" }
{ "status": "INACTIVE" }
```

### Financial Records

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/records` | All roles | List records (paginated, filterable) |
| GET | `/records/:id` | All roles | Get record by ID |
| POST | `/records` | ANALYST, ADMIN | Create record |
| PATCH | `/records/:id` | ANALYST, ADMIN | Update record |
| DELETE | `/records/:id` | ANALYST, ADMIN | Soft delete record |

**Query filters for GET /records:**
- `category` — filter by category string
- `type` — `INCOME` or `EXPENSE`
- `dateFrom` — ISO 8601 datetime
- `dateTo` — ISO 8601 datetime
- `page`, `limit` — pagination

**Create record body:**
```json
{
  "amount": 5000.00,
  "type": "INCOME",
  "category": "salary",
  "date": "2024-03-15T10:00:00.000Z",
  "notes": "March salary"
}
```

### Dashboard (All authenticated roles)

| Method | Path | Description |
|---|---|---|
| GET | `/dashboard/summary` | Total income, expenses, net balance |
| GET | `/dashboard/category` | Totals grouped by category |
| GET | `/dashboard/trends?period=monthly` | Trends by `monthly` or `weekly` |
| GET | `/dashboard/recent?limit=10` | Most recent records |

## Error Response Format

All errors return a consistent JSON shape:

```json
{
  "status": 400,
  "error": "VALIDATION_ERROR",
  "message": "amount: Amount must be a positive number"
}
```

Error types: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`

## Running Tests

```bash
npm test
```

Tests use a separate `test.db` SQLite file. The test suite includes:
- 6 integration smoke tests
- 15 property-based tests (fast-check, 8–30 iterations each) covering:
  - Auth: inactive user blocking, invalid credentials, unauthenticated access
  - Users: creation round trip, password never exposed, role enforcement
  - Records: creation round trip, filter correctness, soft delete
  - Dashboard: summary totals, category totals, ordering
  - Errors: consistent error shape, missing field validation

## Assumptions

1. SQLite is used for simplicity; the Prisma schema works with PostgreSQL by changing `provider = "postgresql"` and updating `DATABASE_URL`.
2. Enums (Role, Status, RecordType) are stored as strings in SQLite and validated at the application layer via Zod.
3. Passwords are hashed with bcrypt (10 rounds) and never returned in any API response.
4. Soft delete sets `deletedAt` timestamp; deleted records are excluded from all queries but remain in the database.
5. The first admin user must be seeded directly into the database (no public registration endpoint, by design).
