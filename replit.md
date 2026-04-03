# Coron Grill Diners — POS System

## Project Overview
Production-ready Next.js 15 Point-of-Sale application for **Coron Grill Diners** restaurant. Migrated from Vercel to Replit with a full PostgreSQL backend, offline-first PWA support, and multi-user login with RBAC.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Replit PostgreSQL (via `pg` pool)
- **Auth**: next-auth v4 (JWT strategy, Credentials provider)
- **Package Manager**: pnpm
- **Port**: 5000, Host: 0.0.0.0

## Architecture

### Database Tables
- **`products`** — 99 seeded menu items with category, price, image, available flag
- **`categories`** — 18 seeded menu categories with display_order
- **`sales`** — order records: items JSON, totals, payment method, server name, `created_by`
- **`users`** — staff accounts with bcrypt-hashed passwords and role (cashier/admin)
- **`shifts`** — shift tracking per cashier

### Data Sync Architecture
- **Single Source of Truth**: All products and categories are stored in PostgreSQL.
- **Product Context** (`product-context.tsx`) fetches from `/api/products` and `/api/categories` on mount. All mutations (add/edit/delete/toggle availability) go through the API and update in-memory state instantly.
- **No localStorage** for products or categories — everything syncs live from the DB.
- Admin changes in Menu Management and in the POS Edit Mode are immediately visible to all cashiers.

### Authentication & RBAC
- Endpoint: `/login` — credentials form (username + password)
- Session: JWT stored in cookie (30-day expiry)
- Middleware (`middleware.ts`) protects all routes except `/login` and `/api/auth/*`
- Roles:
  - **cashier** (`/`) — POS access only. Shift required to start. Cannot access admin panel.
  - **admin** (`/admin`) — Full dashboard: sales, shift reports, menu management, staff list.
  - **admin POS** (`/pos`) — Admin-only POS with Edit Menu toggle and back-to-dashboard button.

### Staff Accounts
| Username | Password | Role |
|---|---|---|
| cashier1 | cashier123 | Cashier |
| cashier2 | cashier123 | Cashier |
| cashier3 | cashier123 | Cashier |
| cashier4 | cashier123 | Cashier |
| admin | admin123 | Admin |

### Key Files
```
app/
  layout.tsx          — Root layout with SessionProvider, PWA meta, ProductProvider, CartProvider
  page.tsx            — Cashier POS (redirects admin to /admin)
  pos/page.tsx        — Admin POS (redirects non-admin to /)
  login/page.tsx      — Login form (next-auth signIn)
  admin/page.tsx      — Admin dashboard (sidebar: Dashboard/Shifts/Menu/Staff + Open POS)
  checkout/page.tsx   — Checkout flow
  providers.tsx       — SessionProvider wrapper
  context/
    cart-context.tsx         — Cart state (Product type includes available field)
    product-context.tsx      — DB-backed product/category state (no localStorage)
  components/
    category-sidebar.tsx  — RBAC: user info, shift info, Settings toggle (admin), logout
    product-grid.tsx      — Filters unavailable products for cashiers; shows all + badges in edit mode
    product-modal.tsx     — Add/Edit product modal (admin POS edit mode) — saves to DB
    thermal-receipt.tsx   — 80mm thermal receipt with QR code

lib/
  auth.ts    — NextAuthOptions (CredentialsProvider + JWT/session callbacks)
  db.ts      — pg Pool connection via DATABASE_URL

middleware.ts   — withAuth() protects routes; admin→/admin from /, cashier→/ from /pos

app/api/
  auth/[...nextauth]/route.ts  — NextAuth handler
  products/route.ts            — GET/POST/PUT/DELETE products (admin only for mutations)
  categories/route.ts          — GET/POST/PUT/DELETE categories (admin only for mutations)
  sales/route.ts               — POST (record sale), GET (daily stats + recent orders)
  shifts/route.ts              — GET shifts by date (admin)
  shifts/current/route.ts      — GET/PATCH current open shift
  users/route.ts               — GET all users (admin only)
```

### Environment Variables
- `DATABASE_URL` — Replit PostgreSQL connection string
- `NEXTAUTH_SECRET` — Random 32-byte hex secret for JWT signing
- `NEXTAUTH_URL` — Base URL of the app (set to Replit dev domain)

## PWA / Offline
- Service Worker (`/sw.js`) registered on first load
- HTML pages: always network-first (never cached, to avoid stale asset version issues)
- Static assets (images, fonts): cache-first
- API calls: network-first with offline JSON fallback
- Failed POST /api/sales → saved to localStorage, synced when back online
- Offline banner: shown when `navigator.onLine === false`

## Receipt Format
- 80mm thermal paper (CSS media query)
- Restaurant: Coron Grill Diners
- Address: Beside Panda House, 1 Don Pedro St, Barangay Poblacion, Coron
- QR code via `api.qrserver.com`
- Footer: "Thank you for dining! Visit us again in Coron!"

## Shift Management System

### Database Table: `shifts`
| Column | Type | Description |
|---|---|---|
| cashier_id | INT | References users.id |
| cashier_name | VARCHAR | Display name |
| cashier_username | VARCHAR | Login username |
| start_time | TIMESTAMP | When shift began |
| end_time | TIMESTAMP | When shift ended (null if open) |
| start_balance | DECIMAL | Cash in drawer at start |
| end_balance | DECIMAL | Cash counted at end |
| total_cash_sales | DECIMAL | Cash sales during shift |
| total_sales | DECIMAL | All sales during shift |
| expected_cash | DECIMAL | start_balance + total_cash_sales |
| discrepancy | DECIMAL | end_balance - expected_cash |
| status | VARCHAR | 'open' or 'closed' |

### API Routes
- `GET /api/shifts/current` — Get logged-in user's open shift for today
- `PATCH /api/shifts/current` — Close current shift (body: `{endBalance}`)
- `POST /api/shifts` — Start a new shift (body: `{startBalance}`)
- `GET /api/shifts?date=YYYY-MM-DD` — Admin: get all shifts for a date

### Key Behaviors
- Cashiers MUST enter starting cash balance when logging in (no open shift → Start Shift modal blocks POS)
- Admins skip the mandatory shift modal
- Close Shift: shows expected vs actual cash, calculates discrepancy (overage/shortage)
- After closing, prints a Shift Summary receipt (printable on XPrinter/thermal)
- Admin Dashboard "Shift History" tab shows all cashier shifts for selected date
- Login redirect: `window.location.href = "/"` (hard redirect, no stale session issue)

## Development Notes
- Next.js dev mode compiles pages lazily on first request
- `next.config.mjs` adds `Cache-Control: no-store` for `/_next/*` in dev to prevent stale asset caching
- Service worker cache name: `cgd-pos-v2` — increment when making breaking SW changes
- bcrypt hash rounds: 10
