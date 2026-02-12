import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { auth0 } from "./lib/auth0";
import { resolveAuthStrategy } from "./lib/auth";
import { assertValidAuthConfig } from "./lib/auth/validate-config";

const PUBLIC_ROUTES = ["/sign-in", "/sign-out", "/auth"];

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;

  const isPublicRoute =
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public");

  // For Clerk, we need to use their middleware wrapper
  if (process.env.AUTH_PROVIDER === "clerk") {
    const isProtectedRoute = createRouteMatcher([
      "/((?!sign-in|sign-out|api/auth|_next|public).*)",
    ]);

    const handler = clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req) && !(await auth()).userId) {
        const signInUrl = new URL("/sign-in", req.url);
        return NextResponse.redirect(signInUrl);
      }
      return NextResponse.next();
    });

    return handler(request, event);
  }

  // For Auth0 v4, use the auth0 client middleware
  if (process.env.AUTH_PROVIDER === "auth0") {
    const authRes = await auth0.middleware(request);

    // Ensure routes starting with /auth are handled by the SDK
    if (pathname.startsWith("/auth")) {
      return authRes;
    }

    // Allow access to public routes without requiring a session
    if (pathname === "/") {
      return authRes;
    }

    // Protected routes - require authentication
    const session = await auth0.getSession(request);
    if (!session) {
      const { origin } = new URL(request.url);
      return NextResponse.redirect(`${origin}/auth/login`);
    }

    return authRes;
  }

  // Fallback for other providers
  if (isPublicRoute) {
    return NextResponse.next();
  }

  try {
    const strategy = resolveAuthStrategy();
    assertValidAuthConfig(strategy);
    return (await strategy.protectRoute(request)) || NextResponse.next();
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (
        message.includes("AUTH_PROVIDER env var is required") ||
        message.includes("Unsupported auth provider") ||
        message.includes("Missing required auth configuration")
      ) {
        throw error;
      }
    }

    console.error("Middleware auth error:", error);
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
