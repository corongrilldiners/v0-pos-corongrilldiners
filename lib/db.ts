import { Pool } from "pg"

function buildPoolConfig() {
  const raw = process.env.DATABASE_URL ?? ""
  if (!raw) throw new Error("DATABASE_URL is not set")

  if (raw.includes("supabase.com") || raw.includes("pooler.supabase.com")) {
    try {
      const url = new URL(raw)

      const host = url.hostname
      const port = url.port ? parseInt(url.port, 10) : 5432
      const user = decodeURIComponent(url.username)
      const password = decodeURIComponent(url.password)
      const database = url.pathname.replace(/^\//, "")

      return {
        host,
        port,
        user,
        password,
        database,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
      }
    } catch {
      // fallback — strip sslmode and use connectionString
      try {
        const url = new URL(raw)
        url.searchParams.delete("sslmode")
        url.searchParams.delete("sslcert")
        url.searchParams.delete("sslkey")
        url.searchParams.delete("sslrootcert")
        return { connectionString: url.toString(), ssl: { rejectUnauthorized: false } }
      } catch {
        return { connectionString: raw, ssl: { rejectUnauthorized: false } }
      }
    }
  }

  return { connectionString: raw }
}

const pool = new Pool(buildPoolConfig())

export default pool
