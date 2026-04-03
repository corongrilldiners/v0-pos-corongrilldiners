import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import pool from "@/lib/db"

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, name, display_order FROM categories ORDER BY display_order ASC, name ASC`
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Failed to fetch categories:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const { name, display_order } = await request.json()
    const result = await pool.query(
      `INSERT INTO categories (name, display_order)
       VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET display_order = EXCLUDED.display_order
       RETURNING id, name, display_order`,
      [name, display_order ?? 0]
    )
    return NextResponse.json({ category: result.rows[0] })
  } catch (error) {
    console.error("Failed to create category:", error)
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const { id, name, display_order } = await request.json()
    const result = await pool.query(
      `UPDATE categories SET name = $1, display_order = COALESCE($2, display_order)
       WHERE id = $3
       RETURNING id, name, display_order`,
      [name, display_order, id]
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }
    return NextResponse.json({ category: result.rows[0] })
  } catch (error) {
    console.error("Failed to update category:", error)
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const { id } = await request.json()
    const cat = await pool.query(`SELECT name FROM categories WHERE id = $1`, [id])
    if (cat.rows.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }
    const categoryName = cat.rows[0].name
    const productCheck = await pool.query(
      `SELECT COUNT(*) FROM products WHERE category = $1`, [categoryName]
    )
    if (parseInt(productCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${productCheck.rows[0].count} products use this category` },
        { status: 400 }
      )
    }
    await pool.query("DELETE FROM categories WHERE id = $1", [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete category:", error)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}
