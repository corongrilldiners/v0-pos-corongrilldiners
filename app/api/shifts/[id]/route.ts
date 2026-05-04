import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import pool from "@/lib/db"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { archived, notes, end_balance } = body

    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (typeof archived === "boolean") {
      sets.push(`archived = $${idx++}`)
      values.push(archived)
    }
    if (typeof notes === "string") {
      sets.push(`notes = $${idx++}`)
      values.push(notes)
    }
    if (typeof end_balance === "number") {
      const balanceIdx = idx++
      sets.push(`end_balance = $${balanceIdx}`)
      values.push(end_balance)
      sets.push(`discrepancy = $${balanceIdx} - COALESCE(expected_cash, 0)`)
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    values.push(params.id)

    const result = await pool.query(
      `UPDATE public.shifts
       SET ${sets.join(", ")}
       WHERE id = $${idx}
       RETURNING
         id, cashier_name, cashier_username, start_time, end_time, status,
         archived, notes,
         start_balance::float, end_balance::float,
         total_cash_sales::float, total_sales::float,
         expected_cash::float, discrepancy::float`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    return NextResponse.json({ shift: result.rows[0] })
  } catch (error) {
    console.error("Failed to update shift:", error)
    return NextResponse.json({ error: "Failed to update shift" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const result = await pool.query(
      `DELETE FROM public.shifts WHERE id = $1 RETURNING id`,
      [params.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete shift:", error)
    return NextResponse.json({ error: "Failed to delete shift" }, { status: 500 })
  }
}
