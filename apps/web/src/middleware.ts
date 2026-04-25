import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that don't require auth
const PUBLIC_PATHS = ["/login", "/register", "/_next", "/favicon.ico"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for session_id cookie
  const sessionId = request.cookies.get("session_id")?.value;
  if (!sessionId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Validate session by calling backend
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${backendUrl}/api/auth/me`, {
      headers: { Cookie: `session_id=${sessionId}` },
    });

    if (!res.ok) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("session_id");
      return response;
    }

    // Parse role from response for route-level authorization
    const data = await res.json();
    const role = data.data?.user?.role;

    // Admin pages: require role >= 10
    if (pathname.startsWith("/admin/")) {
      if (role < 10) {
        return NextResponse.redirect(new URL("/login?error=forbidden", request.url));
      }
    }

    // Student pages: allow role 1 and above
    if (pathname.startsWith("/student/")) {
      // All authenticated users can access student pages
    }

    return NextResponse.next();
  } catch {
    // Fail closed: deny access when backend is unreachable
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session_id");
    return response;
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
