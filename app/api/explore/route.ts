import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { findMatches } from "@/lib/match.js";
import { draftStageIntro } from "@/lib/narrate.js";
import heroFallbackData from "@/lib/hero-fallback.json";

async function getExploreResponse(requestedHandle?: string | null) {
  try {
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

    const cleanHandle = (requestedHandle || "").trim().toLowerCase();

    // 2. Compute matches for requested target or first available attendee
    let targetDoc: any = null;
    let matchResult: any = { target: null, matches: [], degraded: false };

    if (cleanHandle) {
      matchResult = await findMatches(cleanHandle, { limit: 8 });
      targetDoc = matchResult.target;
    }

    // If requested handle not found, default to first enriched attendee
    if (!targetDoc && allPeopleDocs.length > 0) {
      const fallbackHandle = allPeopleDocs[0].handle;
      matchResult = await findMatches(fallbackHandle, { limit: 8 });
      targetDoc = matchResult.target;
    }

    // If database has no attendees or matching failed, return hero fallback
    if (!targetDoc) {
      return {
        allPeople: allPeopleDocs.length > 0 ? allPeopleDocs : [heroFallbackData.target, ...heroFallbackData.candidates],
        ...heroFallbackData,
        degraded: true,
      };
    }

    const { target, matches, degraded: matchDegraded } = matchResult;
    const intro = await draftStageIntro(target, matches);

    return {
      allPeople: allPeopleDocs,
      target: {
        handle: target.handle,
        name: target.name || target.handle,
        description: target.description || "",
        tags: target.tags || [],
      },
      candidates: matches,
      chosenHandle: intro?.chosenHandle || matches[0]?.handle || target.handle,
      narration: intro?.narration || `Showing top unblocking connections for @${target.handle}.`,
      degraded: matchDegraded || (intro?.degraded ?? false),
    };
  } catch (err: any) {
    console.error("[api/explore] Error connecting to database, returning hero fallback:", err);
    return {
      allPeople: [heroFallbackData.target, ...heroFallbackData.candidates],
      ...heroFallbackData,
      degraded: true,
    };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const rawHandle = body.handle || null;
  const result = await getExploreResponse(rawHandle);
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const handle = searchParams.get("handle") || null;
  const result = await getExploreResponse(handle);
  return NextResponse.json(result);
}

