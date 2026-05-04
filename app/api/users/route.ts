import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import pool from "@/lib/db"
import bcrypt from "bcryptjs"

function pgErrorCode(err: unknown): string | undefined {
  if (err !== null && typeof err === "object" && "code" in err) {
    return (err as { code: unknown }).code as string
  }
  return undefined
}

function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 8)          return "Password must be at least 8 characters."
  if (!/[A-Z]/.test(pw))      return "Password must contain at least one uppercase letter."
  if (!/[0-9]/.test(pw))      return "Password must contain at least one number."
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must contain at least one special character."
  return null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const result = await pool.query(
      `SELECT id, username, name, role, created_at FROM public.users ORDER BY role DESC, name ASC`
    )
    return NextResponse.json({ users: result.rows })
  } catch (err) {
    console.error("Failed to fetch users:", err)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { username, name, password, role } = await request.json()

    if (!username || !name || !password) {
      return NextResponse.json(
        { error: "Username, name, and password are required" },
        { status: 400 }
      )
    }

    const strengthError = validatePasswordStrength(password)
    if (strengthError) {
      return NextResponse.json({ error: strengthError }, { status: 400 })
    }

    const allowedRole = role === "admin" ? "admin" : "cashier"
    const passwordHash = await bcrypt.hash(password, 12)

    const result = await pool.query(
      `INSERT INTO public.users (username, name, role, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, name, role, created_at`,
      [username.trim().toLowerCase(), name.trim(), allowedRole, passwordHash]
    )

    return NextResponse.json({ user: result.rows[0] })
  } catch (err) {
    if (pgErrorCode(err) === "23505") {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 })
    }
    console.error("Failed to create user:", err)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id, name, password } = await request.json()

    if (!id || !name) {
      return NextResponse.json({ error: "ID and name are required" }, { status: 400 })
    }

    let result
    if (password && password.trim()) {
      const strengthError = validatePasswordStrength(password.trim())
      if (strengthError) {
        return NextResponse.json({ error: strengthError }, { status: 400 })
      }
      const passwordHash = await bcrypt.hash(password.trim(), 12)
      result = await pool.query(
        `UPDATE public.users
         SET name = $1, password_hash = $2
         WHERE id = $3
         RETURNING id, username, name, role, created_at`,
        [name.trim(), passwordHash, id]
      )
    } else {
      result = await pool.query(
        `UPDATE public.users
         SET name = $1
         WHERE id = $2
         RETURNING id, username, name, role, created_at`,
        [name.trim(), id]
      )
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: result.rows[0] })
  } catch (err) {
    console.error("Failed to update user:", err)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const userCheck = await pool.query(
      "SELECT role FROM public.users WHERE id = $1",
      [id]
    )
    if (userCheck.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (userCheck.rows[0].role === "admin") {
      const adminCount = await pool.query(
        "SELECT COUNT(*) FROM public.users WHERE role = 'admin'"
      )
      if (parseInt(adminCount.rows[0].count, 10) <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last admin account" },
          { status: 400 }
        )
      }
    }

    await pool.query("DELETE FROM public.users WHERE id = $1", [id])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Failed to delete user:", err)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
