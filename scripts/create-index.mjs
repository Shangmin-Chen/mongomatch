// scripts/create-index.mjs
// Creates and verifies the Atlas autoEmbed vector search index on the `people` collection.

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
const INDEX_NAME = "people_vector";

const INDEX_DEFINITION = {
  name: INDEX_NAME,
  type: "vectorSearch",
  definition: {
    fields: [
      {
        type: "autoEmbed",
        path: "text",
        model: "voyage-4-lite",
        modality: "text",
      },
    ],
  },
};

async function main() {
  console.log(`🔌 Connecting to MongoDB Atlas: ${DB_NAME}`);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db(DB_NAME);
  const collection = db.collection("people");

  // 1. Check existing indexes
  console.log(`🔍 Checking search indexes on '${collection.collectionName}'...`);
  const existingIndexes = await collection.listSearchIndexes().toArray();
  let targetIndex = existingIndexes.find((idx) => idx.name === INDEX_NAME);

  if (!targetIndex) {
    console.log(`⚙️ Creating search index '${INDEX_NAME}' with autoEmbed (model: voyage-4-lite)...`);
    try {
      await collection.createSearchIndex(INDEX_DEFINITION);
      console.log(`✅ Index creation request accepted by Atlas.`);
    } catch (err) {
      console.error(`❌ Index creation failed:`, err.message);
      await client.close();
      process.exit(1);
    }
  } else {
    console.log(`ℹ️ Search index '${INDEX_NAME}' already exists (current status: ${targetIndex.status}).`);
  }

  // 2. Poll until status is READY
  console.log(`⏳ Polling index status until READY...`);
  const startTime = Date.now();
  let isReady = false;

  while (!isReady) {
    const indexes = await collection.listSearchIndexes().toArray();
    targetIndex = indexes.find((idx) => idx.name === INDEX_NAME);

    if (!targetIndex) {
      console.log(`... waiting for index to appear in list ...`);
    } else {
      console.log(`   Status: ${targetIndex.status} (queryable: ${targetIndex.queryable}) [elapsed: ${Math.round((Date.now() - startTime) / 1000)}s]`);
      if (targetIndex.status === "READY" || targetIndex.queryable === true) {
        isReady = true;
        break;
      }
      if (targetIndex.status === "FAILED") {
        console.error(`❌ Index creation failed on Atlas:`, targetIndex.statusDetail || "Unknown failure");
        await client.close();
        process.exit(1);
      }
    }

    await new Promise((res) => setTimeout(res, 2500));
  }

  console.log("\n==================================================");
  console.log(`🎉 Search Index '${INDEX_NAME}' is READY!`);
  console.log("==================================================");
  console.log("Final Index Definition:");
  console.log(JSON.stringify(targetIndex, null, 2));

  await client.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
