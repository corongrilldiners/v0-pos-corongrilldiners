import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import pool from "@/lib/db"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const actorId = searchParams.get("actor_id")
  const action = searchParams.get("action")

  const conditions: string[] = []
  const values: unknown[] = []

  if (actorId) {
    const parsedActorId = Number(actorId)
    if (!Number.isFinite(parsedActorId) || parsedActorId <= 0) {
      return NextResponse.json({ error: "Invalid actor_id" }, { status: 400 })
    }
    values.push(parsedActorId)
    conditions.push(`actor_id = $${values.length}`)
  }

  if (action) {
    values.push(action)
    conditions.push(`action = $${values.length}`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  try {
    const result = await pool.query(
      `SELECT id, action, actor_id, actor_username, target_user_id, target_username, details, created_at
       FROM public.admin_audit_log
       ${where}
       ORDER BY created_at DESC
       LIMIT 100`,
      values
    )
    return NextResponse.json({ entries: result.rows })
  } catch (err) {
    console.error("Failed to fetch audit log:", err)
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 })
  }
}
