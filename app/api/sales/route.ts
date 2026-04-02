import { NextResponse } from "next/server"
import pool from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      orderNumber,
      items,
      subtotal,
      serviceCharge,
      grandTotal,
      paymentMethod,
      amountTendered,
      changeAmount,
      serverName,
      createdBy,
    } = body

    const result = await pool.query(
      `INSERT INTO sales
        (order_number, items, subtotal, service_charge, grand_total, payment_method, amount_tendered, change_amount, server_name, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, order_number, grand_total, created_at`,
      [
        orderNumber,
        JSON.stringify(items),
        subtotal,
        serviceCharge,
        grandTotal,
        paymentMethod,
        amountTendered,
        changeAmount,
        serverName,
        createdBy ?? serverName,
      ]
    )

    return NextResponse.json({ success: true, sale: result.rows[0] })
  } catch (error) {
    console.error("Failed to record sale:", error)
    return NextResponse.json({ error: "Failed to record sale" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]

    const dailyStats = await pool.query(
      `SELECT
         COUNT(*)::int AS total_orders,
         COALESCE(SUM(grand_total), 0)::float AS total_sales,
         COALESCE(SUM(subtotal), 0)::float AS total_subtotal,
         COALESCE(SUM(service_charge), 0)::float AS total_service_charge
       FROM sales
       WHERE DATE(created_at AT TIME ZONE 'Asia/Manila') = $1`,
      [date]
    )

    const paymentBreakdown = await pool.query(
      `SELECT
         payment_method,
         COUNT(*)::int AS count,
         COALESCE(SUM(grand_total), 0)::float AS total
       FROM sales
       WHERE DATE(created_at AT TIME ZONE 'Asia/Manila') = $1
       GROUP BY payment_method
       ORDER BY total DESC`,
      [date]
    )

    const recentOrders = await pool.query(
      `SELECT
         id,
         order_number,
         items,
         subtotal::float,
         service_charge::float,
         grand_total::float,
         payment_method,
         server_name,
         created_by,
         created_at
       FROM sales
       WHERE DATE(created_at AT TIME ZONE 'Asia/Manila') = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [date]
    )

    return NextResponse.json({
      date,
      stats: dailyStats.rows[0],
      paymentBreakdown: paymentBreakdown.rows,
      recentOrders: recentOrders.rows,
    })
  } catch (error) {
    console.error("Failed to fetch sales:", error)
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 })
  }
}
