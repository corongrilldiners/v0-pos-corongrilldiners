import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Redirect admin away from the cashier POS root to the admin dashboard
    if (pathname === "/" && token?.role === "admin") {
      return NextResponse.redirect(new URL("/admin", req.url))
    }

    // Block cashiers from accessing the admin dashboard
    if (pathname.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    // Block cashiers from the admin-only POS management page
    if (pathname === "/pos" && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url))
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
