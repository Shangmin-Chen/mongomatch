import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { findMatches } from "@/lib/match.js";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    if (!slug || slug.length === 0) {
      return NextResponse.json({ error: "Missing handle" }, { status: 400 });
    }

    const pathString = slug.map((s) => s.toLowerCase().trim()).join("/");
    const primaryHandle = slug[0].toLowerCase().trim();

    const db = await getDb();
    const collection = db.collection("people");

    // Search by exact handle (e.g. "owner/repo" or "owner")
    const doc = await collection.findOne({
      $or: [
        { handle: pathString },
        { handle: primaryHandle },
        { github: pathString },
        { github: primaryHandle },
      ],
    });

    if (!doc) {
      return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
    }

    const [position, total] = await Promise.all([
      collection.countDocuments({ createdAt: { $lte: doc.createdAt } }),
      collection.countDocuments({}),
    ]);

    let matches: any[] = [];
    let degraded = false;

    if (doc.enriched) {
      try {
        const matchRes = await findMatches(doc.handle, { limit: 3 });
        matches = matchRes.matches || [];
        degraded = matchRes.degraded || false;
      } catch (matchErr) {
        console.error("[api/person] findMatches error:", matchErr);
      }
    }

    return NextResponse.json({ person: doc, position, total, matches, degraded });
  } catch (error: any) {
    console.error("[api/person] Error fetching attendee:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
