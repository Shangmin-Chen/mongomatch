# MongoMatch — 1-Minute Technical Demo Video Guide

Target length: **60 seconds (1:00)**.
High density, focused entirely on **MongoDB Atlas** and **OpenRouter** under the hood. No fluff, no homepage b-roll — the screen recording visually proves the system while the voiceover breaks down the architecture.

Live site: **https://mongomatch.vercel.app**

---

## 0. Pre-flight Checklist

- Open clean browser window (Incognito/private, 100% zoom, 16:9 ratio).
- Have tabs open directly to:
  1. `https://mongomatch.vercel.app/shangmin-chen/mongomatch` (Profile with Memory Note)
  2. `https://mongomatch.vercel.app/explore` (Knowledge Graph)

---

## 1. The 60-Second Technical Script (~140 words)

Read with crisp, confident pace at ~140 words per minute.

**[0:00–0:18] — Ingest & Grounded Memory in MongoDB Atlas (over `/shangmin-chen/mongomatch`)**
> "Most AI agents start cold. In MongoMatch, every attendee is a single MongoDB Atlas document holding raw asks, enriched GitHub data, derived tags, and vector embeddings. On signup, Atlas Vector Search finds their nearest neighbors, and OpenRouter synthesizes a memory note grounded in real retrieved context—written straight back into the document so the graph compounds intelligence with every new join."

**[0:18–0:45] — Single Aggregation Pipeline & OpenRouter (over `/explore`, query `langchain-ai/langgraph`)**
> "At query time, MongoDB Atlas executes a single aggregation pipeline: `$vectorSearch` for semantic similarity, `$graphLookup` for multi-hop tag traversal, and deterministic inverse-frequency scoring. OpenRouter makes the only other LLM call in the system—evaluating the ranked pool to select the winning unblocker and draft the onstage narration live."

**[0:45–1:00] — Architectural Payoff & Close (over graph interaction / closing callout)**
> "No separate vector store, no external graph DB, zero ETL. MongoDB Atlas holds the state, memory, and retrieval in one document model, while OpenRouter synthesizes and narrates what the database already proved. Try it at mongomatch.vercel.app."

---

## 2. 60-Second Shot List (B-Roll)

No homepage filler — start directly on the working data:

1. **[0:00–0:18] Profile & Memory Note (`/shangmin-chen/mongomatch`)**
   - Start immediately on the profile page.
   - Smoothly scroll down and pause on the **"Grounded Memory Note"** container and derived tags.
   - Text overlay: *"MongoDB Atlas Document: State + Memory + Vector Embeddings"*.
2. **[0:18–0:45] Live Explore Knowledge Graph (`/explore`)**
   - Switch to `/explore`, type `langchain-ai/langgraph` (or click chip), hit Traverse.
   - Show the glowing multi-hop path connecting `langchain-ai/langgraph` → `#agents` → `hwchase17/langchain` → proof repo node.
   - Hold on the glowing Onstage AI Matchmaker narration card as it streams in.
   - Text overlay: *"Atlas $vectorSearch + $graphLookup in one aggregation pipeline"*.
3. **[0:45–1:00] Graph Interaction & Architecture Payoff**
   - Pan/zoom smoothly across the active graph cluster to show multi-attendee traversal.
   - Text overlay: *"2 LLM calls total (OpenRouter): Synthesize & Narrate — Database decides"*.
   - Closing callout: *"github.com/Shangmin-Chen/mongomatch · mongomatch.vercel.app"*.

---

## 3. CapCut Assembly Notes

- **Pacing**: Cut strictly at 0:18 / 0:45 / 1:00.
- **Audio**:
  - Voiceover normalized and prioritized.
  - Subtle instrumental tech background music ducked to ~15%.
- **Text Overlays**: Bold white sans-serif with subtle dark drop shadow at the three technical beats.
- **Captions**: Auto-captions enabled for muted viewers.
- **Export**: 1080p, 16:9, H.264, 60s total duration.


