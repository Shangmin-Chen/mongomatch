// scripts/enrich.mjs
// GitHub Enrichment Worker for MongoMatch
// Deterministically enriches MongoDB Atlas `people` with repos, tags, and rich text.

import { MongoClient } from "mongodb";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { deriveTags, deriveText } from "./tags.mjs";
import { generateMemoryNote } from "../lib/memory.js";

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

// Resolve GitHub Token
let GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  try {
    const token = execSync("gh auth token", { encoding: "utf-8" }).trim();
    if (token) GITHUB_TOKEN = token;
  } catch (err) {
    // gh CLI failed or not logged in
  }
}

if (!GITHUB_TOKEN) {
  console.error("\n❌ Error: GITHUB_TOKEN is required. Run:");
  console.error("   export GITHUB_TOKEN=$(gh auth token)\n");
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("\n❌ Error: MONGODB_URI environment variable is missing.\n");
  process.exit(1);
}

const DB_NAME = process.env.MONGODB_DB_NAME || "mongomatch";

const RESERVED_HANDLES = new Set([
  "settings", "orgs", "features", "about", "pricing", "explore",
  "marketplace", "sponsors", "login", "join", "new", "notifications",
  "form", "profile", "api"
]);

const GITHUB_USERNAME_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/;

// CLI Argument parsing
const args = process.argv.slice(2);
let singleHandle = null;
let onlyNew = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--handle" && args[i + 1]) {
    singleHandle = args[i + 1].trim().toLowerCase();
    i++;
  } else if (args[i] === "--only-new") {
    onlyNew = true;
  }
}

function normalizeHandle(raw) {
  if (!raw || typeof raw !== "string") return null;
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

function validateHandle(raw) {
  const clean = normalizeHandle(raw);
  if (!clean) {
    return { valid: false, reason: "Missing or empty GitHub target" };
  }
  
  if (clean.includes("/")) {
    const [owner, repo] = clean.split("/");
    if (!GITHUB_USERNAME_REGEX.test(owner)) {
      return { valid: false, reason: `Malformed GitHub owner '${owner}'` };
    }
    if (RESERVED_HANDLES.has(owner)) {
      return { valid: false, reason: `Reserved GitHub path '${owner}'` };
    }
    return { valid: true, handle: clean, isRepo: true, owner, repo };
  }

  if (!GITHUB_USERNAME_REGEX.test(clean)) {
    return { valid: false, reason: `Malformed GitHub handle '${clean}'` };
  }
  if (RESERVED_HANDLES.has(clean)) {
    return { valid: false, reason: `Reserved GitHub path '${clean}'` };
  }
  return { valid: true, handle: clean, isRepo: false };
}

async function fetchGithubData(validation) {
  let url = "";
  if (validation.isRepo) {
    url = `https://api.github.com/repos/${validation.owner}/${validation.repo}`;
  } else {
    url = `https://api.github.com/users/${validation.handle}/repos?sort=pushed&per_page=30`;
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "MongoMatch-Enricher",
    },
    signal: AbortSignal.timeout(10000), // 10s timeout
  });

  const rateLimitRemaining = res.headers.get("x-ratelimit-remaining");
  const remainingCount = rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : 5000;

  return { res, remainingCount, isSingleRepo: !!validation.isRepo };
}

async function main() {
  console.log("🚀 Starting MongoMatch GitHub Enrichment Worker");
  console.log(`📡 MongoDB Database: ${DB_NAME}`);
  console.log(`🔑 GitHub Token: Sourced (${GITHUB_TOKEN.substring(0, 7)}...)\n`);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const peopleCol = db.collection("people");
  const tagstatsCol = db.collection("tagstats");

  // Build query
  const query = {};
  if (singleHandle) {
    query.handle = singleHandle;
  } else if (onlyNew) {
    query.enriched = { $ne: true };
  }

  const people = await peopleCol.find(query).toArray();
  console.log(`📋 Found ${people.length} candidate document(s) to process.\n`);

  let enrichedCount = 0;
  let permanentSkipCount = 0;
  let transientSkipCount = 0;
  const skipReasons = {};
  let rateLimitHalted = false;

  // Process worker pool with concurrency 5
  const CONCURRENCY = 5;
  let index = 0;

  async function processDoc(doc) {
    if (rateLimitHalted) return;

    const docId = doc._id;
    const rawGithub = doc.github || (doc.githubUrl ? doc.githubUrl : null);

    // 1. Validation before network call
    const validation = validateHandle(rawGithub);
    if (!validation.valid) {
      permanentSkipCount++;
      skipReasons[validation.reason] = (skipReasons[validation.reason] || 0) + 1;
      console.log(`[PERM-SKIP] ${doc.handle || "unnamed"}: ${validation.reason}`);
      
      await peopleCol.updateOne(
        { _id: docId },
        {
          $set: {
            enriched: true,
            enrichedAt: new Date(),
            tags: [],
            repos: [],
            enrichError: validation.reason,
            text: doc.description || "",
            updatedAt: new Date(),
          },
        }
      );
      return;
    }

    const cleanHandle = validation.handle;

    // 2. Fetch from GitHub
    try {
      const { res, remainingCount, isSingleRepo } = await fetchGithubData(validation);

      if (remainingCount < 50) {
        console.warn(`\n⚠️ GitHub rate limit approaching (< 50 remaining: ${remainingCount}). Halting run cleanly.`);
        rateLimitHalted = true;
        transientSkipCount++;
        return;
      }

      // Handle 404 -> Permanent Skip
      if (res.status === 404) {
        const reason = `GitHub target '@${cleanHandle}' not found (404)`;
        permanentSkipCount++;
        skipReasons[reason] = (skipReasons[reason] || 0) + 1;
        console.log(`[PERM-SKIP] @${cleanHandle}: ${reason}`);

        await peopleCol.updateOne(
          { _id: docId },
          {
            $set: {
              enriched: true,
              enrichedAt: new Date(),
              tags: [],
              repos: [],
              enrichError: reason,
              text: doc.description || "",
              updatedAt: new Date(),
            },
          }
        );
        return;
      }

      // Handle transient errors (403, 429, 5xx)
      if (!res.ok) {
        const reason = `GitHub API HTTP ${res.status}`;
        transientSkipCount++;
        console.log(`[TRANSIENT-SKIP] @${cleanHandle}: ${reason} (will retry next run)`);
        return;
      }

      // Parse repos
      const rawData = await res.json();
      const rawRepos = isSingleRepo ? [rawData] : (Array.isArray(rawData) ? rawData : []);
      if (!Array.isArray(rawRepos) || rawRepos.length === 0) {
        transientSkipCount++;
        console.log(`[TRANSIENT-SKIP] @${cleanHandle}: Invalid JSON response structure`);
        return;
      }

      // Filter: drop forks and archived repos
      const usable = rawRepos.filter((r) => !r.fork && !r.archived);

      if (usable.length === 0) {
        const reason = "Zero usable non-fork non-archived repositories";
        permanentSkipCount++;
        skipReasons[reason] = (skipReasons[reason] || 0) + 1;
        console.log(`[PERM-SKIP] @${cleanHandle}: ${reason}`);

        await peopleCol.updateOne(
          { _id: docId },
          {
            $set: {
              enriched: true,
              enrichedAt: new Date(),
              tags: [],
              repos: [],
              enrichError: reason,
              text: doc.description || "",
              updatedAt: new Date(),
            },
          }
        );
        return;
      }

      // Sort: pushed_at desc, then name asc tiebreaker
      usable.sort((a, b) => {
        const timeA = new Date(a.pushed_at || 0).getTime();
        const timeB = new Date(b.pushed_at || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return (a.name || "").localeCompare(b.name || "");
      });

      // Keep top 10
      const topRepos = usable.slice(0, 10).map((r) => ({
        name: r.name,
        url: r.html_url,
        description: r.description || "",
        language: r.language || null,
        topics: Array.isArray(r.topics) ? r.topics : [],
        stars: r.stargazers_count || 0,
        pushedAt: r.pushed_at,
      }));

      // Derive deterministic tags and rich text
      const tags = deriveTags(doc.description || "", topRepos);
      const text = deriveText(doc.description || "", topRepos, tags);

      // Write back to Atlas
      await peopleCol.updateOne(
        { _id: docId },
        {
          $set: {
            repos: topRepos,
            tags,
            text,
            enriched: true,
            enrichedAt: new Date(),
            updatedAt: new Date(),
          },
          $unset: {
            enrichError: "",
          },
        }
      );

      enrichedCount++;
      console.log(`[ENRICHED] @${cleanHandle} (${topRepos.length} repos, ${tags.length} tags)`);

      // Ingest-time memory pass (PLAN_7): best-effort, grounded in Atlas Vector Search
      try {
        const memoryNote = await generateMemoryNote({
          handle: cleanHandle,
          name: doc.name || cleanHandle,
          description: doc.description || "",
          tags,
          text,
        });

        if (memoryNote && typeof memoryNote === "string") {
          await peopleCol.updateOne(
            { _id: docId },
            {
              $set: {
                memoryNote,
                text: `${text} ${memoryNote}`,
                updatedAt: new Date(),
              },
            }
          );
          console.log(`  └─ [MEMORY-NOTE] @${cleanHandle}: "${memoryNote.slice(0, 75)}..."`);
        }
      } catch (memErr) {
        // Ingest memory pass is non-blocking and never halts enrichment
      }
    } catch (fetchErr) {
      transientSkipCount++;
      console.log(`[TRANSIENT-SKIP] @${cleanHandle}: Network/timeout error (${fetchErr.message})`);
    }
  }

  // Run concurrency pool
  async function worker() {
    while (index < people.length && !rateLimitHalted) {
      const i = index++;
      await processDoc(people[i]);
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  // 4. Tag Rarity Pass — single aggregation over people
  console.log("\n📊 Computing Tag Rarity Aggregation into 'tagstats'...");
  const tagAgg = await peopleCol.aggregate([
    { $match: { tags: { $exists: true, $ne: [] } } },
    { $unwind: "$tags" },
    {
      $group: {
        _id: "$tags",
        count: { $sum: 1 },
        people: { $addToSet: "$handle" },
      },
    },
    { $sort: { count: -1, _id: 1 } },
  ]).toArray();

  if (tagAgg.length > 0) {
    await tagstatsCol.deleteMany({});
    await tagstatsCol.insertMany(tagAgg);
  }

  // 5. Output Summary Report
  console.log("\n==================================================");
  console.log("📈 MongoMatch Enrichment Summary");
  console.log("==================================================");
  console.log(`Total Candidate Rows : ${people.length}`);
  console.log(`Enriched Successfully: ${enrichedCount}`);
  console.log(`Permanently Skipped  : ${permanentSkipCount}`);
  console.log(`Left for Retry       : ${transientSkipCount}`);

  if (Object.keys(skipReasons).length > 0) {
    console.log("\nPermanent Skip Breakdown:");
    for (const [reason, count] of Object.entries(skipReasons)) {
      console.log(`  - ${reason}: ${count}`);
    }
  }

  console.log("\nTop 15 Most Common Tags in Graph:");
  const top15 = tagAgg.slice(0, 15);
  if (top15.length === 0) {
    console.log("  (No tags found in graph yet)");
  } else {
    for (const t of top15) {
      console.log(`  - ${t._id.padEnd(25)} : ${t.count} attendee(s)`);
    }
  }

  // Fetch one example enriched document
  const exampleDoc = await peopleCol.findOne({ enriched: true, repos: { $ne: [] } });
  if (exampleDoc) {
    console.log("\n📄 Example Enriched Document:");
    console.log(JSON.stringify(exampleDoc, null, 2));
  }

  await client.close();
  console.log("\n✅ Enrichment run complete.");
}

main().catch((err) => {
  console.error("Enrichment failed:", err);
  process.exit(1);
});
