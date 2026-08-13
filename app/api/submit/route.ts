import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "attendee";
}

function cleanGithubHandle(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let s = raw.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.replace(/^www\./, "");
  s = s.replace(/^github\.com\//, "");
  s = s.replace(/^@/, "");
  s = s.split("?")[0].split("#")[0].trim();
  const parts = s.split("/").filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  if (parts.length === 1) return parts[0];
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const rawGithub = typeof body.github === "string" ? body.github.trim() : "";

    // Validation: missing required fields
    if (!name || !description || !email) {
      return NextResponse.json(
        { ok: false, error: "Name, description, and email are required." },
        { status: 400 }
      );
    }

    // Loose email check: contains @ with characters on both sides
    const atIndex = email.indexOf("@");
    if (atIndex <= 0 || atIndex >= email.length - 1) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const github = cleanGithubHandle(rawGithub);
    const githubUrl = github ? `https://github.com/${github}` : null;
    const handle = github || slugify(name);

    const db = await getDb();
    const collection = db.collection("people");

    await collection.updateOne(
      { handle },
      {
        $set: {
          name,
          description,
          email,
          github,
          githubUrl,
          handle,
          text: description,
          enriched: false,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, handle });
  } catch (err) {
    console.error("[api/submit] Internal error:", err);
    // Minimal error handling: anything else logs and returns 200 so user is never blocked
    return NextResponse.json({ ok: true, handle: "attendee" }, { status: 200 });
  }
}
