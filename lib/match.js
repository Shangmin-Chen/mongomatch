// lib/match.js
// The Canonical MongoDB Graph + Vector Matching Pipeline for MongoMatch.

import { getDb } from "./mongodb.ts";

const LANGUAGE_NAMES = new Set(["go", "rust", "python", "javascript", "typescript", "c", "cpp", "java", "ruby", "php"]);

function getPrefixWeight(tag) {
  if (tag.startsWith("ai:")) return 6;
  if (tag.startsWith("topic:")) {
    const topicVal = tag.slice(6);
    if (LANGUAGE_NAMES.has(topicVal)) return 1.5;
    return 4;
  }
  if (tag.startsWith("stack:")) return 3;
  if (tag.startsWith("role:")) return 2;
  if (tag.startsWith("lang:")) return 1;
  return 1;
}

/**
 * Finds the top unblocking matches for a given handle.
 * 
 * Pipeline:
 * 1. $vectorSearch on `people_vector` using target's `text` field.
 * 2. Filter out self (handle != target.handle).
 * 3. $graphLookup on `tags` (self-join on people sharing tags, maxDepth: 1).
 * 4. Inverse-frequency tag weighting using precomputed `tagstats`.
 * 5. Composite ranking (Direct Tag Overlap + Second-Hop Graph + Vector Score).
 * 
 * Degrade Paths:
 * - Empty tags -> vector-only ranking.
 * - Vector failure -> pure tag-intersection fallback with degraded: true.
 * - Zero matches -> returns empty matches array, never throws.
 */
export async function findMatches(rawHandle, { limit = 3 } = {}) {
  if (!rawHandle || typeof rawHandle !== "string") {
    return { target: null, matches: [], degraded: false };
  }

  const cleanHandle = rawHandle.trim().toLowerCase();
  const db = await getDb();
  const peopleCol = db.collection("people");
  const tagstatsCol = db.collection("tagstats");

  // 1. Fetch Target Person
  const target = await peopleCol.findOne({
    $or: [
      { handle: cleanHandle },
      { github: cleanHandle },
      { handle: cleanHandle.replace(/^@/, "") },
    ],
  });

  if (!target) {
    return { target: null, matches: [], degraded: false };
  }

  const targetTags = Array.isArray(target.tags) ? target.tags : [];
  const targetText = target.text || target.description || "";
  const targetHandle = target.handle;

  // 2. Fetch Tag Stats (for inverse frequency scaling)
  let tagCountMap = new Map();
  let totalPeopleCount = 10;
  try {
    const statsDocs = await tagstatsCol.find({}).toArray();
    statsDocs.forEach((s) => tagCountMap.set(s._id, s.count));
    totalPeopleCount = await peopleCol.countDocuments();
  } catch (err) {
    console.warn("[match] Could not load tagstats, using default frequencies:", err.message);
  }

  let candidates = [];
  let degraded = false;

  // 3. Attempt Vector Search + Graph Lookup Pipeline
  if (targetText.trim()) {
    try {
      const vectorPipeline = [
        {
          $vectorSearch: {
            index: "people_vector",
            path: "text",
            query: targetText.trim(),
            numCandidates: 30,
            limit: 20,
          },
        },
        {
          $match: {
            handle: { $ne: targetHandle },
          },
        },
        {
          $graphLookup: {
            from: "people",
            startWith: "$tags",
            connectFromField: "tags",
            connectToField: "tags",
            as: "graphNeighbors",
            maxDepth: 1,
            restrictSearchWithMatch: { handle: { $ne: targetHandle } },
          },
        },
        {
          $project: {
            _id: 1,
            handle: 1,
            name: 1,
            email: 1,
            github: 1,
            githubUrl: 1,
            description: 1,
            tags: 1,
            repos: 1,
            graphNeighbors: {
              handle: 1,
              tags: 1,
            },
            vectorScore: { $meta: "vectorSearchScore" },
          },
        },
      ];

      candidates = await peopleCol.aggregate(vectorPipeline).toArray();
    } catch (vectorErr) {
      console.warn("[match] $vectorSearch failed, falling back to tag graph search:", vectorErr.message);
      degraded = true;
    }
  }

  // 4. Fallback: Pure Tag Overlap Aggregation if vector search failed or target has no text
  if (candidates.length === 0 && (degraded || !targetText.trim())) {
    try {
      degraded = true;
      const fallbackPipeline = [
        {
          $match: {
            handle: { $ne: targetHandle },
          },
        },
        {
          $graphLookup: {
            from: "people",
            startWith: "$tags",
            connectFromField: "tags",
            connectToField: "tags",
            as: "graphNeighbors",
            maxDepth: 1,
            restrictSearchWithMatch: { handle: { $ne: targetHandle } },
          },
        },
        {
          $limit: 25,
        },
      ];
      candidates = await peopleCol.aggregate(fallbackPipeline).toArray();
    } catch (fallbackErr) {
      console.error("[match] Fallback pipeline failed:", fallbackErr.message);
      return { target, matches: [], degraded: true };
    }
  }

  if (candidates.length === 0) {
    return { target, matches: [], degraded };
  }

  // 5. Score Candidates
  const scoredMatches = candidates.map((candidate) => {
    const candidateTags = Array.isArray(candidate.tags) ? candidate.tags : [];
    const sharedTags = candidateTags.filter((t) => targetTags.includes(t));

    // A. Direct Tag Score (Weighted by Tag Type and Inverse Frequency)
    let directTagScore = 0;
    let tagDetails = [];

    sharedTags.forEach((tag) => {
      const prefixWeight = getPrefixWeight(tag);
      const frequency = tagCountMap.get(tag) || 1;
      // Inverse frequency formula: prefixWeight * log2(1 + totalPeople / frequency)
      const idfMultiplier = Math.log2(1 + totalPeopleCount / frequency);
      const tagPoints = prefixWeight * idfMultiplier;
      directTagScore += tagPoints;
      tagDetails.push({ tag, points: tagPoints, prefixWeight, frequency });
    });

    // B. Second-Hop Graph Contribution (from graphLookup neighbors)
    let secondHopScore = 0;
    let secondHopConnections = new Set();

    if (Array.isArray(candidate.graphNeighbors)) {
      candidate.graphNeighbors.forEach((neighbor) => {
        if (neighbor.handle !== candidate.handle && neighbor.handle !== targetHandle) {
          const neighborTags = Array.isArray(neighbor.tags) ? neighbor.tags : [];
          const neighborShared = neighborTags.filter((t) => targetTags.includes(t));
          if (neighborShared.length > 0) {
            secondHopConnections.add(neighbor.handle);
            // Second hop contributes 0.15x of base weight
            secondHopScore += neighborShared.length * 0.15;
          }
        }
      });
    }

    // C. Vector Score Contribution (Scaled to comparable range: 0.0 - 16.0)
    const rawVectorScore = typeof candidate.vectorScore === "number" ? candidate.vectorScore : 0;
    const vectorContribution = rawVectorScore * 16;

    // D. Total Composite Score
    const totalScore = directTagScore + secondHopScore + vectorContribution;

    // E. Strongest Reason (Highest weighted shared tag, or top vector theme)
    tagDetails.sort((a, b) => b.points - a.points);
    let reason = "Domain & Skill Similarity";
    if (tagDetails.length > 0) {
      reason = tagDetails[0].tag;
    } else if (candidateTags.length > 0) {
      reason = candidateTags[0];
    }

    // F. Evidence Repository Selection
    const repos = Array.isArray(candidate.repos) ? candidate.repos : [];
    let evidenceRepo = null;

    if (repos.length > 0) {
      // Find repo containing the highest-ranked shared tag or matching description
      const bestSharedTagClean = reason.replace(/^(topic|ai|stack|role|lang):/, "");
      evidenceRepo = repos.find((r) => {
        const rTopics = Array.isArray(r.topics) ? r.topics.map((t) => t.toLowerCase()) : [];
        const rLang = (r.language || "").toLowerCase();
        const rName = (r.name || "").toLowerCase();
        const rDesc = (r.description || "").toLowerCase();
        return (
          rTopics.includes(bestSharedTagClean) ||
          rLang === bestSharedTagClean ||
          rName.includes(bestSharedTagClean) ||
          rDesc.includes(bestSharedTagClean)
        );
      });

      if (!evidenceRepo) {
        // Fallback to highest-starred or first repo
        evidenceRepo = repos.reduce((best, cur) => ((cur.stars || 0) > (best.stars || 0) ? cur : best), repos[0]);
      }
    }

    // G. Structured Hop Path for /stage Visualizer
    const path = [
      { type: "person", label: `@${targetHandle}`, name: target.name || targetHandle },
      { type: "tag", label: reason, namespace: reason.split(":")[0], value: reason.split(":")[1] || reason },
      {
        type: "repo",
        label: evidenceRepo ? evidenceRepo.name : "codebase",
        url: evidenceRepo ? evidenceRepo.url : candidate.githubUrl,
      },
      {
        type: "match",
        label: `@${candidate.handle}`,
        name: candidate.name || candidate.handle,
        email: candidate.email,
      },
    ];

    return {
      handle: candidate.handle,
      name: candidate.name || candidate.handle,
      email: candidate.email || "",
      github: candidate.github || candidate.handle,
      githubUrl: candidate.githubUrl || `https://github.com/${candidate.handle}`,
      description: candidate.description || "",
      sharedTags,
      reason,
      evidenceRepo: evidenceRepo
        ? {
            name: evidenceRepo.name,
            url: evidenceRepo.url,
            description: evidenceRepo.description || "",
            language: evidenceRepo.language || null,
            topics: evidenceRepo.topics || [],
            stars: evidenceRepo.stars || 0,
            pushedAt: evidenceRepo.pushedAt,
          }
        : null,
      path,
      score: Math.round(totalScore * 100) / 100,
      breakdown: {
        totalScore: Math.round(totalScore * 100) / 100,
        directTagScore: Math.round(directTagScore * 100) / 100,
        secondHopScore: Math.round(secondHopScore * 100) / 100,
        vectorContribution: Math.round(vectorContribution * 100) / 100,
        rawVectorScore: Math.round(rawVectorScore * 10000) / 10000,
      },
    };
  });

  // Sort by composite score desc and take top N (default 3)
  scoredMatches.sort((a, b) => b.score - a.score);
  const topMatches = scoredMatches.slice(0, limit);

  return {
    target,
    matches: topMatches,
    degraded,
  };
}
