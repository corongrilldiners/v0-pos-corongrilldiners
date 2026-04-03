/** @type {import('next').NextConfig} */

// Dynamically set NEXTAUTH_URL to the actual running domain so sign-in/sign-out
// redirects work correctly regardless of which Replit domain is active.
if (process.env.REPLIT_DEV_DOMAIN && !process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.REPLIT_DEV_DOMAIN}`
}

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production"
    if (!isDev) return []
    return [
      {
        source: "/_next/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ]
  },
}

export default nextConfig
