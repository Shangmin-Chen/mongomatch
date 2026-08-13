# MongoMatch — 1-Minute Demo Video Guide

Target length: **60 seconds (1:00)**. Fast-paced, dense, zero fluff.
Record each numbered shot as its own clean clip in QuickTime/OBS, record the voiceover, and assemble in CapCut.

Live site: **https://mongomatch.vercel.app**

---

## 0. Pre-flight Checklist

- Use a clean browser window (Incognito/private, no bookmarks bar, 100% zoom, 16:9 ratio).
- Pre-flight test on live site:
  - `https://mongomatch.vercel.app/` loads cleanly.
  - `https://mongomatch.vercel.app/shangmin-chen/mongomatch` loads and shows the grounded memory note.
  - `https://mongomatch.vercel.app/explore` loads with query `langchain-ai/langgraph` matching `hwchase17/langchain`.

---

## 1. The 60-Second Script (~140 words)

Read with crisp, confident energy at ~140 words per minute.

**[0:00–0:10] — The Hook (over Homepage `/`)**
> "Most AI agents start cold with zero context. MongoMatch is a live conference matchmaking graph on MongoDB Atlas that gets smarter with every attendee who joins, compounding memory over time."

**[0:10–0:25] — Ingest & Compounding Memory (over `/shangmin-chen/mongomatch`)**
> "When you register, MongoDB enriches your profile with real GitHub data, runs an Atlas `$vectorSearch` against existing attendees, and writes back a grounded memory note into your document so future searches learn from past connections."

**[0:25–0:50] — Live Aggregation Pipeline (over `/explore`, querying `langchain-ai/langgraph`)**
> "On the live graph, querying 'LangGraph' triggers a single MongoDB aggregation pipeline—combining `$vectorSearch` for semantic similarity and `$graphLookup` across shared skills. The only LLM call in this pipeline then picks the top unblocker, Harrison Chase, and drafts a verified onstage introduction in real time."

**[0:50–1:00] — Architecture & Close (over `/` or Title Card)**
> "No separate vector DB, no separate cache—just MongoDB Atlas holding state, memory, and retrieval all in one place. Try it live at mongomatch.vercel.app."

---

## 2. 60-Second Shot List (B-Roll)

Record these 4 focused screen captures:

1. **[0:00–0:10] Homepage (`/`)**
   - Clean 5s static shot of MongoMatch title and badge, then smoothly hover the 3 buttons: *Add Yourself*, *Search Profile*, *Explore Graph*.
2. **[0:10–0:25] Profile Page (`/shangmin-chen/mongomatch`)**
   - Scroll down to highlight the **"Grounded Memory Note"** box and the derived tags.
   - Text overlay: *"Grounded in retrieved memory — not a guess"*.
3. **[0:25–0:50] Explore Knowledge Graph (`/explore`) [The Hero Shot]**
   - Click search bar, type `langchain-ai/langgraph`, hit Traverse (or click chip).
   - Let the knowledge graph highlight the connection to `hwchase17/langchain` and the proof repo node.
   - Hold clean on the glowing Onstage AI Matchmaker narration card.
   - Text overlay: *"MongoDB $vectorSearch + $graphLookup in one aggregation"*.
4. **[0:50–1:00] Homepage / Closing Card**
   - Return to Homepage or dark closing graphic.
   - Text overlay: *"github.com/Shangmin-Chen/mongomatch · mongomatch.vercel.app"*.

---

## 3. CapCut Quick Assembly

- **Track Layout**:
  - Video Track: 4 clips cut to the 0:10 / 0:25 / 0:50 / 1:00 timestamps.
  - Audio Track 1: Voiceover (clean, loud, normalized).
  - Audio Track 2: Low-key background instrumental tech track (ducked to ~15%).
- **On-Screen Text**: Simple bold white sans-serif with subtle drop shadow at the 3 key moments.
- **Auto-Captions**: Enable CapCut auto-captions for muted viewers.
- **Export**: 1080p, 16:9, H.264, exactly 60 seconds.

