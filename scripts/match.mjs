// scripts/match.mjs
// CLI harness to test and verify `findMatches(handle)` against MongoDB Atlas.

import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findMatches } from "../lib/match.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present
function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        const key = k.trim();
        let val = v.join("=").trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI environment variable is missing.");
  process.exit(1);
}

const args = process.argv.slice(2);
const isAll = args.includes("--all");
const singleHandle = args.find((a) => !a.startsWith("--"));

if (!isAll && !singleHandle) {
  console.error("❌ Usage: node scripts/match.mjs <handle> OR node scripts/match.mjs --all");
  process.exit(1);
}

async function runSingle(handle) {
  console.log(`\n🔍 Finding matches for: @${handle}`);
  const result = await findMatches(handle);

  if (!result.target) {
    console.log(`❌ Target attendee '@${handle}' not found in MongoDB.`);
    return;
  }

  const { target, matches, degraded } = result;
  console.log(`Target: ${target.name || target.handle} (@${target.handle})`);
  console.log(`Ask   : "${target.description}"`);
  console.log(`Tags  : [${(target.tags || []).join(", ")}]`);
  if (degraded) console.log(`⚠️ Status: DEGRADED mode active`);

  console.log(`\n🏆 Top Matches (${matches.length} found):`);
  console.log("--------------------------------------------------------------------------------");

  if (matches.length === 0) {
    console.log("No unblocker matches found in graph.");
  } else {
    matches.forEach((m, idx) => {
      const bd = m.breakdown || {};
      console.log(`\n#${idx + 1} | @${m.handle} (${m.name})`);
      console.log(`    Total Score : ${m.score.toFixed(2)} [Tag: ${bd.directTagScore || 0} + GraphHop: ${bd.secondHopScore || 0} + Vector: ${bd.vectorContribution || 0} (raw: ${bd.rawVectorScore || 0})]`);
      console.log(`    Reason Tag  : #${m.reason}`);
      console.log(`    Shared Tags : [${m.sharedTags.join(", ")}]`);
      if (m.evidenceRepo) {
        console.log(`    Proof Repo  : ${m.evidenceRepo.name} (${m.evidenceRepo.language || "code"}, ⭐ ${m.evidenceRepo.stars}) -> ${m.evidenceRepo.url}`);
        if (m.evidenceRepo.description) {
          console.log(`                  "${m.evidenceRepo.description}"`);
        }
      }
      console.log(`    Hop Path    : ${m.path.map((h) => `${h.type}: ${h.label}`).join(" ──▶ ")}`);
    });
  }
  console.log("--------------------------------------------------------------------------------\n");
}

async function runAll() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || "mongomatch");
  const people = await db.collection("people").find({ enriched: true }).toArray();
  await client.close();

  console.log(`\n📊 Running MongoMatch Pipeline for all ${people.length} enriched attendees:\n`);

  for (const person of people) {
    const res = await findMatches(person.handle);
    const top = res.matches[0];
    if (top) {
      console.log(
        `@${person.handle.padEnd(22)} ──▶  Top: @${top.handle.padEnd(22)} (Score: ${top.score.toFixed(2).padStart(5)}, Reason: #${top.reason})`
      );
    } else {
      console.log(`@${person.handle.padEnd(22)} ──▶  No matches found`);
    }
  }
  console.log("\n✅ All matches computed.\n");
}

async function main() {
  if (isAll) {
    await runAll();
  } else {
    await runSingle(singleHandle);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Match execution failed:", err);
  process.exit(1);
});
