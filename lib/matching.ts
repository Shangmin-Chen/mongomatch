import { getDb } from "./mongodb";
import { AttendeeDoc, RepoEdge } from "./types";

export interface MatchResult {
  handle: string;
  name: string;
  contact: string;
  avatarUrl?: string;
  description: string;
  sharedTopics: string[];
  sharedLanguages: string[];
  proofRepo: RepoEdge | null;
  score: number;
  hopPath: {
    from: string;
    viaTopic: string;
    toRepo: string;
    toPerson: string;
  }[];
}

/**
 * Finds the top unblockers for a specific registered attendee.
 * Uses MongoDB Aggregation to intersect topics, repos, and languages.
 */
export async function getMatchesForAttendee(handle: string): Promise<{
  target: AttendeeDoc | null;
  matches: MatchResult[];
}> {
  const cleanHandle = handle.trim().replace(/^@/, "").toLowerCase();
  const db = await getDb();
  const collection = db.collection<AttendeeDoc>("attendees");

  const target = await collection.findOne({ handle: cleanHandle });
  if (!target) {
    return { target: null, matches: [] };
  }

  const targetTopics = target.topics || [];
  const targetLanguages = target.languages || [];
  const targetAsk = target.description || "";

  // Extract keywords from the target's ask for semantic overlap
  const askKeywords = targetAsk
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  // Aggregation pipeline to match and rank other attendees
  const candidates = await collection
    .aggregate([
      {
        $match: {
          handle: { $ne: cleanHandle },
        },
      },
      {
        $addFields: {
          sharedTopics: {
            $setIntersection: ["$topics", targetTopics],
          },
          sharedLanguages: {
            $setIntersection: ["$languages", targetLanguages],
          },
        },
      },
      {
        $addFields: {
          sharedTopicsCount: { $size: "$sharedTopics" },
          sharedLanguagesCount: { $size: "$sharedLanguages" },
        },
      },
      // Calculate composite score
      {
        $addFields: {
          score: {
            $add: [
              { $multiply: ["$sharedTopicsCount", 3] },
              { $multiply: ["$sharedLanguagesCount", 2] },
            ],
          },
        },
      },
      {
        $sort: { score: -1, "githubProfile.publicRepos": -1, createdAt: -1 },
      },
      {
        $limit: 10,
      },
    ])
    .toArray();

  const results: MatchResult[] = candidates.map((c: any) => {
    const sharedTopics: string[] = c.sharedTopics || [];
    const sharedLanguages: string[] = c.sharedLanguages || [];
    const repos: RepoEdge[] = c.repos || [];

    // Find the best "proof repo" that matches the shared topics or ask keywords
    let bestRepo: RepoEdge | null = null;
    let maxRepoScore = -1;

    for (const repo of repos) {
      let repoScore = 0;
      const repoTopics = (repo.topics || []).map((t) => t.toLowerCase());
      const repoLang = (repo.language || "").toLowerCase();

      // Check overlap with target topics
      for (const t of targetTopics) {
        if (repoTopics.includes(t)) repoScore += 3;
      }
      if (targetLanguages.includes(repoLang)) {
        repoScore += 2;
      }

      // Check overlap with target ask keywords
      for (const kw of askKeywords) {
        if (
          repo.name.toLowerCase().includes(kw) ||
          repo.description.toLowerCase().includes(kw) ||
          repoTopics.includes(kw)
        ) {
          repoScore += 4;
        }
      }

      if (repoScore > maxRepoScore) {
        maxRepoScore = repoScore;
        bestRepo = repo;
      }
    }

    if (!bestRepo && repos.length > 0) {
      bestRepo = repos[0];
    }

    // Build hop paths for visualization
    const hopPath = sharedTopics.slice(0, 3).map((topic) => ({
      from: target.handle,
      viaTopic: topic,
      toRepo: bestRepo ? bestRepo.name : "portfolio",
      toPerson: c.handle,
    }));

    return {
      handle: c.handle,
      name: c.name || c.handle,
      contact: c.contact,
      avatarUrl: c.avatarUrl,
      description: c.description,
      sharedTopics,
      sharedLanguages,
      proofRepo: bestRepo,
      score: c.score + (maxRepoScore > 0 ? maxRepoScore : 0),
      hopPath,
    };
  });

  // Re-sort by total refined score and take top 3
  results.sort((a, b) => b.score - a.score);

  return {
    target,
    matches: results.slice(0, 3),
  };
}

/**
 * Searches the conference graph for any query (used by /stage operator view).
 */
export async function searchGraphForStage(query: string): Promise<MatchResult[]> {
  const db = await getDb();
  const collection = db.collection<AttendeeDoc>("attendees");

  const queryKeywords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const allAttendees = await collection.find({}).toArray();

  const results: MatchResult[] = allAttendees.map((att) => {
    let score = 0;
    const matchedTopics: string[] = [];
    const matchedLanguages: string[] = [];

    // Match topics
    (att.topics || []).forEach((topic) => {
      if (queryKeywords.some((kw) => topic.toLowerCase().includes(kw))) {
        matchedTopics.push(topic);
        score += 5;
      }
    });

    // Match languages
    (att.languages || []).forEach((lang) => {
      if (queryKeywords.some((kw) => lang.toLowerCase().includes(kw))) {
        matchedLanguages.push(lang);
        score += 4;
      }
    });

    // Match description and text
    const textLower = (att.text || "").toLowerCase();
    queryKeywords.forEach((kw) => {
      if (textLower.includes(kw)) score += 3;
    });

    // Find proof repo
    let bestRepo: RepoEdge | null = null;
    let maxRepoScore = -1;

    (att.repos || []).forEach((repo) => {
      let rScore = 0;
      queryKeywords.forEach((kw) => {
        if (repo.name.toLowerCase().includes(kw)) rScore += 5;
        if (repo.description.toLowerCase().includes(kw)) rScore += 3;
        if (repo.topics.some((t) => t.toLowerCase().includes(kw))) rScore += 4;
      });
      if (rScore > maxRepoScore) {
        maxRepoScore = rScore;
        bestRepo = repo;
      }
    });

    if (!bestRepo && att.repos && att.repos.length > 0) {
      bestRepo = att.repos[0];
    }

    const hopPath = matchedTopics.slice(0, 3).map((topic) => ({
      from: "Operator Query",
      viaTopic: topic,
      toRepo: bestRepo ? bestRepo.name : "code",
      toPerson: att.handle,
    }));

    return {
      handle: att.handle,
      name: att.name || att.handle,
      contact: att.contact,
      avatarUrl: att.avatarUrl,
      description: att.description,
      sharedTopics: Array.from(new Set(matchedTopics)),
      sharedLanguages: Array.from(new Set(matchedLanguages)),
      proofRepo: bestRepo,
      score: score + (maxRepoScore > 0 ? maxRepoScore : 0),
      hopPath,
    };
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 3);
}
