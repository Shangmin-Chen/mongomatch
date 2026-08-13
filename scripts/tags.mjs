// scripts/tags.mjs
// Dictionaries, normalization rules, and deterministic tag/text derivation.

export const DICTIONARIES = {
  stack: [
    "mongodb", "postgres", "mysql", "sqlite", "redis", "kafka", "elasticsearch",
    "neo4j", "duckdb", "snowflake", "supabase", "firebase", "prisma", "drizzle",
    "react", "vue", "svelte", "angular", "nextjs", "remix", "astro", "tailwind",
    "node", "express", "fastapi", "django", "flask", "rails", "spring", "dotnet",
    "docker", "kubernetes", "terraform", "ansible", "aws", "gcp", "azure",
    "vercel", "cloudflare", "graphql", "grpc", "rust", "wasm", "electron",
    "reactnative", "flutter", "swiftui", "unity", "godot"
  ],

  ai: [
    "rag", "agents", "llm", "embeddings", "vectorsearch", "finetuning",
    "langchain", "llamaindex", "mcp", "evals", "multimodal", "inference",
    "transformers", "pytorch", "tensorflow", "huggingface", "openai",
    "anthropic", "gemini", "ollama", "vllm", "diffusion", "computervision",
    "nlp", "speech", "recommender", "reinforcementlearning"
  ],

  role: [
    "frontend", "backend", "fullstack", "ml", "devops", "infra", "mobile",
    "data", "security", "design"
  ]
};

export const ALIAS_MAP = {
  "next.js": "nextjs", "next js": "nextjs", "next-js": "nextjs",
  "node.js": "node", "nodejs": "node", "node js": "node",
  "postgresql": "postgres", "psql": "postgres",
  "k8s": "kubernetes", "kube": "kubernetes",
  "mongo": "mongodb", "atlas": "mongodb",
  "machine learning": "ml", "machine-learning": "ml", "deep learning": "ml",
  "artificial intelligence": "ai", "genai": "ai", "gen ai": "ai",
  "large language model": "llm", "large language models": "llm", "llms": "llm",
  "retrieval augmented generation": "rag", "retrieval-augmented": "rag",
  "vector search": "vectorsearch", "vector database": "vectorsearch",
  "vector db": "vectorsearch", "vectordb": "vectorsearch",
  "fine tuning": "finetuning", "fine-tuning": "finetuning",
  "react native": "reactnative", "react-native": "reactnative",
  "hugging face": "huggingface", "hf": "huggingface",
  "computer vision": "computervision", "cv": "computervision",
  "natural language processing": "nlp",
  "reinforcement learning": "reinforcementlearning", "rl": "reinforcementlearning",
  "model context protocol": "mcp",
  "front end": "frontend", "front-end": "frontend",
  "back end": "backend", "back-end": "backend",
  "full stack": "fullstack", "full-stack": "fullstack",
  "dev ops": "devops", "infrastructure": "infra",
  "typescript": "ts", "javascript": "js", "golang": "go",
  "c sharp": "csharp", "c#": "csharp", "c++": "cpp",
  "tf": "tensorflow", "torch": "pytorch"
};

/**
 * Normalizes a raw topic/language/keyword using alias map and cleanup.
 */
export function normalizeTag(raw) {
  if (!raw) return "";
  let clean = String(raw).toLowerCase().trim();
  
  // Direct alias check
  if (ALIAS_MAP[clean]) {
    return ALIAS_MAP[clean];
  }

  // Strip punctuation/dots and check again
  const stripped = clean.replace(/[\.\-_]/g, " ").replace(/\s+/g, " ").trim();
  if (ALIAS_MAP[stripped]) {
    return ALIAS_MAP[stripped];
  }
  if (ALIAS_MAP[clean.replace(/[\.\-_]/g, "")]) {
    return ALIAS_MAP[clean.replace(/[\.\-_]/g, "")];
  }

  return clean.replace(/[^a-z0-9]/g, "");
}

/**
 * Tests word boundary match of a term in text corpus.
 */
function containsWord(corpus, term) {
  // Regex word boundary matching
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i");
  return regex.test(corpus);
}

/**
 * Derives normalized, priority-sorted tags capped at 25.
 */
export function deriveTags(description = "", repos = []) {
  const topicTags = new Set();
  const langTags = new Set();
  const aiTags = new Set();
  const stackTags = new Set();
  const roleTags = new Set();

  // 1. topic: from repo.topics
  for (const repo of repos) {
    if (Array.isArray(repo.topics)) {
      for (const t of repo.topics) {
        const norm = normalizeTag(t);
        if (norm) {
          // Check if this topic matches an AI, stack, or general topic
          if (DICTIONARIES.ai.includes(norm)) {
            aiTags.add(`ai:${norm}`);
          } else if (DICTIONARIES.stack.includes(norm)) {
            stackTags.add(`stack:${norm}`);
          } else {
            topicTags.add(`topic:${norm}`);
          }
        }
      }
    }
  }

  // 2. lang: from repo.language
  for (const repo of repos) {
    if (repo.language) {
      const norm = normalizeTag(repo.language);
      if (norm) {
        langTags.add(`lang:${norm}`);
      }
    }
  }

  // 3. Build text corpus for keyword matching
  const corpusParts = [
    description || "",
    ...repos.map((r) => r.name || ""),
    ...repos.map((r) => r.description || "")
  ];
  const fullCorpus = " " + corpusParts.join(" ").toLowerCase() + " ";

  // Check AI dictionary
  for (const term of DICTIONARIES.ai) {
    if (containsWord(fullCorpus, term)) {
      aiTags.add(`ai:${term}`);
    }
  }
  // Also check aliases that map to AI terms
  for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
    if (DICTIONARIES.ai.includes(canonical) && containsWord(fullCorpus, alias)) {
      aiTags.add(`ai:${canonical}`);
    }
  }

  // Check Stack dictionary
  for (const term of DICTIONARIES.stack) {
    if (containsWord(fullCorpus, term)) {
      stackTags.add(`stack:${term}`);
    }
  }
  for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
    if (DICTIONARIES.stack.includes(canonical) && containsWord(fullCorpus, alias)) {
      stackTags.add(`stack:${canonical}`);
    }
  }

  // Check Role dictionary
  for (const term of DICTIONARIES.role) {
    if (containsWord(fullCorpus, term)) {
      roleTags.add(`role:${term}`);
    }
  }
  for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
    if (DICTIONARIES.role.includes(canonical) && containsWord(fullCorpus, alias)) {
      roleTags.add(`role:${canonical}`);
    }
  }

  // Priority order when capping at 25: topic:, ai:, stack:, role:, lang:
  const priorityArrays = [
    Array.from(topicTags).sort(),
    Array.from(aiTags).sort(),
    Array.from(stackTags).sort(),
    Array.from(roleTags).sort(),
    Array.from(langTags).sort()
  ];

  const combined = [];
  for (const arr of priorityArrays) {
    for (const tag of arr) {
      if (!combined.includes(tag)) {
        combined.push(tag);
        if (combined.length >= 25) break;
      }
    }
    if (combined.length >= 25) break;
  }

  // Lexicographical sort final array for byte-identical determinism
  return combined.sort();
}

/**
 * Derives rich text field for vector embedding, capped at 2000 characters.
 */
export function deriveText(description = "", repos = [], tags = []) {
  const parts = [];

  // 1. Person description
  if (description && description.trim()) {
    parts.push(description.trim());
  }

  // 2. Repo descriptions
  for (const r of repos) {
    if (r.description && r.description.trim()) {
      parts.push(r.description.trim());
    }
  }

  // 3. Repo names
  for (const r of repos) {
    if (r.name && r.name.trim()) {
      parts.push(r.name.trim());
    }
  }

  // 4. Bare tag values (strip namespace prefix)
  const bareTags = tags
    .map((t) => t.replace(/^(topic|lang|stack|ai|role):/, ""))
    .filter(Boolean);
  if (bareTags.length > 0) {
    parts.push(bareTags.join(" "));
  }

  const combined = parts.join(" ");
  return combined.length > 2000 ? combined.substring(0, 2000).trim() : combined;
}
