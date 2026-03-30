import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { CartProvider } from "./context/cart-context"
import { ProductProvider } from "./context/product-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Coron Grill Diners - POS System",
  description: "Point of Sale System for Coron Grill Diners",
  generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100`}>
        <ProductProvider>
          <CartProvider>{children}</CartProvider>
        </ProductProvider>
      </body>
    </html>
  )
}
