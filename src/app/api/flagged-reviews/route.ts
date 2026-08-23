import { NextResponse } from "next/server";

import { listFlaggedReviewsWithBookings } from "@/lib/queries/reviews";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { data, error } = await listFlaggedReviewsWithBookings();

  if (error) {
    return NextResponse.json({ data: null, error }, { status: 500 });
  }

  return NextResponse.json({ data, error: null });
}
