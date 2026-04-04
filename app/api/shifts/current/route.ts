import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import pool from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await pool.query(
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
       WHERE cashier_id = $1::integer
         AND status = 'open'
       ORDER BY start_time DESC
       LIMIT 1`,
      [session.user.id]
    )

    return NextResponse.json({ shift: result.rows[0] ?? null })
  } catch (error) {
    console.error("Failed to fetch current shift:", error)
    return NextResponse.json({ error: "Failed to fetch current shift" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const endBalance = parseFloat(body.endBalance) || 0

    // Find the most recent open shift for this cashier
    const shiftResult = await pool.query(
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
       WHERE cashier_id = $1::integer
         AND status = 'open'
       ORDER BY start_time DESC
       LIMIT 1`,
      [session.user.id]
    )

    if (shiftResult.rows.length === 0) {
      return NextResponse.json({ error: "No open shift found" }, { status: 404 })
    }

    const shift = shiftResult.rows[0]

    // Sum sales for this cashier since shift started
    // Match by cashier_username (most reliable) then fall back to name
    const salesResult = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN grand_total ELSE 0 END), 0)::float AS cash_sales,
         COALESCE(SUM(grand_total), 0)::float AS total_sales
       FROM public.sales
       WHERE (created_by = $1 OR created_by = $2)
         AND created_at >= $3`,
      [
        shift.cashier_name,
        shift.cashier_username,
        shift.start_time,
      ]
    )

    const cashSales: number = salesResult.rows[0].cash_sales
    const totalSales: number = salesResult.rows[0].total_sales
    const startBalance: number = shift.start_balance
    const expectedCash: number = startBalance + cashSales
    const discrepancy: number = endBalance - expectedCash

    // Close the shift
    const updated = await pool.query(
      `UPDATE public.shifts SET
         end_time = NOW(),
         end_balance = $1,
         total_cash_sales = $2,
         total_sales = $3,
         expected_cash = $4,
         discrepancy = $5,
         status = 'closed'
       WHERE id = $6
       RETURNING
         id, cashier_id, cashier_name, cashier_username,
         start_time, end_time, status,
         start_balance::float,
         end_balance::float,
         total_cash_sales::float,
         total_sales::float,
         expected_cash::float,
         discrepancy::float`,
      [endBalance, cashSales, totalSales, expectedCash, discrepancy, shift.id]
    )

    return NextResponse.json({ shift: updated.rows[0] })
  } catch (error: any) {
    console.error("Failed to close shift:", error?.message ?? error)
    return NextResponse.json(
      { error: "Failed to close shift", detail: error?.message ?? "unknown" },
      { status: 500 }
    )
  }
}
