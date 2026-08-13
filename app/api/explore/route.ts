import { NextRequest, NextResponse } from "next/server";
import { findMatches } from "@/lib/match.js";
import { draftStageIntro } from "@/lib/narrate.js";
import heroFallbackData from "@/lib/hero-fallback.json";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawHandle = (body.handle || "langchain-ai/langgraph").trim();

    const { target, matches, degraded: matchDegraded } = await findMatches(rawHandle, { limit: 8 });

    if (!target) {
      return NextResponse.json(heroFallbackData);
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
      chosenHandle: intro?.chosenHandle || matches[0]?.handle || target.handle,
      narration: intro?.narration || `Showing top unblocking connections for @${target.handle}.`,
      degraded: matchDegraded || (intro?.degraded ?? false),
    });
  } catch (err: any) {
    console.error("[api/explore] Error processing explore request:", err);
    return NextResponse.json({
      ...heroFallbackData,
      degraded: true,
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get("handle") || "langchain-ai/langgraph";

    const { target, matches, degraded: matchDegraded } = await findMatches(handle, { limit: 8 });

    if (!target) {
      return NextResponse.json(heroFallbackData);
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
      chosenHandle: intro?.chosenHandle || matches[0]?.handle || target.handle,
      narration: intro?.narration || `Showing top unblocking connections for @${target.handle}.`,
      degraded: matchDegraded || (intro?.degraded ?? false),
    });
  } catch (err: any) {
    console.error("[api/explore GET] Error:", err);
    return NextResponse.json({
      ...heroFallbackData,
      degraded: true,
    });
  }
}

