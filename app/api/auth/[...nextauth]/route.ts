import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

const handler = NextAuth(authOptions)

export { handler as GET }

export async function POST(req: NextRequest, context: { params: { nextauth: string[] } }) {
  const segments = context.params.nextauth ?? []
  const isCredentialsCallback =
    segments.length === 2 &&
    segments[0] === "callback" &&
    segments[1] === "credentials"

  if (isCredentialsCallback) {
    const forwarded = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")
    const ip =
      (forwarded ? forwarded.split(",")[0] : null)?.trim() ||
      realIp?.trim() ||
      null

    if (!ip) {
      const origin = req.nextUrl.origin
      return NextResponse.json(
        { url: `${origin}/login?error=RateLimited` },
        { status: 429, headers: { "Retry-After": "60" } }
      )
    }

    const { allowed, retryAfterMs } = checkRateLimit(ip)

    if (!allowed) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000)
      const origin = req.nextUrl.origin
      return NextResponse.json(
        { url: `${origin}/login?error=RateLimited` },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfterSec.toString(),
          },
        }
      )
    }
  }

  return handler(req, context)
}
