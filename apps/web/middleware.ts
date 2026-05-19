import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Reads NEXT_PUBLIC_BASE_DOMAIN at runtime. Set to "dearpos.com" in prod.
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "dearpos.com";

export function middleware(req: NextRequest): NextResponse {
  const hostname = req.headers.get("host") ?? "";
  // Strip port (present in local dev: localhost:3000)
  const host = hostname.replace(/:\d+$/, "");

  // Pass through: base domain, www, localhost
  if (
    host === BASE_DOMAIN ||
    host === `www.${BASE_DOMAIN}` ||
    host === "localhost" ||
    host.endsWith(".localhost")
  ) {
    return NextResponse.next();
  }

  // Subdomain tenant: taco-truck.dearpos.com → slug = "taco-truck"
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const slug = host.slice(0, -(BASE_DOMAIN.length + 1));
    if (slug) return rewriteForTenant(req, slug);
  }

  // Custom domain: pos.myshop.com → look up Business by customDomain.
  // v1: manual ops only (J adds the domain to Vercel + Business.customDomain by hand).
  // v2: fetch /api/tenant/resolve?domain=... → slug → rewrite here.
  return NextResponse.next();
}

function rewriteForTenant(req: NextRequest, slug: string): NextResponse {
  const { pathname, search } = req.nextUrl;

  // /admin or /admin/* → /admin/[slug]/*
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const rest = pathname.slice("/admin".length);
    return NextResponse.rewrite(
      new URL(`/admin/${slug}${rest}${search}`, req.url),
    );
  }

  // /kitchen or /kitchen/* → /kitchen/[slug]/*
  if (pathname === "/kitchen" || pathname.startsWith("/kitchen/")) {
    const rest = pathname.slice("/kitchen".length);
    return NextResponse.rewrite(
      new URL(`/kitchen/${slug}${rest}${search}`, req.url),
    );
  }

  // All other paths (/, /login, /checkout/*, /receipt/*, /clock-out, etc.)
  // map to /pos/[slug] + path
  const posPath = pathname === "/" ? "" : pathname;
  return NextResponse.rewrite(
    new URL(`/pos/${slug}${posPath}${search}`, req.url),
  );
}

export const config = {
  // Skip Next.js internals, static assets, favicon, and API routes.
  // API routes handle their own auth; middleware only rewrites page routes.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/).*)"],
};
