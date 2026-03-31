# Coron Grill Diners - POS System

A production-ready point-of-sale (POS) web application for Coron Grill Diners restaurant, backed by Replit PostgreSQL.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS + shadcn/ui (Radix UI components)
- **Database**: Replit PostgreSQL via `pg`
- **Package Manager**: pnpm
- **Language**: TypeScript

## Project Structure

```
app/
  page.tsx              - Main POS page
  layout.tsx            - Root layout with providers
  checkout/page.tsx     - Checkout with 1s cart sync spinner + DB sales recording
  success/page.tsx      - Order success page
  admin/page.tsx        - Admin dashboard (daily sales & orders from DB)
  components/
    cart-sidebar.tsx    - Cart sidebar with checkout button
    product-grid.tsx    - Product grid
    category-sidebar.tsx - Category filter sidebar
    thermal-receipt.tsx - 80mm thermal receipt with QR code
  context/
    cart-context.tsx    - Cart state (localStorage)
    product-context.tsx - Product state (localStorage fallback)
  data/
    products.tsx        - Legacy static data (DB is source of truth)
  api/
    products/route.ts   - GET /api/products — fetches from DB
    sales/route.ts      - POST /api/sales (record sale), GET (admin stats)
components/ui/          - shadcn/ui component library
lib/
  db.ts                 - PostgreSQL pool (pg)
  supabase/             - Stubbed out (replaced by lib/db.ts)
  utils.ts              - Utility functions
hooks/                  - Custom React hooks
styles/                 - Global styles
```

## Database Schema

### `products` table
| Column      | Type           | Notes                  |
|-------------|----------------|------------------------|
| id          | SERIAL PK      | Matches static IDs     |
| name        | VARCHAR(255)   |                        |
| price       | DECIMAL(10,2)  |                        |
| image       | TEXT           | Unsplash URLs          |
| category    | VARCHAR(100)   |                        |
| description | TEXT           | Optional               |
| created_at  | TIMESTAMP      |                        |

### `sales` table
| Column          | Type          | Notes                        |
|-----------------|---------------|------------------------------|
| id              | SERIAL PK     |                              |
| order_number    | VARCHAR(50)   | Format: #CGD-XXXX            |
| items           | JSONB         | Array of cart items          |
| subtotal        | DECIMAL(10,2) |                              |
| service_charge  | DECIMAL(10,2) |                              |
| grand_total     | DECIMAL(10,2) |                              |
| payment_method  | VARCHAR(50)   | cash / card / gcash          |
| amount_tendered | DECIMAL(10,2) |                              |
| change_amount   | DECIMAL(10,2) |                              |
| server_name     | VARCHAR(100)  |                              |
| created_at      | TIMESTAMP     | Used for daily filtering     |

## Running the App

```bash
pnpm run dev    # Development server on port 5000
pnpm run build  # Production build
pnpm run start  # Production server on port 5000
```

## Key Features

- **99 menu items** seeded into PostgreSQL across 18 categories
- **Cart race condition fix**: 1-second spinner on checkout page ensures localStorage syncs before rendering
- **Live sales recording**: Every completed order (Confirm & Print or Digital Only) saves to the `sales` table
- **Thermal receipt**: 80mm format, proper header/address, real QR code, updated footer
- **Admin dashboard** at `/admin`: Total daily sales, total orders, avg order value, payment breakdown, recent orders list — with date picker

## Environment Variables

- `DATABASE_URL` — Set automatically by Replit PostgreSQL
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — Set automatically
