import { NextRequest, NextResponse } from "next/server";
import { verifyTokenEdge } from "@/lib/rbac/edge-verify";
import {
  getRouteSecurityRequirement,
  sanitizeRedirectUrl,
  checkRouteAuthorization,
} from "@/lib/rbac/routes";

export const SESSION_COOKIE_NAME = "szwbt_session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Check if requested path has a declared security requirement
  const routeRequirement = getRouteSecurityRequirement(pathname);

  // If path is not protected, allow immediate passthrough
  if (!routeRequirement) {
    return NextResponse.next();
  }

  // 2. Check if request is a client-side prefetch (e.g. Next.js <Link> prefetching)
  const isPrefetch =
    req.headers.get("next-router-prefetch") === "1" ||
    req.headers.get("purpose") === "prefetch" ||
    req.headers.get("x-middleware-prefetch") === "1";

  // 3. Extract Session Token
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    if (isPrefetch) {
      // Do not redirect prefetch requests: return 204 No Content to avoid client-side router rejection
      return new NextResponse(null, { status: 204 });
    }
    // Unauthenticated: Redirect to login with safe internal returnTo
    const loginUrl = new URL("/login", req.url);
    const safeReturnTo = sanitizeRedirectUrl(pathname, "/admin");
    loginUrl.searchParams.set("returnTo", safeReturnTo);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Cryptographic Token Signature & Expiry Verification (Edge Web Crypto)
  const verified = await verifyTokenEdge(token);

  if (!verified) {
    if (isPrefetch) {
      return new NextResponse(null, { status: 204 });
    }
    // Corrupted or expired session: Redirect to login and clear cookie
    const loginUrl = new URL("/login", req.url);
    const safeReturnTo = sanitizeRedirectUrl(pathname, "/admin");
    loginUrl.searchParams.set("returnTo", safeReturnTo);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return res;
  }

  // 4. Authoritative Server-Side Route Permission Evaluation
  // Pure RBAC: URL is NOT security. Enforces required permission for route.
  const authCheck = checkRouteAuthorization(pathname, verified.permissions, verified.roles);

  if (!authCheck.authorized) {
    // UNAUTHORIZED ATTEMPT: Manual URL manipulation or missing clearance
    console.warn(
      `[SECURITY 403] User '${verified.email}' denied access to '${pathname}'. Reason: ${authCheck.reason}`
    );

    // If API request, respond with raw 403 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          error: `403 Forbidden: Insufficient clearance for ${routeRequirement.name}. Required: [${routeRequirement.requiredPermission}]`,
        },
        { status: 403 }
      );
    }

    // For browser navigation: Redirect to canonical /403 Forbidden page
    const forbiddenUrl = new URL("/403", req.url);
    forbiddenUrl.searchParams.set("route", pathname);
    forbiddenUrl.searchParams.set("required", routeRequirement.requiredPermission || "AUTHENTICATED_ROLE");
    return NextResponse.redirect(forbiddenUrl);
  }

  // 5. Authorized: Inject trusted identity headers for downstream handlers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", verified.userId);
  requestHeaders.set("x-user-email", verified.email);
  requestHeaders.set("x-user-roles", verified.roles.join(","));

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/official/:path*",
    "/organizer/:path*",
    "/operations/:path*",
    "/volunteer/:path*",
    "/support/:path*",
    "/team/:path*",
    "/dashboard/:path*",
    "/profile/:path*",
    "/scanner/:path*",
  ],
};
