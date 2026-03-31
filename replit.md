# Coron Grill Diners - POS System

A point-of-sale (POS) web application built with Next.js for Coron Grill Diners restaurant.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS + shadcn/ui (Radix UI components)
- **Package Manager**: pnpm
- **Database**: Supabase (configured but not yet connected to app components)
- **Language**: TypeScript

## Project Structure

```
app/
  page.tsx              - Main POS page
  layout.tsx            - Root layout with providers
  components/           - POS UI components (cart, products, categories)
  context/              - React context (cart, products)
  data/                 - Local product data
  checkout/             - Checkout flow
  success/              - Order success page
components/
  ui/                   - shadcn/ui component library
lib/
  supabase/             - Supabase client setup (client, server, middleware)
  utils.ts              - Utility functions
hooks/                  - Custom React hooks
styles/                 - Global styles
```

## Running the App

```bash
pnpm run dev    # Development server on port 5000
pnpm run build  # Production build
pnpm run start  # Production server on port 5000
```

## Environment Variables

The following environment variables are needed if Supabase features are used:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Replit Configuration

- Runs on port 5000 bound to 0.0.0.0 for Replit preview compatibility
- Workflow: "Start application" runs `pnpm run dev`
