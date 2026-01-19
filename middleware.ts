import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
    matcher: [
        /*
         * Match all paths except for:
         * 1. /api routes
         * 2. /_next (Next.js internals)
         * 3. /_static (inside /public)
         * 4. all root files inside /public (e.g. /favicon.ico)
         */
        "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
    ],
}

export default async function middleware(req: NextRequest) {
    const url = req.nextUrl
    const hostname = req.headers.get("host") || ""
    const pathname = url.pathname

    // Never rewrite these paths - they should always go to main app
    const excludedPaths = ['/auth/', '/dashboard', '/products', '/sales', '/customers', '/staff', '/suppliers', '/reports', '/roles', '/profile', '/calendar']
    const isExcludedPath = excludedPaths.some(path => pathname.startsWith(path))
    if (isExcludedPath) {
        return NextResponse.next()
    }

    // Allow for local development
    // Hostname in local: "hulop.localhost:3000" or "localhost:3000"
    const isLocal = hostname.includes("localhost")

    // Get the subdomain
    let subdomain: string | null = null

    if (isLocal) {
        // Localhost logic
        const parts = hostname.split(".")
        // parts = ["localhost:3000"] -> Length 1 -> Main App
        // parts = ["hulop", "localhost:3000"] -> Length 2 -> Subdomain "hulop"
        if (parts.length > 1) {
            subdomain = parts[0]
        }
    } else {
        // Production logic (example.com)
        // Hostname: "hulop.supashop.com"
        const parts = hostname.split(".")
        // Standard: ["hulop", "supashop", "com"] -> Subdomain is parts[0]
        // If just "supashop.com" -> ["supashop", "com"] -> No subdomain (or check against root domain env)
        if (parts.length > 2) {
            subdomain = parts[0]
        }
    }

    // If we have a subdomain, rewrite to /shop/[subdomain]
    if (subdomain && subdomain !== "www" && subdomain !== "app") {
        console.log(`Rewriting subdomain ${subdomain} to /shop/${subdomain}${pathname}`)
        return NextResponse.rewrite(new URL(`/shop/${subdomain}${pathname}`, req.url))
    }

    return NextResponse.next()
}
