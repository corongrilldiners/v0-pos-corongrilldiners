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
       FROM shifts
       WHERE cashier_id = $1
         AND status = 'open'
         AND DATE(start_time AT TIME ZONE 'Asia/Manila') = CURRENT_DATE AT TIME ZONE 'Asia/Manila'
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
    const { endBalance } = await request.json()

    // Get the open shift
    const shiftResult = await pool.query(
      `SELECT * FROM shifts
       WHERE cashier_id = $1 AND status = 'open'
         AND DATE(start_time AT TIME ZONE 'Asia/Manila') = CURRENT_DATE AT TIME ZONE 'Asia/Manila'
       ORDER BY start_time DESC
       LIMIT 1`,
      [session.user.id]
    )

    if (shiftResult.rows.length === 0) {
      return NextResponse.json({ error: "No open shift found" }, { status: 404 })
    }

    const shift = shiftResult.rows[0]

    // Calculate total cash sales and total sales during this shift
    const salesResult = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN grand_total ELSE 0 END), 0)::float AS cash_sales,
         COALESCE(SUM(grand_total), 0)::float AS total_sales
       FROM sales
       WHERE created_by = $1
         AND created_at >= $2`,
      [session.user.name, shift.start_time]
    )

    const { cash_sales: cashSales, total_sales: totalSales } = salesResult.rows[0]
    const expectedCash = parseFloat(shift.start_balance) + cashSales
    const discrepancy = endBalance - expectedCash

    // Close the shift
    const updated = await pool.query(
      `UPDATE shifts SET
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
  } catch (error) {
    console.error("Failed to close shift:", error)
    return NextResponse.json({ error: "Failed to close shift" }, { status: 500 })
  }
}
