import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")
  const expected = process.env.NEXTAUTH_SECRET

  if (!secret || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    await client.query("ALTER TABLE public.users DISABLE ROW LEVEL SECURITY")

    for (const table of ["categories", "products", "sales", "shifts"]) {
      await client.query(`DROP POLICY IF EXISTS allow_postgres ON public.${table}`)
    }

    for (const table of ["categories", "products", "sales", "shifts"]) {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname='public' AND tablename='${table}' AND policyname='allow_all'
          ) THEN
            CREATE POLICY allow_all ON public.${table} USING (true) WITH CHECK (true);
          END IF;
        END
        $$
      `)
    }

    await client.query(
      `UPDATE public.users SET password_hash = $1 WHERE role = 'admin'`,
      ["$2b$12$m.iqHdem6dFhm/yf7uoOy.Nj8ZxHeFl3Hjqd1Kt4tRShdWXmZPpbq"]
    )

    await client.query(
      `UPDATE public.users SET password_hash = $1 WHERE role = 'cashier'`,
      ["$2b$12$jZDEIJtEDGFg7FUe3MoXeu.Zg.KXLAgOwO/PgsgJ/9KURs3Z3ecxC"]
    )

    const verify = await client.query(
      `SELECT id, username, name, role, LENGTH(password_hash) AS hash_len
       FROM public.users ORDER BY role DESC, username`
    )

    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message: "DB fix applied: RLS disabled on users, policies updated, passwords reseeded.",
      users: verify.rows,
    })
  } catch (err: unknown) {
    await client.query("ROLLBACK")
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  } finally {
    client.release()
  }
}
