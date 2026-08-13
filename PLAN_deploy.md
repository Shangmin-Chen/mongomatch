# Deploy — confirmed working, here's the workflow

## State, already verified (don't redo this investigation)

- GitHub remote: `git@github.com:Shangmin-Chen/mongomatch.git` (origin,
  branch `main`).
- Vercel project `mongomatch` (team `shangmin-chens-projects`) is linked
  (`.vercel/project.json`) **and its Git integration is confirmed
  connected** (`vercel git connect` reports "Shangmin-Chen/mongomatch is
  already connected to your project"). Pushing to `main` triggers an
  automatic Production build — no manual `vercel deploy`/`vercel --prod`
  needed per slice, just `git push`.
- Vercel Production + Preview env vars are fully set:
  `MONGODB_URI`, `MONGODB_DB_NAME`, `OPENROUTER_API_KEY`,
  `OPENROUTER_MODEL`. Verified via `vercel env ls`. **Don't re-add these —
  they're already there.**
- `GITHUB_TOKEN` is deliberately **not** set on Vercel. `scripts/enrich.mjs`
  is a standalone Node script, never invoked from any Vercel serverless
  route (no API route triggers enrichment) — it only ever runs locally
  (or wherever someone runs `node scripts/enrich.mjs` by hand), using the
  local `.env`. If that ever changes (e.g. enrichment gets triggered from
  an API route), this needs revisiting — out of scope for now.

## The workflow every remaining plan ends with

After a plan's own Definition of Done passes locally:
```
git add -A
git commit -m "<describes what shipped>"
git push origin main
```
That's the entire deploy step — the push itself triggers the build. After
pushing, check that the live site actually reflects the change (load
`https://mongomatch.vercel.app`, or `vercel ls` / `vercel inspect` if you
want build status from the CLI instead of opening a browser) — a successful
`git push` is not the same as a successful, correct deployment. If the
build fails, `vercel inspect --logs <deployment-url>` shows why.

## Definition of done for this doc

Nothing to build — this is state that's already true, confirmed by:
```
vercel git connect     # reports "already connected"
vercel env ls           # shows all 4 vars for Production + Preview
```
Every other plan (`PLAN_home.md`, `PLAN_4.md`, `PLAN_5.md`, `PLAN_6.md`,
`PLAN_7.md`) ends with the git-push workflow above — that's the only thing
that references this file.
