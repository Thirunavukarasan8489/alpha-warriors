import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "alpha-warriors-secure-secret-key-at-least-32-chars";
const key = new TextEncoder().encode(JWT_SECRET);

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/portal",
  "/api/invoices/public",
  "/api/parq",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets, public customer self-service pages, PWA icons, manifests, and token-based public APIs
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-") ||
    pathname.startsWith("/manifest") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".json") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/i/") ||
    pathname.startsWith("/parq") ||
    pathname.startsWith("/api/portal") ||
    pathname.startsWith("/api/invoices/public") ||
    pathname.startsWith("/api/parq")
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
  const token = request.cookies.get("auth_session")?.value;

  let isValidSession = false;
  if (token) {
    try {
      await jwtVerify(token, key);
      isValidSession = true;
    } catch {
      isValidSession = false;
    }
  }

  // Redirect to login if unauthenticated on protected page
  if (!isValidSession && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Session required" } },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if logged-in user hits /login or /register
  if (isValidSession && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)"],
};
