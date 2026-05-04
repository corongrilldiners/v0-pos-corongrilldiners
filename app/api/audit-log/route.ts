import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import pool from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const result = await pool.query(
      `SELECT id, action, actor_id, actor_username, target_user_id, target_username, details, created_at
       FROM public.admin_audit_log
       ORDER BY created_at DESC
       LIMIT 100`
    )
    return NextResponse.json({ entries: result.rows })
  } catch (err) {
    console.error("Failed to fetch audit log:", err)
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 })
  }
}
