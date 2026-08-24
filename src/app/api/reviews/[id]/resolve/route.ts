import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { authorizeInternalApi } from "@/lib/api/internal-auth";
import { httpStatusForQueryFailure } from "@/lib/queries/query-status";
import { resolveReview } from "@/lib/queries/reviews";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function revalidateReviewPaths(reviewId: string) {
  revalidatePath("/");
  revalidatePath("/action-needed");
  revalidatePath(`/action-needed/${reviewId}`);
  revalidatePath("/reviews");
  revalidatePath("/flagged");
  revalidatePath(`/flagged/${reviewId}`);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = authorizeInternalApi(request);
  if (denied) {
    return denied;
  }

  const { id } = await context.params;
  const reviewId = id.trim();

  if (!reviewId) {
    return NextResponse.json(
      { data: null, error: "Review id is required." },
      { status: 400 }
    );
  }

  const { data, error, failureKind } = await resolveReview(reviewId);

  if (error) {
    return NextResponse.json(
      { data: null, error },
      { status: httpStatusForQueryFailure(failureKind) }
    );
  }

  if (!data) {
    return NextResponse.json(
      { data: null, error: "Review not found or already resolved." },
      { status: 404 }
    );
  }

  revalidateReviewPaths(reviewId);
  return NextResponse.json({ data, error: null });
}
