import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// Lightweight directory listing for /explore's search autocomplete.
// Not used by matching/enrichment — purely a UI convenience.
export async function GET() {
  try {
    const db = await getDb();
    const people = await db
      .collection("people")
      .find({ enriched: true }, { projection: { _id: 0, handle: 1, name: 1, tags: 1 } })
      .sort({ name: 1 })
      .limit(300)
      .toArray();

    return NextResponse.json({ people });
  } catch (error: any) {
    console.error("[api/people] Error listing people:", error);
    return NextResponse.json({ people: [] }, { status: 200 });
  }
}
