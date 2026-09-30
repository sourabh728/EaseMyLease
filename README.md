# EaseMyLease

Multi-tenant SaaS for rental businesses (garments, jewellery, costumes, and more).

## Current status — Phase 4 (Dashboard & reports)

Monorepo with:

- `frontend/` — React + Vite + TypeScript + Tailwind + TanStack Query + React Router
- `backend/` — NestJS + Prisma + PostgreSQL + JWT + RBAC + PDFKit receipts

**Phase 1:** Auth, multi-tenant foundation, Shop/User models  
**Phase 2:** Shop settings, categories, inventory CRUD, customers  
**Phase 3:** Rentals workflow, availability/double-booking checks, returns + damage, payments  
**Phase 4:** Shop dashboard KPIs, reports, damage settlement UI, PDF receipts, WhatsApp share (`wa.me`)  
**Phase 5+ (not started):** QR/barcode scanning, automated notifications, subscription/billing, multi-branch, advanced analytics

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
npx prisma migrate deploy
# or during local development:
npx prisma migrate dev
```

If Postgres is unreachable, migration SQL still lives under `backend/prisma/migrations/` — run `migrate deploy` once the DB is up.

Migrations:

- `backend/prisma/migrations/20260930050000_init_tenant_user_shop/`
- `backend/prisma/migrations/20260930060000_phase2_inventory_categories_customers/`
- `backend/prisma/migrations/20260930070000_phase3_rentals_returns_payments/`
- `backend/prisma/migrations/20260930110000_phase4_damage_settlement/`

### Phase 4 APIs (tenant-scoped via JWT)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/reports/dashboard` | OWNER, STAFF | Today KPIs + recent activity (marks OVERDUE on read) |
| GET | `/api/reports/revenue` | OWNER, STAFF | Revenue by date range (`fromDate`, `toDate`) |
| GET | `/api/reports/rentals` | OWNER, STAFF | Rentals summary by status / period |
| GET | `/api/reports/inventory` | OWNER, STAFF | Inventory status + utilization |
| GET | `/api/reports/outstanding` | OWNER, STAFF | Pending balances + open damage charges |
| GET | `/api/rentals/:id/receipt` | OWNER, STAFF | PDF rental receipt download |
| GET | `/api/damage-records` | OWNER, STAFF | List/filter damage (`settlementStatus`, search, pagination) |
| PATCH | `/api/damage-records/:id` | OWNER, STAFF | Update charge / settlement status (`OPEN`/`SETTLED`/`WAIVED`) |

ACTIVE rentals past `expectedReturnDate` are marked `OVERDUE` when listing/getting rentals or loading the dashboard (no cron).

### Phase 3 APIs (tenant-scoped via JWT)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/api/rentals/availability` | OWNER, STAFF | Check item availability for date range |
| GET/POST | `/api/rentals` | OWNER, STAFF | List (filters+pagination) / create draft |
| GET/PATCH | `/api/rentals/:id` | OWNER, STAFF | Get / update draft |
| POST | `/api/rentals/:id/confirm` | OWNER, STAFF | Confirm booking (reserve items) |
| POST | `/api/rentals/:id/release` | OWNER, STAFF | Release items (ON_RENT, ACTIVE) |
| POST | `/api/rentals/:id/cancel` | OWNER, STAFF | Cancel DRAFT/CONFIRMED |
| GET/POST | `/api/returns` | OWNER, STAFF | List / process return + inspection |
| GET | `/api/returns/:id` | OWNER, STAFF | Return detail |
| GET/POST | `/api/damage-records` | OWNER, STAFF | List / create damage records |
| PATCH | `/api/damage-records/:id` | OWNER, STAFF | Update damage record |
| GET/POST | `/api/payments` | OWNER, STAFF | List / record payment |
| GET | `/api/payments/:id` | OWNER, STAFF | Payment detail |

### Phase 2 APIs (tenant-scoped via JWT)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/shops` | OWNER, STAFF | List shops |
| GET | `/api/shops/:id` | OWNER, STAFF | Get shop |
| PATCH | `/api/shops/:id` | OWNER | Update shop profile/settings |
| GET/POST | `/api/categories` | GET: OWNER/STAFF · POST: OWNER | List / create categories |
| GET/PATCH/DELETE | `/api/categories/:id` | GET: OWNER/STAFF · mutate: OWNER | Category detail / update / soft-disable |
| GET/POST | `/api/inventory` | OWNER, STAFF | List (filters+pagination) / create |
| GET/PATCH | `/api/inventory/:id` | OWNER, STAFF | Get / update item |
| DELETE | `/api/inventory/:id` | OWNER | Retire item (status=RETIRED) |
| GET/POST | `/api/customers` | OWNER, STAFF | List (search+pagination) / create |
| GET/PATCH | `/api/customers/:id` | OWNER, STAFF | Get / update |
| DELETE | `/api/customers/:id` | OWNER | Delete customer |

### Run backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
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

### Rental workflow (statuses)

`DRAFT` → `CONFIRMED` (items RESERVED) → `ACTIVE` (items ON_RENT) → optional `OVERDUE` when past expected return → `RETURN_PENDING` or `COMPLETED` after return inspection → optional `CANCELLED` from DRAFT/CONFIRMED. Holding statuses for availability: CONFIRMED, ACTIVE, RETURN_PENDING, OVERDUE.
