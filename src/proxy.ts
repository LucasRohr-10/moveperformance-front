import { NextResponse, type NextRequest } from "next/server";

import { CURRENT_PATH_HEADER } from "@/lib/current-path-header";

// Next has no built-in way for a Server Component to read the page the
// visitor is currently on, so this stamps it onto every request — requireUser
// and the public nav read it to send an anonymous visitor back where they
// were after signing in.
export function proxy(request: NextRequest): NextResponse {
  const headers = new Headers(request.headers);
  headers.set(CURRENT_PATH_HEADER, request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
