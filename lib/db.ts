import { Pool } from "pg"

function buildPoolConfig() {
  const raw = process.env.DATABASE_URL ?? ""
  if (!raw) return { connectionString: raw }

  if (raw.includes("supabase.com")) {
    try {
      const url = new URL(raw)
      url.searchParams.delete("sslmode")
      url.searchParams.delete("sslcert")
      url.searchParams.delete("sslkey")
      url.searchParams.delete("sslrootcert")
      return {
        connectionString: url.toString(),
        ssl: { rejectUnauthorized: false },
      }
    } catch {
      return { connectionString: raw, ssl: { rejectUnauthorized: false } }
    }
  }

  return { connectionString: raw }
}

const pool = new Pool(buildPoolConfig())

export default pool
