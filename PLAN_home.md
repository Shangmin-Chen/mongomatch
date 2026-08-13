# Home — real homepage + `/profile` (~10 min)

## What's changing

`app/page.tsx` currently just does `redirect("/form")` — there's no real
homepage. Replace it with an actual one-pager, and add a small `/profile`
page it links to. No dependency on any other remaining plan — this can be
built any time, standalone.

Note: profile pages themselves already live at the app root now, not under
`/me/` — `/handle` or `/handle/project` (see `PLAN_4.md`'s route note,
that move is already done). Identification is by **handle+project**, not
handle alone, so `/profile` should let someone specify both.

## What to build

### 1. `app/page.tsx`

A brief one-pager, same visual language as the rest of the app (plain
inline `style={}` + `app/globals.css`, `lucide-react` icons — no new UI
framework, consistent with every other page). Title, one line describing
what MongoMatch is, and **three buttons**:

- **Add Yourself** → `/form`
- **Search Profile** → `/profile`
- **Explore** → `/explore`

That's the whole page. Don't add anything else — no live counter, no
attendee list, nothing pulled from the DB. It's a static landing page; the
three destinations do all the actual work.

### 2. `app/profile/page.tsx`

Two text inputs — GitHub handle (e.g. `torvalds`), and an optional project
name (e.g. `linux`) — plus a submit button. On submit, normalize the handle
the same way `app/form/page.tsx` already does (strip `https://`, `www.`,
`github.com/`, leading `@`, trim `?`/`#` suffixes — copy that exact logic
locally into this file, don't import across pages), then:
- Handle only → `router.push('/' + cleanedHandle)`
- Handle + project → `router.push('/' + cleanedHandle + '/' + project.trim())`

No API call from this page — `/[...slug]` and `/api/person/[...slug]`
already handle the lookup, the loading state, and the "not found" state
(with a link back to `/form`) for a combination that doesn't exist.
`/profile`'s only job is turning "here's who I'm looking for" into
"navigate to the right URL."

## Definition of done

- `/` loads the three-button homepage, no redirect.
- Each button goes to the right place: `/form`, `/profile`, `/explore`.
- `/profile` with just a handle (e.g. `mongodbtesthelix`) lands on that
  person's profile page. `/profile` with handle + project (e.g.
  `burntsushi` + `ripgrep`) lands on `/burntsushi/ripgrep`. Typing garbage
  lands on the existing "Attendee Not Found" state, not a crash.

## Ship it

Once the above passes locally (`npm run dev`, click through all three
buttons and the profile-search flow):
```
git add -A
git commit -m "feat: add real homepage with three entry points, add /profile lookup"
git push origin main
```
Pushing to `main` triggers an automatic Vercel Production build (confirmed
connected — see `PLAN_deploy.md`, don't re-check this, it's already
verified). After pushing, load `https://mongomatch.vercel.app` once and
confirm the homepage actually renders live — don't assume a green build log
means the page looks right.
