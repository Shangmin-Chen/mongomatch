// scripts/qa_verify.mjs
// Rigorous QA verification script for MongoMatch matching pipeline (PLAN 3b)

import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findMatches } from "../lib/match.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
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

const results = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    results.push({ test: message, status: "PASS" });
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    results.push({ test: message, status: "FAIL" });
  }
}

async function runTests() {
  console.log("================================================================================");
  console.log("🧪 STARTING MONGOMATCH PLAN 3B RIGOROUS QA VERIFICATION SUITE");
  console.log("================================================================================\n");

  // 1. Export verification
  console.log("--- 1. Module Export Verification ---");
  assert(typeof findMatches === "function", "`lib/match.js` exports `findMatches` as a function");

  // 2. Non-existent and edge input tests
  console.log("\n--- 2. Edge Case & Non-Existent Handle Tests ---");
  try {
    const resNonExistent = await findMatches("nonexistent_user_xyz_9999");
    assert(
      resNonExistent &&
        resNonExistent.target === null &&
        Array.isArray(resNonExistent.matches) &&
        resNonExistent.matches.length === 0 &&
        resNonExistent.degraded === false,
      "findMatches('nonexistent_user_xyz_9999') returns { target: null, matches: [], degraded: false } without throwing"
    );

    const resEmpty = await findMatches("");
    assert(
      resEmpty && resEmpty.target === null && resEmpty.matches.length === 0,
      "findMatches('') returns { target: null, matches: [], degraded: false } safely"
    );

    const resNull = await findMatches(null);
    assert(
      resNull && resNull.target === null && resNull.matches.length === 0,
      "findMatches(null) returns { target: null, matches: [], degraded: false } safely"
    );
  } catch (err) {
    assert(false, `Edge case threw error: ${err.message}`);
  }

  // 3. Test Case 1: mongodbtestollama (AI / local LLM in Go)
  console.log("\n--- 3. Test Case 1: mongodbtestollama (AI / LLM in Go) ---");
  try {
    const resOllama = await findMatches("mongodbtestollama");
    assert(resOllama && resOllama.target && resOllama.target.handle === "mongodbtestollama", "Found target @mongodbtestollama");
    assert(resOllama.matches && resOllama.matches.length > 0, "Returned matches for @mongodbtestollama");

    const topHandles = resOllama.matches.map((m) => m.handle);
    console.log(`     Top matches for @mongodbtestollama: ${topHandles.join(", ")}`);
    assert(
      topHandles.includes("mongodbtestllm") || topHandles.includes("hwchase17/langchain"),
      "Top matches include AI peers (@mongodbtestllm / @hwchase17/langchain)"
    );
    assert(
      topHandles[0] === "mongodbtestllm" || topHandles[0] === "hwchase17/langchain",
      `Rank #1 is an AI peer (${topHandles[0]})`
    );
  } catch (err) {
    assert(false, `mongodbtestollama failed: ${err.message}`);
  }

  // 4. Test Case 2: mongodbtesthelix (Rust modal editor)
  console.log("\n--- 4. Test Case 2: mongodbtesthelix (Rust modal editor) ---");
  try {
    const resHelix = await findMatches("mongodbtesthelix");
    assert(resHelix && resHelix.target && resHelix.target.handle === "mongodbtesthelix", "Found target @mongodbtesthelix");
    assert(resHelix.matches && resHelix.matches.length > 0, "Returned matches for @mongodbtesthelix");

    const topHandles = resHelix.matches.map((m) => m.handle);
    console.log(`     Top matches for @mongodbtesthelix: ${topHandles.join(", ")}`);
    const rustPeers = ["mongodbtestzellij", "mongodbtestjust", "mongodbtestripgrep"];
    const hasRustPeer = topHandles.some((h) => rustPeers.includes(h));
    assert(hasRustPeer, `Top matches contain Rust peers (${rustPeers.join(", ")})`);
    assert(
      rustPeers.includes(topHandles[0]),
      `Rank #1 is a Rust peer (${topHandles[0]})`
    );
  } catch (err) {
    assert(false, `mongodbtesthelix failed: ${err.message}`);
  }

  // 5. Test Case 3: mongodbtestpgvector (Vector extension in C)
  console.log("\n--- 5. Test Case 3: mongodbtestpgvector (Vector DB in C) ---");
  try {
    const resPgVector = await findMatches("mongodbtestpgvector");
    assert(resPgVector && resPgVector.target && resPgVector.target.handle === "mongodbtestpgvector", "Found target @mongodbtestpgvector");
    assert(resPgVector.matches && resPgVector.matches.length > 0, "Returned matches for @mongodbtestpgvector");

    const topHandles = resPgVector.matches.map((m) => m.handle);
    console.log(`     Top matches for @mongodbtestpgvector: ${topHandles.join(", ")}`);
    assert(
      topHandles.includes("mongodbtestpgcli") || topHandles.includes("redis/redis"),
      "Top matches include database peers (@mongodbtestpgcli / @redis/redis)"
    );
    assert(
      topHandles[0] === "mongodbtestpgcli" || topHandles[0] === "redis/redis",
      `Rank #1 is a DB peer (${topHandles[0]})`
    );
  } catch (err) {
    assert(false, `mongodbtestpgvector failed: ${err.message}`);
  }

  // 6. Test Case 4: shadcn/ui (React UI components)
  console.log("\n--- 6. Test Case 4: shadcn/ui (React UI Components) ---");
  try {
    const resShadcn = await findMatches("shadcn/ui");
    assert(resShadcn && resShadcn.target && resShadcn.target.handle === "shadcn/ui", "Found target @shadcn/ui");
    assert(resShadcn.matches && resShadcn.matches.length > 0, "Returned matches for @shadcn/ui");
    const topMatch = resShadcn.matches[0];
    console.log(`     Top match for @shadcn/ui: @${topMatch.handle} (Score: ${topMatch.score})`);
    assert(topMatch.score > 0, "Top match has positive score");
  } catch (err) {
    assert(false, `shadcn/ui failed: ${err.message}`);
  }

  // 7. Degradation Path: Empty tags person (vector-only fallback)
  console.log("\n--- 7. Degradation Path: Empty Tags Person (Vector Fallback) ---");
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || "mongomatch");
  const peopleCol = db.collection("people");

  const testEmptyTagHandle = "mongodbtest_empty_tag_qa";
  try {
    // Insert dummy person with empty tags
    await peopleCol.deleteOne({ handle: testEmptyTagHandle });
    await peopleCol.insertOne({
      handle: testEmptyTagHandle,
      name: "Empty Tag QA Test",
      email: "empty_tag@test.com",
      github: testEmptyTagHandle,
      githubUrl: `https://github.com/${testEmptyTagHandle}`,
      description: "Building fast terminal user interfaces and text editors in Rust and Go.",
      text: "Building fast terminal user interfaces and text editors in Rust and Go.",
      tags: [], // intentionally empty
      repos: [],
      enriched: true,
      createdAt: new Date(),
    });

    const resEmptyTag = await findMatches(testEmptyTagHandle);
    assert(resEmptyTag && resEmptyTag.target && resEmptyTag.target.handle === testEmptyTagHandle, "Found empty-tag test person in DB");
    assert(Array.isArray(resEmptyTag.matches) && resEmptyTag.matches.length > 0, "Matches returned via vector search even with empty tags: []");
    assert(resEmptyTag.matches[0].breakdown.directTagScore === 0, "directTagScore is 0 as expected with empty tags");
    assert(resEmptyTag.matches[0].breakdown.vectorContribution > 0, "vectorContribution > 0 driving the ranking");
    console.log(`     Top match for empty tags user: @${resEmptyTag.matches[0].handle} (Score: ${resEmptyTag.matches[0].score}, Vector: ${resEmptyTag.matches[0].breakdown.vectorContribution})`);
  } catch (err) {
    assert(false, `Empty tags test threw error: ${err.message}`);
  } finally {
    // Clean up dummy document
    await peopleCol.deleteOne({ handle: testEmptyTagHandle });
    await client.close();
  }

  // 8. Match Data Contract & Structure Validation
  console.log("\n--- 8. Match Contract & Schema Validation ---");
  try {
    const sampleRes = await findMatches("mongodbtestllm");
    assert(sampleRes.target !== null, "Sample response has non-null target");
    assert(sampleRes.matches.length > 0, "Sample response has matches");

    const sampleMatch = sampleRes.matches[0];
    const requiredKeys = ["handle", "name", "email", "github", "githubUrl", "description", "sharedTags", "reason", "path", "score", "breakdown"];
    const missingKeys = requiredKeys.filter((k) => !(k in sampleMatch));
    assert(missingKeys.length === 0, `Match object contains all required keys: [${requiredKeys.join(", ")}] (missing: none)`);

    const breakdownKeys = ["totalScore", "directTagScore", "secondHopScore", "vectorContribution", "rawVectorScore"];
    const missingBreakdownKeys = breakdownKeys.filter((k) => !(k in sampleMatch.breakdown));
    assert(missingBreakdownKeys.length === 0, `Breakdown object contains all required keys: [${breakdownKeys.join(", ")}]`);

    assert(Array.isArray(sampleMatch.path) && sampleMatch.path.length === 4, "Match hop path has exactly 4 nodes (person -> tag -> repo -> match)");
    assert(sampleMatch.path[0].type === "person", "Path node 0 is 'person'");
    assert(sampleMatch.path[1].type === "tag", "Path node 1 is 'tag'");
    assert(sampleMatch.path[2].type === "repo", "Path node 2 is 'repo'");
    assert(sampleMatch.path[3].type === "match", "Path node 3 is 'match'");
  } catch (err) {
    assert(false, `Contract validation failed: ${err.message}`);
  }

  // 9. Summary
  console.log("\n================================================================================");
  console.log("📊 QA TEST SUITE SUMMARY");
  console.log("================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`Total Checks: ${total} | Passed: ${passed} | Failed: ${failed}`);
  if (failed === 0) {
    console.log("🎉 ALL QUALITY ASSURANCE CHECKS PASSED PERFECTLY!");
  } else {
    console.error(`⚠️ ${failed} CHECKS FAILED!`);
  }
  console.log("================================================================================\n");

  return failed === 0;
}

runTests().then((success) => {
  process.exit(success ? 0 : 1);
});
