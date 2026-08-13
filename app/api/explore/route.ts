import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { findMatches } from "@/lib/match.js";
import { draftStageIntro } from "@/lib/narrate.js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawHandle = body.handle || "mongodbtesthelix";

    const db = await getDb();
    const peopleCol = db.collection("people");

    // 1. Fetch all enriched people in the conference graph
    const allPeopleDocs = await peopleCol
      .find({ enriched: true })
      .project({
        _id: 0,
        handle: 1,
        name: 1,
        description: 1,
        tags: 1,
        email: 1,
        repos: 1,
        githubUrl: 1,
      })
      .toArray();

    // 2. Compute matches for the active target
    const { target, matches, degraded: matchDegraded } = await findMatches(rawHandle, { limit: 8 });

    if (!target) {
      return NextResponse.json({
        allPeople: allPeopleDocs,
        target: null,
        candidates: [],
        chosenHandle: null,
        narration: `Attendee '@${rawHandle}' not found in the graph.`,
        degraded: false,
      });
    }

    const intro = await draftStageIntro(target, matches);

    return NextResponse.json({
      allPeople: allPeopleDocs,
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
  const handle = searchParams.get("handle") || "mongodbtesthelix";

  const db = await getDb();
  const peopleCol = db.collection("people");

  const allPeopleDocs = await peopleCol
    .find({ enriched: true })
    .project({
      _id: 0,
      handle: 1,
      name: 1,
      description: 1,
      tags: 1,
      email: 1,
      repos: 1,
      githubUrl: 1,
    })
    .toArray();

  const { target, matches, degraded: matchDegraded } = await findMatches(handle, { limit: 8 });

  if (!target) {
    return NextResponse.json({
      allPeople: allPeopleDocs,
      target: null,
      candidates: [],
      chosenHandle: null,
      narration: `Attendee '@${handle}' not found.`,
      degraded: false,
    });
  }

  const intro = await draftStageIntro(target, matches);

  return NextResponse.json({
    allPeople: allPeopleDocs,
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
