# EaseMyLease

Multi-tenant SaaS for rental businesses (garments, jewellery, costumes, and more).

## Current status — Phase 5 (QR, notifications, billing foundation, branches, analytics)

Monorepo with:

- `frontend/` — React + Vite + TypeScript + Tailwind + TanStack Query + React Router
- `backend/` — NestJS + Prisma + PostgreSQL + JWT + RBAC + PDFKit receipts + `@nestjs/schedule`

**Phase 1:** Auth, multi-tenant foundation, Shop/User models  
**Phase 2:** Shop settings, categories, inventory CRUD, customers  
**Phase 3:** Rentals workflow, availability/double-booking checks, returns + damage, payments  
**Phase 4:** Shop dashboard KPIs, reports, damage settlement UI, PDF receipts, WhatsApp share (`wa.me`)  
**Phase 5:** QR/barcode lookup + scan UI, email rental reminders + receipt summary, subscription plan fields (manual SUPER_ADMIN assignment), multi-branch shops + shop switcher, advanced analytics tabs  

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (local or Supabase)

### Environment

Copy examples and fill in values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Phase 5 env flags (backend):

- `ENABLE_RENTAL_REMINDERS=true` — daily Cron at 08:00 for due/overdue emails (default on when unset)
- SMTP vars — same as OTP; if unset in dev, reminder/receipt emails are logged to the server console

### Database migrate

With PostgreSQL running and `DATABASE_URL` / `DIRECT_URL` set in `backend/.env`:

```bash
cd backend
npx prisma migrate deploy
# or during local development:
npx prisma migrate dev
```

Migrations include Phase 5:

- `backend/prisma/migrations/20261003143000_phase5_qr_notifications_billing_branches/`

### Phase 5 APIs (tenant-scoped via JWT unless noted)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/inventory/by-code/:itemCode` | OWNER, STAFF | Tenant-scoped item lookup by code |
| GET | `/api/inventory/resolve/:itemCode` | OWNER, STAFF | Lookup + rental/return suggestion |
| POST | `/api/shops` | OWNER | Create additional branch/shop |
| GET | `/api/tenants/me` | OWNER, STAFF | Tenant + plan + usage / soft-limit warning |
| GET | `/api/tenants` | SUPER_ADMIN | List all tenants |
| PATCH | `/api/tenants/:id/subscription` | SUPER_ADMIN | Manual plan/status assignment |
| POST | `/api/rentals/:id/send-reminder` | OWNER, STAFF | Manual due/overdue reminder email + wa.me stub |
| POST | `/api/notifications/run-reminders` | OWNER | Trigger reminder job manually |
| GET | `/api/reports/revenue-trend` | OWNER, STAFF | Revenue by day/week (`granularity`) |
| GET | `/api/reports/top-items` | OWNER, STAFF | Top rented items |
| GET | `/api/reports/top-categories` | OWNER, STAFF | Top categories |
| GET | `/api/reports/customers` | OWNER, STAFF | Repeat rate + top customers |
| GET | `/api/reports/overdue-aging` | OWNER, STAFF | Overdue aging buckets |

Optional `shopId` on inventory/customer/rental create + list filters. Existing rows backfilled to the tenant’s first shop.

**Deferred / future:** WhatsApp Cloud API (wa.me only), payment gateway checkout, hard inventory blocking, Elasticsearch.

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

ACTIVE rentals past `expectedReturnDate` are marked `OVERDUE` when listing/getting rentals or loading the dashboard; Phase 5 Cron also marks overdue before daily reminders.

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
| POST | `/api/shops` | OWNER | Create shop/branch |
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
| POST | `/api/auth/register` | Create Tenant + SHOP_OWNER User + Shop (OTP required) |
| POST | `/api/auth/login` | Login, returns JWT (may require OTP) |
| GET | `/api/auth/me` | Current user (Bearer token) |
| POST | `/api/auth/send-otp` | Send email OTP |
| POST | `/api/auth/verify-login-otp` | Complete OTP login |
| POST | `/api/auth/reset-password` | Reset password with OTP |

### Rental workflow (statuses)

`DRAFT` → `CONFIRMED` (items RESERVED) → `ACTIVE` (items ON_RENT) → optional `OVERDUE` when past expected return → `RETURN_PENDING` or `COMPLETED` after return inspection → optional `CANCELLED` from DRAFT/CONFIRMED. Holding statuses for availability: CONFIRMED, ACTIVE, RETURN_PENDING, OVERDUE.
