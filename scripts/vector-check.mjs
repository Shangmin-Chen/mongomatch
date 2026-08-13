// scripts/vector-check.mjs
// Runs a semantic vector search query against MongoDB Atlas `people_vector` index.

import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

const DB_NAME = process.env.MONGODB_DB_NAME || "mongomatch";
const queryText = process.argv[2];

if (!queryText || !queryText.trim()) {
  console.error('❌ Usage: node scripts/vector-check.mjs "<query>"');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db(DB_NAME);
  const collection = db.collection("people");

  console.log(`🔎 Running Atlas Vector Search for: "${queryText}"`);

  const pipeline = [
    {
      $vectorSearch: {
        index: "people_vector",
        path: "text",
        query: queryText.trim(),
        numCandidates: 20,
        limit: 10,
      },
    },
    {
      $project: {
        _id: 0,
        handle: 1,
        name: 1,
        description: 1,
        tags: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];

  const results = await collection.aggregate(pipeline).toArray();

  console.log("\n🏆 Vector Search Results (Ranked by Semantic Similarity):");
  console.log("----------------------------------------------------------");
  if (results.length === 0) {
    console.log("No vector matches found.");
  } else {
    results.forEach((r, idx) => {
      console.log(
        `#${idx + 1} | Score: ${r.score.toFixed(4)} | @${r.handle.padEnd(20)} | ${r.name} - "${r.description}"`
      );
    });
  }
  console.log("----------------------------------------------------------\n");

  await client.close();
}

main().catch((err) => {
  console.error("Vector check failed:", err);
  process.exit(1);
});
