import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import pool from "@/lib/db"

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, name, price::float, category, image_url AS image, description, available
       FROM public.products ORDER BY category, name ASC`
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Failed to fetch products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { name, price, category, image, description, available } = await request.json()
    const result = await pool.query(
      `INSERT INTO public.products (name, price, category, image_url, description, available)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, price::float, category, image_url AS image, description, available`,
      [name, price, category, image || null, description || null, available ?? true]
    )
    return NextResponse.json({ product: result.rows[0] })
  } catch (error) {
    console.error("Failed to create product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id, name, price, category, image, description, available } = await request.json()
    const result = await pool.query(
      `UPDATE public.products
       SET name = $1, price = $2, category = $3, image_url = $4,
           description = $5, available = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING id, name, price::float, category, image_url AS image, description, available`,
      [name, price, category, image || null, description || null, available ?? true, id]
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }
    return NextResponse.json({ product: result.rows[0] })
  } catch (error) {
    console.error("Failed to update product:", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await request.json()
    await pool.query("DELETE FROM public.products WHERE id = $1", [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete product:", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
