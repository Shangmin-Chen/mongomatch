import Link from "next/link";
import { UserPlus, Search, Compass, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <main className="wrapper" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
      {/* Badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          background: "rgba(0, 237, 100, 0.1)",
          border: "1px solid rgba(0, 237, 100, 0.25)",
          color: "#00ed64",
          fontSize: "0.85rem",
          fontWeight: 600,
          padding: "0.3rem 0.75rem",
          borderRadius: "9999px",
          marginBottom: "1.25rem",
        }}
      >
        <Sparkles size={14} /> Live Conference Graph
      </div>

      <h1 className="title" style={{ fontSize: "2.25rem", lineHeight: 1.15, marginBottom: "0.75rem" }}>
        MongoMatch
      </h1>

      <p className="subtitle" style={{ fontSize: "1.1rem", maxWidth: "420px", margin: "0 auto 2.25rem", lineHeight: 1.45 }}>
        A live knowledge graph of builders at the conference. Find who in the room can unblock you right now.
      </p>

      {/* Three Action Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "380px", margin: "0 auto" }}>
        <Link
          href="/form"
          className="btn-submit"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            fontSize: "1.05rem",
            fontWeight: 700,
            padding: "1rem 1.25rem",
          }}
        >
          <UserPlus size={18} />
          <span>Add Yourself</span>
        </Link>

        <Link
          href="/profile"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            background: "#161e2e",
            border: "1px solid #374151",
            color: "#f3f4f6",
            borderRadius: "8px",
            padding: "0.95rem 1.25rem",
            fontSize: "1rem",
            fontWeight: 600,
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          <Search size={18} color="#00ed64" />
          <span>Search Profile</span>
        </Link>

        <Link
          href="/explore"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            background: "#161e2e",
            border: "1px solid #374151",
            color: "#f3f4f6",
            borderRadius: "8px",
            padding: "0.95rem 1.25rem",
            fontSize: "1rem",
            fontWeight: 600,
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          <Compass size={18} color="#00d2ff" />
          <span>Explore Graph</span>
        </Link>
      </div>

      {/* Footer info */}
      <div style={{ marginTop: "3rem", fontSize: "0.8rem", color: "#6b7280" }}>
        Powered by MongoDB Atlas Vector Search & Graph Lookup
      </div>
    </main>
  );
}
