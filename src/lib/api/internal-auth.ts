import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

const BEARER_PREFIX = "Bearer ";

function unauthorizedResponse() {
  return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
}

function lockedResponse() {
  return NextResponse.json(
    {
      data: null,
      error:
        "Privileged API is locked. Set DASHBOARD_API_SECRET as a non-public env var.",
    },
    { status: 503 }
  );
}

function secretsEqual(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function getDashboardApiSecret(): string | null {
  if (
    process.env.NEXT_PUBLIC_DASHBOARD_API_SECRET ||
    process.env.VITE_DASHBOARD_API_SECRET
  ) {
    return null;
  }

  const secret = process.env.DASHBOARD_API_SECRET;
  return secret ? secret : null;
}

/** Returns a 401/503 response when the caller is not allowed; otherwise null. */
export function authorizeInternalApi(request: Request): NextResponse | null {
  const secret = getDashboardApiSecret();
  if (!secret) {
    return lockedResponse();
  }

  const header = request.headers.get("authorization");
  const token =
    header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : "";

  if (!token || !secretsEqual(token, secret)) {
    return unauthorizedResponse();
  }

  return null;
}
