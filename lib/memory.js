// lib/memory.js
// Ingest-Time Memory Layer for MongoMatch, Grounded in Atlas Vector Search.

import { getDb } from "./mongodb.ts";

/**
 * Generates an episodic memory note for an attendee during enrichment,
 * grounded in nearest neighbors retrieved via Atlas Vector Search.
 *
 * Guardrails: Never throws, short 4s timeout, returns null on any failure.
 */
export async function generateMemoryNote(person, { limit = 5 } = {}) {
  if (!person || !person.text || typeof person.text !== "string" || !person.text.trim()) {
    return null;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }

  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const targetHandle = person.handle || "";

  let neighbors = [];

  // 1. Retrieve Nearest Neighbors from MongoDB Atlas Vector Search
  try {
    const db = await getDb();
    const peopleCol = db.collection("people");

    const vectorPipeline = [
      {
        $vectorSearch: {
          index: "people_vector",
          path: "text",
          query: person.text.trim(),
          numCandidates: 25,
          limit: limit + 1, // account for potential self
        },
      },
      {
        $match: {
          handle: { $ne: targetHandle },
        },
      },
      {
        $limit: limit,
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

    neighbors = await peopleCol.aggregate(vectorPipeline).toArray();
  } catch (dbErr) {
    console.warn(`[memory] Vector search retrieval failed: ${dbErr.message}`);
    return null;
  }

  if (neighbors.length === 0) {
    return null;
  }

  // 2. Synthesize Episodic Memory Note with OpenRouter
  const systemPrompt = `You are the knowledge graph memory synthesizer at a developer conference.
You receive a newly enriched developer and their closest peer neighbors retrieved via vector search in the graph.
Write a concise 1-2 sentence memory note summarizing how this developer bridges or clusters with these specific peers (reference 1-2 actual peer names or shared tags). Keep it factual and grounded in the retrieved data. Do not use filler.`;

  const userPrompt = `Developer:
- Name: ${person.name || person.handle} (@${person.handle})
- Ask: "${person.description || ""}"
- Tags: [${(person.tags || []).join(", ")}]

Retrieved Nearest Peers in Knowledge Graph:
${JSON.stringify(neighbors, null, 2)}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mongomatch.vercel.app",
        "X-Title": "MongoMatch",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
      signal: AbortSignal.timeout(4000), // 4s strict timeout
    });

    if (!res.ok) {
      console.warn(`[memory] OpenRouter returned HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch (llmErr) {
    console.warn(`[memory] OpenRouter call error (${llmErr.message})`);
    return null;
  }
}
