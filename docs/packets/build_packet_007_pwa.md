# Build Packet 007 — PWA: installable shell, offline-safe service worker, Android share target

**Prepared:** 2026-09-02 · prep session with Justin · icons generated during this prep session so no unit has to synthesise binary assets
**Risk class:** moderate, with one asymmetric hazard — **a bad service worker is the only change in this whole rework that can make the app un-updatable from Justin's phone.** The cache strategy below is chosen for that reason, not for offline elegance.
**Merge policy:** auto-merge on PASS authorized for U007-A. **U007-B is merge-on-Justin's-word** — the share target changes how Android routes a share, and it is worth one deliberate look.
**Concurrency:** run ALONE among the web packets. Safe alongside 008.
**Deploy surface:** Worker only (`web/**`).
**DB prep status:** no DDL and none needed. U007-B writes a `research` row using columns that already exist.
**Session role:** you are the PLANNER. Issues tag `@claude`; the executor builds on a branch; you open the PR, adjudicate the diff, and merge only after posting an explicit PASS.

**Prep already done — do not redo:**
- **The icons are prep-owned, not unit-owned.** `web/icons/icon-192.png`, `web/icons/icon-512.png` and `web/icons/icon-maskable-512.png` were generated in the 2026-09-02 prep session — a white inbox-tray line mark on the app's `--ink` navy `#131826`, the maskable variant with its glyph inset to ~78% for Android's safe zone — and **uploaded to `web/icons/` by Justin**, because the chat connector cannot write binary files and the session's git proxy refuses pushes to this repo. **No unit generates, edits or replaces an image.** If a unit believes it needs a different icon, that is a finding for Justin and a new prep upload, not a build step. The asset gate below is what proves they arrived.
- **The Worker serves `web/` verbatim** from `wrangler.toml` (`[assets] directory = "./web"`), so a new file under `web/` is a new URL with no routing work. Content type for `.webmanifest` is served by the assets handler; if the manifest ever comes back as `text/plain` in Justin's check, that is a finding, not a unit fix.
- **The app is a single HTML file with no build step.** The service worker must be plain JS at `web/sw.js`, served from the origin root (`/sw.js`), which is what gives it a root scope.
- **Auth is Supabase password-primary with an email-link fallback.** The email link returns to `https://inbox.justin-dec.workers.dev/inbox.html` carrying a hash fragment. Anything that intercepts navigation must not eat that fragment — see the constraint below.

## Hard constraints (verbatim, non-negotiable)

1. **The service worker never caches HTML, JS, or the manifest.** `inbox.html`, `index.html`, `config.js`, `sw.js` and `manifest.webmanifest` are **always** network-first with no cache fallback. **Only `web/icons/*` may be cached** — they are the one immutable asset here. The manifest is deliberately excluded because U007-B edits it: a cached manifest would leave an installed app with the old share-target definition and no way to notice. This is the constraint that keeps a deploy able to reach the phone; a "cache-first with background revalidate" strategy for the app shell = FAIL, however conventional it is.
2. **No offline write queue, no background sync, no push.** Those are parked (`docs/backlog.md`); a unit that adds one is a STOP.
3. **The service worker never intercepts a request to the Supabase origin** (`https://qaabxgldjluqyccwhjzf.supabase.co`) or any cross-origin request. Its `fetch` handler returns early for anything whose origin is not the app's own.
4. **No DDL, no `supabase/` edit, never touch `.github/workflows/`.**
5. **No model calls.** `grep -rc "api.anthropic.com" web/` → `0` for every file.
6. One unit per issue. Branch `claude/issue-N-YYYYMMDD-HHMM`. A tripped STOP is always a stop.
7. **Secret placeholders in every issue:** names only, examples WITHOUT angle brackets.
8. **Supabase connector discipline:** ONLY **Supabase Inbox** (`qaabxgldjluqyccwhjzf`).
9. **No new dependency, no build step, no Workbox.** Hand-written service worker, under 60 lines.
10. **In-scope files, exhaustively:** U007-A → `web/manifest.webmanifest` (new), `web/sw.js` (new), `web/inbox.html`, `web/config.js` (**version bump line only**). U007-B → `web/manifest.webmanifest`, `web/inbox.html`, `web/config.js` (**version bump line only**). **No unit touches `web/icons/`.**
11. **`INBOX_VERSION` bumps in every unit** (`007-A`, `007-B`). `sw.js` carries a `CACHE` constant; only a unit that edits `sw.js` changes it.

## Session-open gates

- **Flip this packet's INDEX row to RUNNING first** (docs-only PR, merged by you).
- Read `docs/current.md`, `docs/backlog.md`, `CHANGELOG.md`. Connector down → STOP.
- Ordering gate: `docs/packets/INDEX.md` shows 006 COMPLETE.
- **Asset gate (literal):** all three files exist on `main` under `web/icons/` and fetch with HTTP 200 from `https://inbox.justin-dec.workers.dev/icons/icon-512.png` and siblings. Missing → STOP the packet (the prep premise is stale; do not generate replacements).
- Deploy-state gate: `https://inbox.justin-dec.workers.dev/config.js` contains `window.INBOX_VERSION = "006-B";`.
- File-size gate: any file over 300 KB → finding.

---

## U007-A — manifest, service worker, standalone, theme-color

**Why:** Justin uses this on one Android phone. Installed, it opens without browser chrome, keeps its own task in the switcher, and gets a home-screen icon — the difference between a bookmark and an app. The Capacitor wrap stays parked; this is the 90% of it that costs one unit.
**Scope:** `web/manifest.webmanifest` (new), `web/sw.js` (new), `web/inbox.html`, plus the one-line `INBOX_VERSION` bump in `web/config.js` and nothing else in that file.

### Pinned contract — `web/manifest.webmanifest`

```json
{
  "name": "Inbox",
  "short_name": "Inbox",
  "start_url": "/inbox.html",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#EEF1F6",
  "theme_color": "#EEF1F6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- `start_url` is `/inbox.html`, not `/` — `index.html` is a meta-refresh redirect and starting there costs a visible hop on every launch.
- No `share_target` in this unit; that is U007-B.

### Pinned contract — `web/inbox.html`

Added to `<head>`:

```html
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" id="tc" content="#EEF1F6">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```

- **Exactly one `theme-color` meta, with no `media` attribute.** A media-query pair plus a non-media tag is not a design choice to delegate: an unconditional tag always matches, so the pair would be dead markup decided by DOM order. The single tag ships with the light `--bg` as its static default, and `applyTheme` sets its `content` to `#EEF1F6` or `#12151D` — the existing light and dark `--bg` tokens — on every theme change, including the one it already performs on load. So the system bar matches the page in both themes and follows the in-app toggle, which the media-query version could not do.

Registration, at the end of the existing IIFE:

```js
  if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('/sw.js').catch(function(e){
        console.warn('sw registration failed', e);
      });
    });
  }
```

- A registration failure is logged and swallowed. The app must work identically with the service worker absent, blocked, or disabled — that is what makes this unit safe to ship.

### Pinned contract — `web/sw.js`

- `var CACHE = 'inbox-007-A';` — the name changes on every unit that touches `sw.js`, and `activate` deletes every cache whose name is not the current one.
- `install`: `self.skipWaiting()`, and pre-cache **only** the three icons. Nothing else — not the manifest, not any HTML.
- `activate`: `clients.claim()` plus the old-cache sweep.
- `fetch`, in this order:
  1. Not a `GET` → return (do not call `respondWith`).
  2. Request URL's origin ≠ `self.location.origin` → return. This is what keeps Supabase auth, realtime and REST entirely out of the worker.
  3. Path starts with `/icons/` → cache-first, falling back to network and caching the response.
  4. **Everything else → `fetch(event.request)` with no cache read and no cache write.** No offline fallback page. Offline means the browser's own error, which is honest and, crucially, recoverable by a reload once signal returns.
- Under 60 lines. No Workbox, no import.

**What-survives proof (required in the PR body):**
1. `node --check web/sw.js` output and exit code.
2. `grep -n "caches.match\|caches.put\|cache.put" web/sw.js` — every hit annotated, and every one of them on an `/icons/` path.
2b. `grep -n "manifest" web/sw.js` → empty.
3. `grep -n "inbox.html\|config.js\|\.js'" web/sw.js` → no hit inside a caching branch.
4. `grep -n "supabase" web/sw.js` → empty (the origin check makes naming it unnecessary).
5. `wc -l web/sw.js`.
6. `git diff --stat main` — four files, two new (`manifest.webmanifest`, `sw.js`, `inbox.html`, and the one-line `config.js` bump).

**Adjudication:** PASS shape = four files; the manifest exactly as pinned; the worker's fetch handler in the four-step order above with the cross-origin early return present; registration failure swallowed; exactly one `theme-color` meta. FAIL on: any HTML, JS or manifest cached; a cross-origin request intercepted; an offline fallback page; Workbox or any import; `web/icons/` touched; a manifest key not in the pinned object; version not bumped to `007-A`.

**STOP conditions:** the icon files are absent from `main` (asset gate); `wrangler.toml` no longer serves `./web` as assets.

---

## U007-B — Android share target → Research capture

**Why:** the fastest capture Justin has is a link he is already looking at. `share_target` turns "share to Inbox" into a Research row without opening anything first. D-20 caps research capture at the topic; the brain dump is packet 009's overlay, so this unit stops at the row.
**Scope:** `web/manifest.webmanifest`, `web/inbox.html`, plus the one-line `INBOX_VERSION` bump in `web/config.js` and nothing else in that file. **`web/sw.js` is deliberately out of scope** — the manifest is never cached, so no worker change is needed. File after Justin confirms U007-A on the phone.

### Pinned contract — manifest addition

```json
  "share_target": {
    "action": "/inbox.html",
    "method": "GET",
    "params": { "title": "title", "text": "text", "url": "url" }
  }
```

- **GET, not POST.** A POST share target requires the service worker to intercept and re-serve the navigation — exactly the HTML interception constraint 1 forbids. GET lands on the page with query parameters and needs no worker involvement at all.

### Pinned contract — `web/inbox.html`

A share handler that runs **after** auth resolves, once, on the signed-in path:

1. Read `title`, `text`, `url` from `location.search`. Nothing present → do nothing.
2. Compose the body: the first non-empty of `title`, `text`; append ` ` + `url` when `url` is present and not already contained in the composed string. Android varies in which fields it fills, so all three shapes must produce something sensible: title-only, text-only, url-only.
3. Trim; collapse whitespace; **truncate to 280 characters** (`messages_body_check`), and **put the truncated string in the input** — not the full text. The research capture path is untouched by packet 004 and has no length guard, so prefilling an over-length string would hand Justin a button that fails silently on tap, which `docs/current.md` forbids of every capture path. When truncation happened, say so once in the existing inline-message style (`Shared text was long — trimmed to 280 characters.`).
4. Switch the app to the **Research** section, prefill the capture input with the composed body, and **focus it — do not insert automatically.** A share is a suggestion; a silent write from a system-level gesture is how a research list fills with accidents. Justin taps Add.
5. Clear the query string with `history.replaceState(null, '', location.pathname)` **before** anything else can re-read it, so a reload does not re-prefill.
6. **If no session exists**, hold the composed text in a module variable, let the sign-in gate run, and prefill after `route()` reports a user. Do not stash it in `localStorage`.

**The auth-fragment rule:** the existing `##access_token` normalisation at the top of the IIFE runs before any of this and is not moved, not reordered and not modified. `location.hash` is untouched by the share handler.

**What-survives proof (required in the PR body):**
1. `grep -n "replaceState" web/inbox.html` → the pre-existing hash normalisation and exactly one new call in the share path; both quoted.
2. `grep -n "share" web/inbox.html` → the handler only.
3. A worked table from the executor's own code: title-only, text-only, url-only, title+url, and a 400-character text → the exact string placed in the input for each, with the 400-character case shown at exactly 280 and the notice fired.
4. Confirmation in words that no automatic insert happens on any of the five inputs.
5. `git diff --stat main` — three files (`manifest.webmanifest`, `inbox.html`, and the one-line `config.js` bump).

**Adjudication:** PASS shape = three files; GET share target; prefill-and-focus with no write; the input holding at most 280 characters; query string cleared; the signed-out case deferred in memory only; the hash normalisation untouched. FAIL on: a POST share target; an automatic insert; an over-length string left in the input; `localStorage` used for the shared text; `web/sw.js` modified in this unit (it needs no change — the manifest is never cached); the hash normalisation moved; version not bumped to `007-B`.

**STOP conditions:** `manifest.webmanifest` on `main` is not the U007-A version (record what IS there).

---

## End-of-run report (single message, final)

1. Per unit: PASS / FAIL / STOPPED, issue numbers, PR numbers, merge SHAs, shipped version values, and the `CACHE` name shipped.
2. The service worker's fetch handler, quoted in full, in the report — it is the highest-consequence 20 lines in the rework and it belongs in the record.
3. Confirmation that no `supabase/` file was touched, no DDL was issued, and `web/icons/` is byte-identical to the prep commit.
4. **Actions for Justin** (explicitly separated checklist):
   - Confirm `deploy-worker` green on both merges.
   - **After U007-A**, on Android: hard-refresh the app, then Chrome menu → **Install app** (or "Add to Home screen"). Launch from the home screen: no address bar, an inbox-tray icon, and the status bar matching the page in both light and dark. Then the update proof, which matters more than the install — **with the app open, have the planner merge nothing; instead reload twice.** The second reload must still show `007-A` in `config.js`, and when the next unit deploys, one reload must show `007-B`. **If a deployed version ever fails to appear after two reloads, STOP the packet and say so** — that is the service worker caching HTML, and it is the one failure mode worth halting for.
   - Sign out and back in from the installed app, using the email link once, to prove the auth fragment still survives.
   - **After U007-B:** from Chrome, share any page → **Inbox** appears in the share sheet. Tapping it opens the app on Research with the title and link prefilled in the capture box and **nothing saved yet**. Tap Add — one row. Repeat from a plain text selection and from a note app, and confirm all three shapes prefill something sensible.
   - Reload the app after a share and confirm the box does not re-prefill.
   - If anything deviates from prediction: STOP, paste everything to the planning chat, change nothing else.

---

## Packet close-out (inventory maintenance)

When the run ends (PASS/FAIL/STOPPED), land ONE final PR through the normal pipe that adds the full end-of-run report as `docs/packets/reports/packet_007_report_YYYYMMDD.md` and flips this packet's row in `docs/packets/INDEX.md` to COMPLETE (or STOPPED, with a one-line reason), linking the report. Auto-merge on PASS applies to this close-out PR. Every run report ends with an explicitly separated "Actions for Justin" checklist (state "no action needed" if empty).
