# EaseMyLease

Multi-tenant SaaS for rental businesses (garments, jewellery, costumes, and more).

## Phase 1 — Foundation (current)

Monorepo with:

- `frontend/` — React + Vite + TypeScript + Tailwind + TanStack Query + React Router
- `backend/` — NestJS + Prisma + PostgreSQL + JWT + RBAC

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (local or Supabase)

### Environment

Copy examples and fill in values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Database migrate

With PostgreSQL running and `DATABASE_URL` / `DIRECT_URL` set in `backend/.env`:

```bash
cd backend
npx prisma migrate dev
```

If the database is not available yet, migration SQL is already present at:

`backend/prisma/migrations/20260930050000_init_tenant_user_shop/migration.sql`

Apply later with `npx prisma migrate deploy` or `npx prisma migrate dev`.

### Run backend

```bash
cd backend
npm install
npx prisma generate
npm run start:dev
```

API base: `http://localhost:3000/api`

### Run frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

### Auth APIs

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create Tenant + SHOP_OWNER User + Shop |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user (Bearer token) |
