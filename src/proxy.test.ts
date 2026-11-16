// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { CURRENT_PATH_HEADER } from "@/lib/current-path-header";

import { proxy } from "./proxy";

// NextResponse.next({ request: { headers } }) forwards the given headers to
// the app by stamping them as response.headers.get(`x-middleware-request-${name}`)
// plus an `x-middleware-override-headers` list — Next reconstructs the
// downstream request from those on its side. See next/dist/server/web/spec-extension/response.js.
function forwardedHeader(response: Response, name: string) {
  return response.headers.get(`x-middleware-request-${name}`);
}

describe("proxy", () => {
  it("stamps the request path on the current-path header", () => {
    const request = new NextRequest("http://localhost:3000/checkout/plan/123");

    const response = proxy(request);

    expect(forwardedHeader(response, CURRENT_PATH_HEADER)).toBe("/checkout/plan/123");
  });

  it("preserves the query string", () => {
    const request = new NextRequest("http://localhost:3000/planes?service=rehab");

    const response = proxy(request);

    expect(forwardedHeader(response, CURRENT_PATH_HEADER)).toBe("/planes?service=rehab");
  });
});
