import type React from "react"
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { CartProvider } from "./context/cart-context"
import { ProductProvider } from "./context/product-context"
import { Providers } from "./providers"
import SwRegister from "./components/sw-register"

export const metadata: Metadata = {
  title: "Coron Grill Diners - POS System",
  description: "Point of Sale System for Coron Grill Diners",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CGD POS",
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-gray-100" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
        <Providers>
          <ProductProvider>
            <CartProvider>
              <SwRegister />
              {children}
            </CartProvider>
          </ProductProvider>
        </Providers>
      </body>
    </html>
  )
}
