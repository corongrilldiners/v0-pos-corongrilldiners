import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import pool from "@/lib/db"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { startBalance } = await request.json()

    // If there's already an open shift for this cashier today, return it (idempotent)
    const existing = await pool.query(
      `SELECT
         id, cashier_id, cashier_name, cashier_username,
         start_time, end_time, status,
         start_balance::float,
         end_balance::float,
         total_cash_sales::float,
         total_sales::float,
         expected_cash::float,
         discrepancy::float
       FROM public.shifts
       WHERE cashier_id = $1::integer AND status = 'open'
       ORDER BY start_time DESC
       LIMIT 1`,
      [session.user.id]
    )
    if (existing.rows.length > 0) {
      return NextResponse.json({ shift: existing.rows[0] })
    }

    const result = await pool.query(
      `INSERT INTO public.shifts (cashier_id, cashier_name, cashier_username, start_balance, status)
       VALUES ($1, $2, $3, $4, 'open')
       RETURNING
         id, cashier_id, cashier_name, cashier_username,
         start_time, end_time, status,
         start_balance::float,
         end_balance::float,
         total_cash_sales::float,
         total_sales::float,
         expected_cash::float,
         discrepancy::float`,
      [session.user.id, session.user.name, (session.user as any).username ?? session.user.name, startBalance]
    )

    return NextResponse.json({ shift: result.rows[0] })
  } catch (error) {
    console.error("Failed to start shift:", error)
    return NextResponse.json({ error: "Failed to start shift" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") || new Date().toLocaleDateString("en-CA")
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    const result = await pool.query(
      `SELECT
         s.*,
         s.start_balance::float,
         s.end_balance::float,
         s.total_cash_sales::float,
         s.total_sales::float,
         s.expected_cash::float,
         s.discrepancy::float
       FROM public.shifts s
       WHERE DATE(s.start_time AT TIME ZONE 'Asia/Manila') = $1
       ORDER BY s.start_time DESC
       LIMIT $2`,
      [date, limit]
    )

    return NextResponse.json({ shifts: result.rows, date })
  } catch (error) {
    console.error("Failed to fetch shifts:", error)
    return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 })
  }
}
