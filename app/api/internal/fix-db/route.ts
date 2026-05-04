import { NextResponse } from "next/server"
import { Pool } from "pg"
import bcrypt from "bcryptjs"
import dns from "dns/promises"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get("secret")
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const log: string[] = []
  const raw = process.env.DATABASE_URL ?? ""

  // Parse URL for diagnostics (no password)
  let diagHost = ""
  let diagUser = ""
  let diagPort = ""
  let diagDb = ""
  try {
    const u = new URL(raw)
    diagHost = u.hostname
    diagUser = decodeURIComponent(u.username)
    diagPort = u.port
    diagDb = u.pathname.replace(/^\//, "")
    log.push(`Parsed → host=${diagHost} user=${diagUser} port=${diagPort} db=${diagDb}`)
  } catch (e: any) {
    log.push(`URL parse failed: ${e.message}`)
  }

  // DNS check
  try {
    const addrs = await dns.resolve4(diagHost)
    log.push(`DNS ok: ${diagHost} → ${addrs.join(", ")}`)
  } catch (e: any) {
    log.push(`DNS FAILED for "${diagHost}": ${e.message}`)
  }

  // Build pool with explicit params (bypasses pg's internal URL parsing)
  const pool = new Pool({
    host: diagHost,
    port: diagPort ? parseInt(diagPort, 10) : 5432,
    user: diagUser,
    password: decodeURIComponent(new URL(raw).password),
    database: diagDb,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  })

  try {
    const ping = await pool.query("SELECT NOW() AS now")
    log.push(`DB ping ok: ${ping.rows[0].now}`)
  } catch (e: any) {
    log.push(`DB ping FAILED: ${e.message}`)
    await pool.end()
    return NextResponse.json({ success: false, log })
  }

  try {
    const usersCheck = await pool.query(
      "SELECT id, username, role, LENGTH(password_hash) as hl FROM public.users ORDER BY id"
    )
    log.push("Current users: " + JSON.stringify(usersCheck.rows))

    const rlsCheck = await pool.query(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
       WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' ORDER BY relname`
    )
    log.push("RLS state before: " + JSON.stringify(rlsCheck.rows))

    await pool.query("ALTER TABLE public.users DISABLE ROW LEVEL SECURITY")
    log.push("✓ Disabled RLS on public.users")

    for (const tbl of ["categories", "products", "sales", "shifts"]) {
      await pool.query(`DROP POLICY IF EXISTS allow_postgres ON public.${tbl}`)
      await pool.query(
        `DO $$ BEGIN
           IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='${tbl}' AND policyname='allow_all') THEN
             CREATE POLICY allow_all ON public.${tbl} USING (true) WITH CHECK (true);
           END IF;
         END $$`
      )
      log.push(`✓ Fixed RLS policy on public.${tbl}`)
    }

    const adminHash = await bcrypt.hash("admin123", 12)
    const cashierHash = await bcrypt.hash("cashier123", 12)

    const ar = await pool.query(
      "UPDATE public.users SET password_hash = $1 WHERE role = 'admin' RETURNING id, username",
      [adminHash]
    )
    log.push(`✓ Reseeded admin passwords (${ar.rowCount} rows): admin123`)

    const cr = await pool.query(
      "UPDATE public.users SET password_hash = $1 WHERE role = 'cashier' RETURNING id, username",
      [cashierHash]
    )
    log.push(`✓ Reseeded cashier passwords (${cr.rowCount} rows): cashier123`)

    const adminRow = await pool.query(
      "SELECT password_hash FROM public.users WHERE username = 'admin'"
    )
    if (adminRow.rows.length > 0) {
      const ok = await bcrypt.compare("admin123", adminRow.rows[0].password_hash)
      log.push(`✓ Admin bcrypt verify: ${ok}`)
    }

    const c1Row = await pool.query(
      "SELECT password_hash FROM public.users WHERE username = 'cashier1'"
    )
    if (c1Row.rows.length > 0) {
      const ok = await bcrypt.compare("cashier123", c1Row.rows[0].password_hash)
      log.push(`✓ Cashier1 bcrypt verify: ${ok}`)
    }

    return NextResponse.json({ success: true, log })
  } catch (error: any) {
    log.push("ERROR: " + (error?.message ?? String(error)))
    return NextResponse.json({ success: false, log, error: error?.message }, { status: 500 })
  } finally {
    await pool.end()
  }
}
