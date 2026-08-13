// lib/narrate.js
// OpenRouter Narration Layer for MongoMatch /explore Stage View.

/**
 * Builds the deterministic fallback template string.
 */
function buildFallbackTemplate(targetPerson, topCandidate) {
  if (!topCandidate) {
    return {
      chosenHandle: targetPerson?.handle || "attendee",
      narration: "No direct unblocker matches found in the conference graph yet. Check back as more attendees join!",
      degraded: true,
    };
  }

  const cleanTag = (topCandidate.reason || "domain").replace(/^(topic|ai|stack|role|lang):/, "");
  const repoName = topCandidate.evidenceRepo?.name ? `in repository '${topCandidate.evidenceRepo.name}'` : "in their public repositories";
  const contact = topCandidate.email || `@${topCandidate.handle}`;

  const narration = `MongoDB graph traversal matched ${topCandidate.name} (@${topCandidate.handle}) based on verified experience in #${cleanTag} ${repoName}. Connect at ${contact}.`;

  return {
    chosenHandle: topCandidate.handle,
    narration,
    degraded: true,
  };
}

/**
 * Given a target attendee and a candidate pool of matches from MongoDB,
 * asks OpenRouter to select the best match and draft a punchy 2-sentence intro.
 *
 * Guardrails: Never throws, short 4s timeout, falls back to deterministic candidate #1.
 */
export async function draftStageIntro(targetPerson, candidates) {
  if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
    return buildFallbackTemplate(targetPerson, null);
  }

  const topCandidate = candidates[0];
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return buildFallbackTemplate(targetPerson, topCandidate);
  }

  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const candidateHandles = new Set(candidates.map((c) => c.handle.toLowerCase()));

  // Prepare concise candidate summary for the model
  const candidateSummaries = candidates.map((c, idx) => ({
    rank: idx + 1,
    handle: c.handle,
    name: c.name,
    email: c.email,
    description: c.description,
    sharedTags: c.sharedTags || [],
    reason: c.reason,
    evidenceRepo: c.evidenceRepo
      ? {
          name: c.evidenceRepo.name,
          language: c.evidenceRepo.language,
          stars: c.evidenceRepo.stars,
          description: c.evidenceRepo.description,
        }
      : null,
    score: c.score,
  }));

  const systemPrompt = `You are the onstage AI matchmaker at a high-stakes builder conference.
You receive a target builder's problem statement and a candidate pool of unblockers retrieved directly from MongoDB Atlas.
Your task:
1. Select the SINGLE best candidate handle from the provided candidates list who can best unblock the target.
2. Draft a punchy, energetic 2-sentence onstage introduction explaining EXACTLY why they are the perfect match, citing their shared skills/tags and specific verified repository proof.

Output MUST be a valid JSON object with exactly two keys:
- "chosenHandle": (string) The exact handle of the chosen candidate from the list.
- "narration": (string) The 2-sentence onstage introduction.`;

  const userPrompt = `Target Builder:
- Name: ${targetPerson?.name || "Attendee"} (@${targetPerson?.handle || "attendee"})
- Ask / Problem: "${targetPerson?.description || "Building software at the conference."}"

Candidate Pool retrieved from MongoDB (${candidates.length} options):
${JSON.stringify(candidateSummaries, null, 2)}`;

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
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(4000), // 4s timeout
    });

    if (!res.ok) {
      console.warn(`[narrate] OpenRouter returned HTTP ${res.status}, using template fallback.`);
      return buildFallbackTemplate(targetPerson, topCandidate);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return buildFallbackTemplate(targetPerson, topCandidate);
    }

    const parsed = JSON.parse(content);
    const chosenHandle = typeof parsed.chosenHandle === "string" ? parsed.chosenHandle.trim().toLowerCase() : "";
    const narration = typeof parsed.narration === "string" ? parsed.narration.trim() : "";

    // Validate that the model chose a handle actually in the candidate set
    if (!chosenHandle || !candidateHandles.has(chosenHandle) || !narration) {
      console.warn(`[narrate] Model hallucinated handle '${chosenHandle}' or empty narration. Falling back to #1.`);
      return buildFallbackTemplate(targetPerson, topCandidate);
    }

    return {
      chosenHandle,
      narration,
      degraded: false,
    };
  } catch (err) {
    console.warn(`[narrate] OpenRouter call failed (${err.message}), using template fallback.`);
    return buildFallbackTemplate(targetPerson, topCandidate);
  }
}
