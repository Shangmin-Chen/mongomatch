export interface RepoEdge {
  name: string;
  fullName: string;
  description: string;
  url: string;
  language: string | null;
  topics: string[];
  stars: number;
  pushedAt: string;
}

export interface AttendeeDoc {
  _id?: any;
  handle: string; // GitHub handle (lowercase, unique)
  name?: string;
  description: string; // What they are building / need / unblock ask
  contact: string; // Telegram / Twitter / Email / Phone
  avatarUrl?: string;
  
  // Deterministic GitHub enrichment payload
  githubProfile?: {
    bio: string | null;
    company: string | null;
    location: string | null;
    blog: string | null;
    publicRepos: number;
    followers: number;
  };
  
  // Materialized Graph Nodes & Edges
  repos: RepoEdge[];
  topics: string[]; // Aggregated unique topics from repos
  languages: string[]; // Aggregated unique languages from repos

  // Concatenated text field for semantic vector search / embedding
  text: string;

  // Metadata
  enriched: boolean;
  enrichedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
