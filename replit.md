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
- `lib/db.ts` uses `pg.Pool` with `ssl: { rejectUnauthorized: false }` for Supabase connections.
- The SSL mode params are stripped from the connection string before connecting (Replit SSL chain issue).
- On Vercel (production) SSL works natively; the `rejectUnauthorized: false` is safe since Vercel has proper certs.

### Tables (public schema)
- **`public.users`** — staff accounts: `id, username, name, password_hash, role`
- **`public.categories`** — 18 seeded menu categories: `id (slug), name, display_order`
- **`public.products`** — 99 seeded menu items: `name, price, category, image_url, description, available`
- **`public.sales`** — order records: `order_number, items (jsonb), subtotal, service_charge, grand_total, payment_method, amount_tendered, change_amount, server_name, created_by, created_at`
- **`public.shifts`** — shift tracking per cashier (FK → users.id)

### Seeded Data
- 5 users (admin + cashier1–4), 18 categories, 99 products
- Seed script: `scripts/seed_supabase.js`
- Migration script: `scripts/migrate_supabase.js`

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
  layout.tsx          — Root layout with SessionProvider, ProductProvider, CartProvider
  page.tsx            — Cashier POS (redirects admin to /admin)
  pos/page.tsx        — Admin POS (redirects non-admin to /)
  login/page.tsx      — Login form (next-auth signIn)
  admin/page.tsx      — Admin dashboard
  checkout/page.tsx   — Checkout flow
  providers.tsx       — SessionProvider wrapper
  context/
    cart-context.tsx         — Cart state
    product-context.tsx      — DB-backed product/category state
  components/
    category-sidebar.tsx  — RBAC: user info, shift info, Settings toggle (admin), logout
    product-grid.tsx      — Filters unavailable products for cashiers
    product-modal.tsx     — Add/Edit product modal (admin)
    thermal-receipt.tsx   — 80mm thermal receipt with QR code

lib/
  auth.ts    — NextAuthOptions (queries public.users)
  db.ts      — pg Pool with Supabase SSL handling

middleware.ts   — withAuth() protects routes

app/api/
  auth/[...nextauth]/route.ts  — NextAuth handler
  products/route.ts            — GET/POST/PUT/DELETE (public.products)
  categories/route.ts          — GET/POST/PUT/DELETE (public.categories)
  sales/route.ts               — POST record sale, GET daily stats
  shifts/route.ts              — GET shifts by date (admin)
  shifts/current/route.ts      — GET/PATCH current open shift
  users/route.ts               — GET all users (admin only)
```

### Environment Variables
| Variable | Where set | Value |
|---|---|---|
| `DATABASE_URL` | Replit Secrets + Vercel Env | Supabase pooler connection string |
| `NEXTAUTH_SECRET` | Replit Secrets + Vercel Env | Random 32-byte secret |
| `NEXTAUTH_URL` | Vercel Env only | `https://v0-pos-corongrilldiners.vercel.app` |

**Note**: `NEXTAUTH_URL` is auto-derived from `REPLIT_DEV_DOMAIN` in `next.config.mjs` on Replit.
On Vercel it must be set manually in Vercel's Environment Variables dashboard.

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
- Admin Dashboard "Shift History" tab shows all cashier shifts for selected date

## Development Notes
- `next.config.mjs` overrides `NEXTAUTH_URL` with `REPLIT_DEV_DOMAIN` when on Replit
- `package.json` has `postinstall: "prisma generate"` for Vercel builds
- `lib/db.ts` strips sslmode params from Supabase URL before connecting (Replit proxy SSL quirk)
- SSL warning in logs is benign — pg library warning about future behavior changes
- bcrypt hash rounds: 10
