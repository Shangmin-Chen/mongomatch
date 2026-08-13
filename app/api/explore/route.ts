import { NextRequest, NextResponse } from "next/server";
import { findMatches } from "@/lib/match.js";
import { draftStageIntro } from "@/lib/narrate.js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawHandle = body.handle || "";

    if (!rawHandle || typeof rawHandle !== "string") {
      return NextResponse.json({ error: "Missing or invalid handle" }, { status: 400 });
    }

    const { target, matches, degraded: matchDegraded } = await findMatches(rawHandle, { limit: 8 });

    if (!target) {
      return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
    }

    const intro = await draftStageIntro(target, matches);

    return NextResponse.json({
      target: {
        handle: target.handle,
        name: target.name || target.handle,
        description: target.description || "",
        tags: target.tags || [],
      },
      candidates: matches,
      chosenHandle: intro.chosenHandle,
      narration: intro.narration,
      degraded: matchDegraded || intro.degraded,
    });
  } catch (err: any) {
    console.error("[api/explore] Error processing explore request:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const handle = searchParams.get("handle");
  if (!handle) {
    return NextResponse.json({ error: "Missing handle parameter" }, { status: 400 });
  }

  const { target, matches, degraded: matchDegraded } = await findMatches(handle, { limit: 8 });

  if (!target) {
    return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  }

  const intro = await draftStageIntro(target, matches);

  return NextResponse.json({
    target: {
      handle: target.handle,
      name: target.name || target.handle,
      description: target.description || "",
      tags: target.tags || [],
    },
    candidates: matches,
    chosenHandle: intro.chosenHandle,
    narration: intro.narration,
    degraded: matchDegraded || intro.degraded,
  });
}
