-- ============================================================
-- Coron Grill Diners POS — DB Fix Script
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Disable RLS on public.users so auth queries always work
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Fix RLS policies on other tables (replace "TO postgres" with universal)
DROP POLICY IF EXISTS allow_postgres ON public.categories;
DROP POLICY IF EXISTS allow_postgres ON public.products;
DROP POLICY IF EXISTS allow_postgres ON public.sales;
DROP POLICY IF EXISTS allow_postgres ON public.shifts;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='allow_all') THEN
    CREATE POLICY allow_all ON public.categories USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='allow_all') THEN
    CREATE POLICY allow_all ON public.products USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sales' AND policyname='allow_all') THEN
    CREATE POLICY allow_all ON public.sales USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shifts' AND policyname='allow_all') THEN
    CREATE POLICY allow_all ON public.shifts USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- 3. Reseed passwords with fresh bcrypt hashes
--    admin → admin123   |   cashier1-4 → cashier123
UPDATE public.users
SET password_hash = '$2b$12$m.iqHdem6dFhm/yf7uoOy.Nj8ZxHeFl3Hjqd1Kt4tRShdWXmZPpbq'
WHERE role = 'admin';

UPDATE public.users
SET password_hash = '$2b$12$jZDEIJtEDGFg7FUe3MoXeu.Zg.KXLAgOwO/PgsgJ/9KURs3Z3ecxC'
WHERE role = 'cashier';

-- 4. Verify
SELECT id, username, name, role, LENGTH(password_hash) AS hash_len
FROM public.users
ORDER BY role DESC, username;
