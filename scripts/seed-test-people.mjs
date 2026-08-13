// scripts/seed-test-people.mjs
// Seeds small real open-source projects into `people` as test data for
// exercising the enrichment + (soon) vector search pipeline. Test docs are
// identifiable by handle prefix "mongodbtest" so they're easy to find and
// delete later: db.people.deleteMany({ handle: /^mongodbtest/ })

import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("\n❌ Error: MONGODB_URI environment variable is missing.\n");
  process.exit(1);
}
const DB_NAME = process.env.MONGODB_DB_NAME || "mongomatch";

// 10 small, real open-source projects spanning distinct domains (AI/vector,
// Rust CLI tools, Go TUI, Python CLI) so tags/embeddings actually diverge.
const SEEDS = [
  {
    project: "just",
    github: "casey/just",
    name: "Test: just",
    description:
      "Maintaining a command runner written in Rust. Stuck on getting recipe dependency graphs to resolve cleanly for complex Justfiles.",
  },
  {
    project: "fd",
    github: "sharkdp/fd",
    name: "Test: fd",
    description:
      "Working on a fast alternative to find, written in Rust. Need help profiling filesystem walk performance on network drives.",
  },
  {
    project: "zellij",
    github: "zellij-org/zellij",
    name: "Test: zellij",
    description:
      "Building a terminal workspace/multiplexer in Rust. Looking for someone who's dealt with tricky terminal escape-sequence edge cases.",
  },
  {
    project: "helix",
    github: "helix-editor/helix",
    name: "Test: helix",
    description:
      "Core contributor to a modal text editor written in Rust. Want to pair with someone experienced in tree-sitter grammar authoring.",
  },
  {
    project: "ollama",
    github: "ollama/ollama",
    name: "Test: ollama",
    description:
      "Running local LLM inference tooling in Go. Trying to figure out the best approach for quantized model memory management on constrained hardware.",
  },
  {
    project: "pgvector",
    github: "pgvector/pgvector",
    name: "Test: pgvector",
    description:
      "Building a vector similarity search extension for Postgres in C. Need advice on HNSW index tuning for high-dimensional embeddings.",
  },
  {
    project: "llm",
    github: "simonw/llm",
    name: "Test: llm",
    description:
      "Building a CLI and Python library for talking to large language models. Looking for feedback on plugin architecture for new model providers.",
  },
  {
    project: "bubbletea",
    github: "charmbracelet/bubbletea",
    name: "Test: bubbletea",
    description:
      "Maintaining a Go framework for building terminal user interfaces with the Elm architecture. Debugging flaky state updates under rapid input.",
  },
  {
    project: "pgcli",
    github: "dbcli/pgcli",
    name: "Test: pgcli",
    description:
      "Building a Postgres CLI with autocompletion and syntax highlighting, written in Python. Need help with query plan visualization ideas.",
  },
  {
    project: "ripgrep",
    github: "BurntSushi/ripgrep",
    name: "Test: ripgrep",
    description:
      "Maintaining a line-oriented recursive search tool in Rust. Stuck optimizing regex engine throughput on pathological patterns.",
  },
];

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const peopleCol = db.collection("people");

  console.log(`🌱 Seeding ${SEEDS.length} test people into '${DB_NAME}.people'\n`);

  for (const seed of SEEDS) {
    const handle = `mongodbtest${seed.project.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
    const githubUrl = `https://github.com/${seed.github}`;

    await peopleCol.updateOne(
      { handle },
      {
        $set: {
          name: seed.name,
          description: seed.description,
          email: `mongodbtest+${seed.project}@example.com`,
          github: seed.github,
          githubUrl,
          handle,
          text: seed.description,
          enriched: false,
          isTestSeed: true,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    console.log(`  [SEEDED] ${handle} -> ${seed.github}`);
  }

  await client.close();
  console.log(
    `\n✅ Done. Run 'node scripts/enrich.mjs --only-new' (or full run) to enrich them.` +
      `\n   Cleanup later: db.people.deleteMany({ handle: /^mongodbtest/ })`
  );
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
