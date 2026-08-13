import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

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
    let doc = await collection.findOne({
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

    return NextResponse.json({ person: doc });
  } catch (error: any) {
    console.error("[api/person] Error fetching attendee:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
