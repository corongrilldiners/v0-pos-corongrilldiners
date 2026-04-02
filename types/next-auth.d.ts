import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      role: "cashier" | "admin"
    } & DefaultSession["user"]
  }

  interface User {
    role: "cashier" | "admin"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "cashier" | "admin"
    id: string
  }
}
