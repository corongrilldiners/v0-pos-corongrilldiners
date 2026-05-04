# Coron Grill Diners — POS System

## Project Overview
Production-ready Next.js 15 Point-of-Sale application for **Coron Grill Diners** restaurant.
- **Dev environment**: Replit (port 5000)
- **Production**: Vercel (`https://v0-pos-corongrilldiners.vercel.app`)
- **Database**: Supabase PostgreSQL (`public` schema)

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase PostgreSQL via `pg` pool (`lib/db.ts`)
- **ORM**: Prisma v7 (schema introspection only — runtime uses raw `pg` pool)
- **Auth**: next-auth v4 (JWT strategy, Credentials provider)
- **Package Manager**: pnpm
- **Port**: 5000, Host: 0.0.0.0

## Database — Supabase

### Connection
- `lib/db.ts` parses Supabase pooler URLs explicitly (host/user/password/database/port) to avoid pg v8's buggy dot-username DNS resolution for `postgres.PROJECT_REF` format usernames.
- Uses `ssl: { rejectUnauthorized: false }` for all Supabase connections.
- **Known issue**: Supabase free-tier projects auto-pause after 7 days of inactivity. If login fails with "ENOTFOUND tenant/user …" errors, unpause the project in the Supabase dashboard.
- After unpausing, run `scripts/fix-db.sql` in the Supabase SQL Editor to fix RLS + reseed passwords.

### Tables (public schema)
- **`public.users`** — staff accounts: `id, username, name, password_hash, role` — RLS disabled (no RLS needed for internal staff table)
- **`public.categories`** — 18 seeded menu categories: `id (slug), name, display_order`
- **`public.products`** — 99 seeded menu items: `name, price, category, image_url, description, available`
- **`public.sales`** — order records: `order_number, items (jsonb), subtotal, service_charge, grand_total, payment_method, amount_tendered, change_amount, server_name, created_by, created_at, status ('completed'|'void'|'cancelled'), void_reason`
- **`public.shifts`** — shift tracking per cashier (FK → users.id): includes `archived (bool)`, `notes (text)`

### Seeded Data
- 5 users (admin + cashier1–4), 18 categories, 99 products
- Seed script: `scripts/seed_supabase.js`
- Migration script: `scripts/migrate_supabase.js`
- DB fix + password reseed: `scripts/fix-db.sql`

### Prisma
- Schema: `prisma/schema.prisma` (pulled via `prisma db pull`)
- Config: `prisma.config.ts` (Prisma v7 style)
- Generated client: `lib/generated/prisma` (gitignored — regenerated via `postinstall`)

## Architecture

### Data Sync
- **Single Source of Truth**: All products and categories live in Supabase.
- `product-context.tsx` fetches from `/api/products` and `/api/categories` on mount.
- All mutations (add/edit/delete/toggle availability) go through API routes.
- Admin changes in Menu Management and POS Edit Mode are immediately visible to all cashiers.

### Authentication & RBAC
- Endpoint: `/login` — credentials form (username + password)
- Session: JWT stored in cookie (30-day expiry)
- Middleware (`middleware.ts`) protects all routes except `/login` and `/api/auth/*`
- Roles:
  - **cashier** (`/`) — POS access only. Shift required to start. Cannot access admin panel.
  - **admin** (`/admin`) — Full dashboard: sales, shift reports, menu management, staff management.
  - **admin POS** (`/pos`) — Admin-only POS with Edit Menu toggle and back-to-dashboard button.

### Staff Accounts (default passwords)
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
  layout.tsx          — Root layout with SessionProvider, ProductProvider, CartProvider
  page.tsx            — Cashier POS (redirects admin to /admin)
  pos/page.tsx        — Admin POS (redirects non-admin to /)
  login/page.tsx      — Login form (next-auth signIn)
  admin/page.tsx      — Admin dashboard (dashboard / shifts / staff management)
  checkout/page.tsx   — Checkout flow
  providers.tsx       — SessionProvider wrapper
  context/
    cart-context.tsx         — Cart state
    product-context.tsx      — DB-backed product/category state
  components/
    category-sidebar.tsx      — RBAC: user info, shift info, Settings toggle (admin), logout; "My Sales Summary" for cashiers
    product-grid.tsx          — Filters unavailable products for cashiers
    product-modal.tsx         — Add/Edit product modal (admin)
    thermal-receipt.tsx       — 80mm thermal receipt with QR code
    cashier-summary-dialog.tsx — Date-picker dialog: daily stats, order list, void action, A4 print

lib/
  auth.ts    — NextAuthOptions (queries public.users)
  db.ts      — pg Pool with explicit Supabase pooler URL parsing

middleware.ts   — withAuth() protects routes

types/
  next-auth.d.ts   — NextAuth Session/User/JWT type augmentations (id, role, username)

app/api/
  auth/[...nextauth]/route.ts  — NextAuth handler
  products/route.ts            — GET/POST/PUT/DELETE (public.products)
  categories/route.ts          — GET/POST/PUT/DELETE (public.categories)
  sales/route.ts               — POST record sale (status=completed), GET daily stats
  sales/[id]/route.ts          — PATCH void/cancel/restore a sale order
  sales/my/route.ts            — GET cashier's own sales for a date
  shifts/route.ts              — GET shifts by date; supports include_archived param
  shifts/[id]/route.ts         — PATCH edit shift, DELETE shift
  shifts/[id]/sales/route.ts   — GET all orders for a specific shift (admin)
  shifts/current/route.ts      — GET/PATCH current open shift
  users/route.ts               — GET/POST/PUT/DELETE (admin only — full staff CRUD)
scripts/
  fix-db.sql           — SQL to run in Supabase Dashboard (RLS fix + password reseed)
  seed_supabase.js     — Seeds all users, categories, products
  migrate_supabase.js  — Creates all tables
```

### Environment Variables
| Variable | Where set | Value |
|---|---|---|
| `DATABASE_URL` | Replit Secrets + Vercel Env | Supabase transaction pooler connection string |
| `NEXTAUTH_SECRET` | Replit Secrets + Vercel Env | Random 32-byte secret |
| `NEXTAUTH_URL` | Vercel Env only | `https://v0-pos-corongrilldiners.vercel.app` |

**Note**: `NEXTAUTH_URL` is auto-derived from `REPLIT_DEV_DOMAIN` in `next.config.mjs` on Replit.
On Vercel it must be set manually in Vercel's Environment Variables dashboard.

## Supabase Unpause Runbook

Supabase free-tier projects auto-pause after 7 days of inactivity. When paused, login hangs indefinitely (spinner) and all API routes that touch the DB fail.

**Symptoms:** `/login` shows an infinite spinner; server logs show `ENOTFOUND` or `connection timeout` errors.

**Steps to restore full functionality:**

1. **Unpause the project** — log into [supabase.com](https://supabase.com), open the project, and click "Restore project" in the banner.
2. **Fix RLS + reseed passwords** — open the SQL Editor in the Supabase dashboard and paste + run the contents of `scripts/fix-db.sql`. This:
   - Disables RLS on `public.users` so the auth query always works
   - Creates permissive `allow_all` policies on `categories`, `products`, `sales`, `shifts`
   - Reseeds `password_hash` for admin (`admin123`) and all cashiers (`cashier123`)
3. **Verify login** — try logging in with:
   - Username: `admin` / Password: `admin123` → lands on `/admin`
   - Username: `cashier1` / Password: `cashier123` → lands on `/` (POS)

**Note:** The `scripts/fix-db.sql` script is idempotent — safe to re-run if in doubt.

## Vercel Deployment
Required env vars in Vercel Dashboard → Settings → Environment Variables:
1. `DATABASE_URL` — copy from Replit Secrets (Supabase pooler URL)
2. `NEXTAUTH_SECRET` — copy from Replit Secrets
3. `NEXTAUTH_URL` — set to `https://v0-pos-corongrilldiners.vercel.app`

After setting env vars, trigger a redeploy from the Vercel dashboard.

## PWA / Offline
- Service Worker (`/sw.js`) registered on first load
- HTML pages: always network-first
- Static assets: cache-first
- API calls: network-first with offline JSON fallback
- Failed POST /api/sales → saved to localStorage, synced when back online

## Receipt Format
- 80mm thermal paper (CSS media query)
- Restaurant: Coron Grill Diners
- Address: Beside Panda House, 1 Don Pedro St, Barangay Poblacion, Coron
- QR code via `api.qrserver.com`
- Footer: "Thank you for dining! Visit us again in Coron!"

## Shift Management System
- Cashiers MUST enter starting cash balance when logging in
- Admins skip the mandatory shift modal
- Close Shift: shows expected vs actual cash, calculates discrepancy
- After closing, prints a Shift Summary receipt (XPrinter/thermal compatible)
- Admin Dashboard "Shift History" tab: filter Active/Archived/All, expand per-shift order list (completed/void/cancelled), edit shift fields (end balance, notes), archive or delete shifts
- Cashier "My Sales Summary" button: date-picker, daily stats, full order list with void action, A4 print via window.open() (avoids 58mm thermal print CSS conflict)
- Sales orders carry `status` (completed/void/cancelled) and `void_reason` in DB

## Development Notes
- `next.config.mjs` overrides `NEXTAUTH_URL` with `REPLIT_DEV_DOMAIN` when on Replit
- `package.json` has `postinstall: "prisma generate"` for Vercel builds
- `lib/db.ts` explicitly parses Supabase pooler URLs to extract host/user/password/port/db rather than using connectionString (works around pg v8 bug where usernames with dots are misread as hostnames)
- The error "(ENOTFOUND) tenant/user postgres.PROJ_REF not found" comes from pgbouncer when the Supabase project is PAUSED — not a code bug
- bcrypt hash rounds: 12
