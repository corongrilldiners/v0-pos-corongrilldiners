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
- **`products`** — 99 seeded menu items with category, price, image
- **`sales`** — order records: items JSON, totals, payment method, server name, `created_by`
- **`users`** — staff accounts with bcrypt-hashed passwords and role (cashier/admin)

### Authentication & RBAC
- Endpoint: `/login` — credentials form (username + password)
- Session: JWT stored in cookie (30-day expiry)
- Middleware (`middleware.ts`) protects all routes except `/login` and `/api/auth/*`
- Roles:
  - **cashier** — POS access only, no edit mode, no admin dashboard
  - **admin** — full access: edit mode toggle (Settings button), Admin Dashboard link, product/category management

### Staff Accounts
| Username | Password | Role |
|---|---|---|
| cashier1 | cashier1 | Cashier |
| cashier2 | cashier2 | Cashier |
| cashier3 | cashier3 | Cashier |
| cashier4 | cashier4 | Cashier |
| admin | admin123 | Admin |

### Key Files
```
app/
  layout.tsx          — Root layout with SessionProvider, PWA meta, SwRegister
  page.tsx            — Main POS page
  login/page.tsx      — Login form (next-auth signIn)
  admin/page.tsx      — Admin dashboard (role-gated, admin only)
  checkout/page.tsx   — Checkout flow with session-aware server name + offline fallback
  providers.tsx       — SessionProvider wrapper
  context/
    cart-context.tsx
    product-context.tsx
  components/
    category-sidebar.tsx  — RBAC: user info, Settings toggle (admin), Admin link, logout
    product-grid.tsx      — "Add Product" only shows in admin edit mode
    thermal-receipt.tsx   — 80mm thermal receipt with QR code
    sw-register.tsx       — Service Worker registration + offline banner + offline sync

lib/
  auth.ts    — NextAuthOptions (CredentialsProvider + JWT/session callbacks)
  db.ts      — pg Pool connection via DATABASE_URL

middleware.ts   — withAuth() protects all non-public routes

types/
  next-auth.d.ts  — Session/JWT type augmentation (role, id fields)

hooks/
  use-offline-sync.ts  — Queue failed POST /api/sales to localStorage, drain on reconnect

app/api/
  auth/[...nextauth]/route.ts  — NextAuth handler
  products/route.ts            — GET products (filtered by category), POST/PUT/DELETE
  sales/route.ts               — POST (record sale + created_by), GET (daily stats)

public/
  manifest.json   — PWA manifest
  sw.js           — Service Worker (network-first HTML, cache static assets, offline API fallback)
  offline.html    — Offline fallback page
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

## Development Notes
- Next.js dev mode compiles pages lazily on first request
- `next.config.mjs` adds `Cache-Control: no-store` for `/_next/*` in dev to prevent stale asset caching
- Service worker cache name: `cgd-pos-v2` — increment when making breaking SW changes
- bcrypt hash rounds: 10
