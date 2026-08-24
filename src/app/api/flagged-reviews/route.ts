import { NextResponse } from "next/server";

import { authorizeInternalApi } from "@/lib/api/internal-auth";
import { httpStatusForQueryFailure } from "@/lib/queries/query-status";
import { listFlaggedReviewsWithBookings } from "@/lib/queries/reviews";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = authorizeInternalApi(request);
  if (denied) {
    return denied;
  }

  const { data, error, failureKind } = await listFlaggedReviewsWithBookings();

  if (error) {
    return NextResponse.json(
      { data: null, error },
      { status: httpStatusForQueryFailure(failureKind) }
    );
  }

  return NextResponse.json({ data, error: null });
}
