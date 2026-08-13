import { getDb } from "./mongodb";
import { AttendeeDoc, RepoEdge } from "./types";

interface GitHubUserResponse {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  public_repos: number;
  followers: number;
}

interface GitHubRepoResponse {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  pushed_at: string;
  fork: boolean;
}

export async function enrichAttendee(handle: string): Promise<AttendeeDoc | null> {
  const cleanHandle = handle.trim().replace(/^@/, "").toLowerCase();
  const db = await getDb();
  const collection = db.collection<AttendeeDoc>("attendees");

  const headers: Record<string, string> = {
    "User-Agent": "MongoMatch-App",
    Accept: "application/vnd.github.v3+json",
  };

  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  let profileData: GitHubUserResponse | null = null;
  let reposData: GitHubRepoResponse[] = [];

  try {
    // 1. Fetch user profile
    const userRes = await fetch(`https://api.github.com/users/${cleanHandle}`, {
      headers,
      next: { revalidate: 0 },
    });

    if (userRes.ok) {
      profileData = await userRes.json();
    }

    // 2. Fetch top 10 recently pushed repos
    const reposRes = await fetch(
      `https://api.github.com/users/${cleanHandle}/repos?sort=pushed&per_page=10`,
      {
        headers,
        next: { revalidate: 0 },
      }
    );

    if (reposRes.ok) {
      reposData = await reposRes.json();
    }
  } catch (err) {
    console.error(`[enrich] GitHub fetch error for ${cleanHandle}:`, err);
  }

  // Materialize repo edges
  const repos: RepoEdge[] = Array.isArray(reposData)
    ? reposData
        .filter((r) => !r.fork) // prefer non-forks if available
        .slice(0, 8)
        .map((r) => ({
          name: r.name,
          fullName: r.full_name,
          description: r.description || "",
          url: r.html_url,
          language: r.language || null,
          topics: Array.isArray(r.topics) ? r.topics : [],
          stars: r.stargazers_count || 0,
          pushedAt: r.pushed_at,
        }))
    : [];

  // Materialize unique topics and languages
  const topicsSet = new Set<string>();
  const languagesSet = new Set<string>();

  repos.forEach((repo) => {
    repo.topics.forEach((t) => topicsSet.add(t.toLowerCase()));
    if (repo.language) {
      languagesSet.add(repo.language.toLowerCase());
      topicsSet.add(repo.language.toLowerCase()); // treat language as high-level topic as well
    }
  });

  const topics = Array.from(topicsSet);
  const languages = Array.from(languagesSet);

  // Fetch current doc to combine text
  const currentDoc = await collection.findOne({ handle: cleanHandle });
  const rawDescription = currentDoc?.description || "";
  const contact = currentDoc?.contact || "";
  const name = profileData?.name || currentDoc?.name || cleanHandle;
  const avatarUrl = profileData?.avatar_url || `https://github.com/${cleanHandle}.png`;

  // Build concatenated text for vector search / autoEmbed
  const repoSummary = repos
    .map((r) => `${r.name}: ${r.description} (tech: ${r.language || "code"}, tags: ${r.topics.join(", ")})`)
    .join("\n");

  const concatenatedText = [
    `Name: ${name} (@${cleanHandle})`,
    `Ask / Needs / Building: ${rawDescription}`,
    profileData?.bio ? `Bio: ${profileData.bio}` : "",
    topics.length > 0 ? `Skills & Topics: ${topics.join(", ")}` : "",
    languages.length > 0 ? `Languages: ${languages.join(", ")}` : "",
    repoSummary ? `Key Projects:\n${repoSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const updatePayload: Partial<AttendeeDoc> = {
    handle: cleanHandle,
    name,
    avatarUrl,
    description: rawDescription,
    contact,
    githubProfile: profileData
      ? {
          bio: profileData.bio,
          company: profileData.company,
          location: profileData.location,
          blog: profileData.blog,
          publicRepos: profileData.public_repos,
          followers: profileData.followers,
        }
      : undefined,
    repos,
    topics,
    languages,
    text: concatenatedText,
    enriched: true,
    enrichedAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await collection.findOneAndUpdate(
    { handle: cleanHandle },
    {
      $set: updatePayload,
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" }
  );

  return result as AttendeeDoc | null;
}
