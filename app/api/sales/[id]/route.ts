import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import pool from "@/lib/db"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { status, voidReason } = await request.json()
    if (!["completed", "void", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const isAdmin = session.user.role === "admin"
    const username = (session.user as any).username ?? session.user.name

    let result
    if (isAdmin) {
      result = await pool.query(
        `UPDATE public.sales
         SET status = $1, void_reason = $2
         WHERE id = $3
         RETURNING id, order_number, status, void_reason`,
        [status, voidReason ?? null, params.id]
      )
    } else {
      result = await pool.query(
        `UPDATE public.sales
         SET status = $1, void_reason = $2
         WHERE id = $3 AND (created_by = $4 OR server_name = $4)
         RETURNING id, order_number, status, void_reason`,
        [status, voidReason ?? null, params.id, username]
      )
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Sale not found or not authorized" }, { status: 404 })
    }

    return NextResponse.json({ sale: result.rows[0] })
  } catch (error) {
    console.error("Failed to update sale status:", error)
    return NextResponse.json({ error: "Failed to update sale status" }, { status: 500 })
  }
}
