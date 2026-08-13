# MongoMatch — Demo Video Guide

Target length: ~2:30–2:45. Screen-record each numbered shot as its own clip
in QuickTime/OBS, record voiceover separately (or live over the screen
recording), then assemble in CapCut per the notes at the bottom.

Live site: **https://mongomatch.vercel.app**

---

## 0. Pre-flight (do this before hitting record)

- Use a clean browser window: no bookmarks bar, no other tabs, incognito/
  private window so there's no autofill or extension UI in frame.
- Window size: something like 1440×900 or full-screen on a 16:9 display —
  CapCut will crop to 16:9 anyway, don't record ultrawide.
- Zoom the browser to 100% (not 110%/125%) so text isn't blurry when
  CapCut scales it.
- Confirm live before recording (30 seconds, saves a retake):
  - `https://mongomatch.vercel.app/` loads
  - `https://mongomatch.vercel.app/explore` loads, type
    `langchain-ai/langgraph` in the query box, confirm it returns
    `hwchase17/langchain` with narration (this is your hero shot — if the
    model picks something else this run, that's fine, still a real live
    answer, just adjust the script's narration quote to match what you
    actually see on screen)
  - `https://mongomatch.vercel.app/shangmin-chen/mongomatch` loads and
    shows the memory note

---

## 1. The script

Read this at a natural pace, roughly 130-150 words/minute. Timestamps are
targets, not hard cuts — pace to what feels right when you say it out loud.

**[0:00–0:15] — Hook, over the homepage**
> "Every AI agent starts from nothing. Ask it the same question twice, it
> relearns everything from scratch. MongoMatch doesn't. It's a live
> matchmaking graph for conference attendees — built entirely on MongoDB
> Atlas — that gets smarter every time someone joins, and remembers what it
> learned the last time you asked."

**[0:15–0:35] — The sign-up, over `/form`**
> "Here's how it starts. You tell it what you're building and what you're
> stuck on, and give it your GitHub. No résumé, no tags to fill in by
> hand — MongoDB does that part."

**[0:35–1:00] — The profile page, over `/shangmin-chen/mongomatch`**
> "Every submission gets enriched automatically — real repos, real
> languages, real topics pulled straight from GitHub, all stored back into
> one MongoDB document. But here's the part that matters for 'No Cold
> Start': after that write happens, the system runs a $vectorSearch against
> everyone already in the graph, finds this person's actual nearest
> neighbors, and writes a memory note back — grounded in real retrieved
> data, not a guess. That note gets folded back into the same field future
> searches embed on. So the graph's memory isn't just growing — it's
> compounding. What it learns from person twelve changes how it matches
> person thirteen."

**[1:00–1:25] — "How it's built," over a simple architecture card (see note below)**
> "Under the hood, this is two things, and only two things. First: MongoDB
> Atlas. A single document per person holds the raw signup, the cached
> GitHub data, the derived tags, the vector embedding, and the memory note
> — one place, no bolt-on vector database, no separate graph database, no
> ETL pipeline stitching stores together. Atlas Vector Search handles
> semantic retrieval with automatic embedding built in. `$graphLookup`
> handles the multi-hop graph traversal across shared tags. Both run as
> stages in one aggregation pipeline. Second: OpenRouter, running
> `gpt-4o-mini`. That's the *only* other moving part — and it's used
> exactly twice in this whole system. Once to synthesize the memory note
> you just saw, grounded in real retrieved neighbors. And once more, right
> now, to pick the winning match and narrate it. Every ranking, every
> score, every piece of retrieval before that — that's deterministic Mongo
> aggregation. The model never guesses who matches whom. It only narrates
> what the database already found."

**[1:25–2:05] — The Explore graph, over `/explore`, query: `langchain-ai/langgraph`**
> "So watch this live. I'll ask: who can unblock the LangGraph team? That
> query just ran `$vectorSearch` for semantic similarity, `$graphLookup`
> for the graph traversal, and a weighted ranking pass — all in Atlas.
> Then OpenRouter took the ranked candidates and drafted this: [let the
> real narration finish reading on screen, then read it aloud or let it
> speak for itself on camera]."

**[2:05–2:20] — Zoom on the graph + tags, still on `/explore`**
> "That's a real match, from a real MongoDB pipeline, in real time — not a
> canned demo response."

**[2:20–2:35] — Close, over the homepage or a black title card**
> "That's MongoMatch — MongoDB Atlas holding the state, the memory, and the
> retrieval in one place, and OpenRouter doing exactly the two things a
> model should do here: synthesize and narrate, never decide. An agent that
> doesn't start cold. Thanks for watching."

---

## 2. Shot list — exact navigation for b-roll

Record these as separate clips, in this order. Move the mouse deliberately
— slow, obvious hovers read much better on screen recording than fast
darting.

1. **Homepage** (`/`) — 5s static, then hover each of the three buttons in
   order (Add Yourself → Search Profile → Explore) without clicking, just
   to show them. ~10s total.
2. **`/form`** — Actually fill it out on screen (don't submit a duplicate
   of real data — either use a throwaway example or narrate over the
   already-filled form without submitting). Show the GitHub field
   specifically since that's the "no manual tagging" hook. ~15s.
3. **`/shangmin-chen/mongomatch`** — Load the page, let it settle, then:
   - Scroll to and pause on the "You're #N of N so far" counter (~3s)
   - Scroll to and pause on the memory note text (~5s, this is a key shot
     — the note is the "No Cold Start" payoff, make sure it's fully
     readable and not cut off)
   - Scroll to the tags row, pause (~3s)
   - Scroll to the mini graph embed if visible, pause (~3s)
4. **Architecture card** — this is the one shot that isn't a screen
   recording, it's a graphic you build directly in CapCut (see section 3)
   for the "How it's built" narration. Have it ready before you start
   editing so you're not blocking on design mid-edit. ~25s held on screen
   while you narrate over it.
5. **`/explore`** — the centerpiece:
   - Load the page (~2s)
   - Click into the query box, type `langchain-ai/langgraph` character by
     character (don't paste — typing reads as "live," pasting reads as
     "staged") (~3s)
   - Press enter / submit, then **hold still and let the graph render and
     the narration stream in fully** — don't talk over this in the
     recording, capture it clean, you'll narrate over it in the edit
     (~8-10s)
   - Once settled, slowly pan/zoom on the graph if the UI supports drag/
     zoom — show the highlighted path distinctly from the dimmer
     background nodes (~10s)
   - Click on the winning node (`hwchase17/langchain`) if the graph
     supports click-to-navigate, to show it deep-links to that person's
     real profile (~5s) — nice bonus shot, cut it if it doesn't land
     smoothly
6. **Full narration text on screen** — a clean static shot of just the
   narration box, held for 4-5s, unobstructed.
7. **Homepage again** for the closing shot — 5s static, maybe cursor
   resting near the "Add Yourself" button as a soft call-to-action visual.

Total raw b-roll: aim for ~100-130 seconds of footage (screen recording,
not counting the architecture card) to cut down into the ~155-165 second
final script above — always overshoot.

---

## 3. Assembling in CapCut

- **The architecture card** (for the "How it's built" beat, ~1:00–1:25):
  build this as a plain graphic on a black/dark-navy background (match the
  app's `#0b0f19`), no screen recording needed:
  - Title line: **"How it's built"**
  - Two grouped rows, each with a small colored dot or icon (CapCut's
    built-in shape/sticker tools are enough, don't overdesign this):
    - 🟢 **MongoDB Atlas** — `Vector Search (auto-embed)` · `$graphLookup`
      · `single document model`
    - 🔵 **OpenRouter (`gpt-4o-mini`)** — `2 LLM calls total: memory
      synthesis + narration`
  - Keep it on screen the full ~25s of that narration beat — this is the
    one slide judges will actually pause the video to read, don't rush it
    or cram more text on than the two rows above.
  - If you want a lighter lift: skip the custom graphic entirely and just
    hold on the `/shangmin-chen/mongomatch` profile shot from item 3 again
    while you narrate this beat, with the two `Text` overlays from below
    layered on top instead of a dedicated card. Either works — the card is
    slightly more polished, the reused shot is faster to produce.
- **Layer order**: screen recording on the bottom video track, voiceover
  (recorded separately, cleaner audio than talking live over screen
  capture) on an audio track, background music on a second audio track
  ducked to ~15-20% under the voiceover.
- **Music**: something low-key/instrumental, not competing with narration —
  CapCut's built-in royalty-free library has "tech/corporate" presets that
  work fine, don't overthink this.
- **Text overlays**: add short on-screen labels at these three moments
  (CapCut's "Text" → simple sans-serif, white text, subtle drop shadow):
  - Over the memory-note shot (item 3): **"Grounded in retrieved memory — not a guess"**
  - Over the `/explore` shot: **"MongoDB $vectorSearch + $graphLookup, live"**
  - Over the closing shot: **"github.com/Shangmin-Chen/mongomatch"** (or your
    actual submission link) — give judges something to note down.
  (The architecture card above already carries the "MongoDB Atlas /
  OpenRouter, 2 LLM calls total" message — don't repeat that exact line as
  a second overlay elsewhere, it'll read as redundant.)
- **Pacing**: cut on the beat of your voiceover, not arbitrarily — a clip
  should hold at least 2-3s minimum so nothing feels like a flash. The
  `/explore` render/narration moment (script section 3) is the one place
  to let a single shot breathe for 8-10s uncut — it's your best "wow"
  moment, don't chop it up.
- **Captions**: CapCut's auto-captions on your voiceover track are worth
  turning on — a chunk of hackathon judges skim videos muted first.
- **Export**: 1080p, 16:9, is the safe default unless the submission
  portal specifies otherwise — check the hackathon's actual submission
  page for a file size or length cap before exporting final.

---

## 4. Before you submit

- Watch the final export once, full volume, on a different device/speaker
  than you edited on — audio balance issues are easy to miss on your main
  monitor.
- Double-check the live URL you show on screen (`mongomatch.vercel.app`)
  is still up and responsive right before you upload the video — takes 10
  seconds, saves you from a submission that references a dead demo link.
