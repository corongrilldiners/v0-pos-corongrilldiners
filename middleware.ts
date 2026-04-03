import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname, searchParams } = req.nextUrl

    // Allow admins to access the POS directly when they explicitly choose to
    const isAdminPOSMode = searchParams.get("adminpos") === "1"

    // Redirect admin users from "/" to "/admin" unless they chose to open the POS
    if (pathname === "/" && token?.role === "admin" && !isAdminPOSMode) {
      return NextResponse.redirect(new URL("/admin", req.url))
    }

    return NextResponse.next()
  },
  {
    pages: {
      signIn: "/login",
    },
  }
)

export const config = {
  matcher: [
    "/((?!login|api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.ico|sw\\.js|manifest\\.json|offline\\.html).*)",
  ],
}
