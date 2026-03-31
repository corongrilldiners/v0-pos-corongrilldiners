import { NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET() {
  try {
    const result = await pool.query(
      "SELECT id, name, price::float, image, category, description FROM products ORDER BY id ASC"
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Failed to fetch products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}
