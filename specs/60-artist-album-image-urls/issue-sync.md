# Issue sync: #60 "Artist and Album image urls cannot be used."

**Branch at sync time**: `dev` @ `329ba317` · **Synced**: 2026-11-01 · **Baseline**: green

**Summary**: the issue body is a single screenshot with no text and no comments. The screenshot
alone pointed at a loading failure; the maintainer clarified that the real complaint is
**precedence** — an entered image URL does not win over the attached image. Old attached pictures
are not cleared for use, which is why a replacement URL was introduced in the first place.

## What the screenshot shows

The artist admin form's *Képek* (Images) section: the *Fotó URL* field holding
`https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Razor_14_%2829083912276%29.jpg/1280px-…`
(truncated at the right edge), the field ringed in red, and the preview below rendered as a
broken-image glyph. The *Fejléckép* (`Razor header`) and *Főkép* (`Razor main`) fields beside it,
which take attached documents, render correctly.

Per the maintainer's decision these two symptoms — the red ring and the broken preview — are **out
of scope** for this feature and belong to a later ticket.

## Current-state claims

| # | claim | status | evidence / correction |
|---|---|---|---|
| C1 | The artist form has a free-text photo-URL field, with no validator | ⚠️ accurate | `artist-form.component.html:155-165`; `artist-util.service.impl.ts:194` — `imageUrl: [artist?.imageUrl \|\| null]` |
| C2 | The album form has the same field and the same gap | ⚠️ accurate | `album-form.component.html:249-271`; `album-util.service.impl.ts:220` — `coverImageUrl` |
| C3 | A URL entered there is ignored by the app | ⚠️ **partly** — on 16 surfaces it is a fallback behind the attachment; on 9 surfaces it is genuinely ignored | see the inventory below |
| C4 | The failing URL's host or the hosting content policy is at fault | ❌ **false, verified live** | `thumb.wikimedia.org` is a real Wikimedia host (`CNAME dyna.wikimedia.org` → `185.15.59.224`); the exact URL returns `HTTP/2 200`, `content-type: image/jpeg`, `content-length: 131879`, `access-control-allow-origin: *`. `firebase.json:44` already allows the host — commit `34048fcc` was correct |
| C5 | The app itself produces Wikimedia thumb URLs | ✅ accurate | `artist-external.mapper.ts:36,255` builds `https://commons.wikimedia.org/wiki/Special:FilePath/<File>?width=1200`, which redirects twice and lands on exactly the screenshot's `thumb.wikimedia.org/...` URL |

## The precedence inventory

The order is **deliberate and documented**, not a defect. `daily-question-compose.ts:181` states it
outright: *"Ugyanaz a sorrend, mint a felületen (`music-view.mapper`): a feltöltött borító előbbre
való a netről talált címnél."* The same promise appears in the form hints in all three languages
(`hu.json:1979`, `en.json:1979`, `de.json:1979`, and the 1844 key for albums). **This feature
reverses that intent** for legal-clearance reasons.

### A — the attachment wins, the URL is the fallback (16 sites, to be reversed)

| site | order today |
|---|---|
| `libs/ui/src/lib/music-view/music-view.mapper.ts:95` | `mainImage?.filePath \|\| imageUrl \|\| discogs?.imageUrl` |
| `libs/ui/src/lib/music-view/music-view.mapper.ts:105` | `headerImage?.filePath \|\| imageUrl` — **stays as is**, see FR-006 |
| `libs/ui/src/lib/music-view/music-view.mapper.ts:73` | `release.album?.coverImage?.filePath \|\| coverImageUrl` |
| `libs/ui/src/lib/music-view/music-view.mapper.ts:118` | `coverImage?.filePath \|\| coverImageUrl` |
| `libs/domain/music/artist/.../artist-table.component.ts:62` | `mainImage?.filePath \|\| imageUrl \|\| discogs?.imageUrl` |
| `libs/domain/music/album/.../album-table.component.ts:78` | `coverImage?.filePath \|\| coverImageUrl` |
| `libs/domain/music/release/.../release-table.component.ts:81` | same |
| `libs/domain/music/collection-item/.../collection-item-table.component.ts:65` | same |
| `libs/domain/music/album/src/lib/view/simple/album-simple-view.component.html:3` | same |
| `libs/domain/music/album/src/lib/view/item/album-item-view.component.html:5` | same |
| `libs/domain/music/album/src/lib/view/detail/album-detail-view.component.html:14` | same |
| `libs/domain/music/music-collection/core/src/lib/music-collection.mapper.ts:36` | same |
| `apps/music-collection/src/app/shared/entity-view/pressing-row.ts:45` | same |
| `apps/music-collection/src/app/shared/player/player.store.ts:289` | same |
| `apps/music-collection/src/app/shared/player/player.store.ts:869` | same |
| `apps/functions/src/music-collection-badge-facts.ts:74,89` | same — **badge generation** |
| `apps/functions/src/daily-question-compose.ts:169,184` | same — **daily question** |

### B — the URL has no role at all (9 sites, to be wired up)

`artist-simple-view.component.html:26` · `artist-detail-view.component.html:8` ·
`album-simple-view.component.html:1` (background) · `wishlist-item-table.component.ts:64` ·
`wishlist-item-simple-view.component.html:12,56` · `wishlist-item-page.store.ts:54` ·
`wishlist-page.store.ts:109` · `collector-profile.model.ts:442` ·
`admin-dashboard.mapper.ts:70` (the "filled in" indicator only checks `headerImage`)

## Tasks

| # | task | status |
|---|---|---|
| T1 | Reverse the order on the 16 A-sites so the entered URL wins | ⬜ not started |
| T2 | Wire the entered URL into the 9 B-sites | ⬜ not started |
| T3 | Apply the same order in the two server-side composers | ⬜ not started — needs a functions deploy (constitution VIII) |
| T4 | Replace the form hints in `hu`, `en` and `de` | ⬜ not started |
| T5 | Keep the artist header on the attached header image | ⬜ not started — regression guard |

## Testing plan

No test covers either field today: `artist-form.component.spec.ts`, `artist-form.service.spec.ts`,
`album-form.component.spec.ts` and `album-form.service.spec.ts` never mention `imageUrl` or
`coverImageUrl`, `libs/ui/src/lib/music-view/` has no `music-view.mapper.spec.ts`, and
`toCommonsImageUrl` has no test. The `functions` level already has
`music-collection-badge-facts.spec.ts` and `daily-question-compose.spec.ts` to extend.

Levels used (per `.specify/project/verify.md`): `unit` for AC-1, AC-2, AC-3, AC-5, AC-6;
`functions` for AC-4.

## Constitution

| Principle | Fit |
|---|---|
| II — Root cause over workaround | ✅ the order itself is changed at each site, not patched at the edges |
| III — A test proves the change | ⚠️ zero coverage on these fields today; every AC names a test file |
| VII — Business logic in the store | ⚠️ the order is currently duplicated across mappers, components and stores; the plan should consider one shared rule rather than 25 edits |
| VIII — No deploy without the maintainer | ⚠️ AC-4 only takes effect after a functions deploy |
| XI — Every AC names its test level | ✅ |
| XV — New origins through the CSP | ✅ **not in scope** — `firebase.json` needs no change (C4) |

## Baseline tests — green

| command | result |
|---|---|
| `npx nx run-many -t test -p domain-artist domain-album --skip-nx-cache` | ✅ pass, both projects, 18.8s |
| `npm run build:dev` (→ `npm run verify:csp`) | ✅ pass — "The hosting CSP matches the built page: 2 inline things hashed, nothing left over." |

`verify:csp` failed on the first attempt against a stale `dist/` from Oct 28 that was a
non-optimized build with no inline critical CSS — the exact case the script's own comment warns
about. Green after a fresh `build:dev`. Not a pre-existing defect.

## Approved acceptance criteria

AC-1 … AC-6 as written in `spec.md`, approved by the maintainer on 2026-11-01. A seventh AC covering
the fate of the old attachments was dropped: they stay.

## Decisions taken at the gate (2026-11-01)

1. **The artist header keeps the attached header image.** Only the main picture falls behind the
   entered URL — one entered URL cannot serve two roles. → FR-006, AC-6
2. **The 9 B-sites are in scope.** Without them the replacement is partial and reads as a broken app.
   → FR-003, AC-3
3. **Old attachments stay.** No withdrawal, no deletion; this feature only reorders. → FR-007
4. **The red outline and the broken preview are out of scope.** A later ticket.
5. **The AC list is approved as drafted.**

## Open consequence recorded at the gate

With the entered URL in front, an entered URL that fails to load leaves the entry with **no picture
at all**, even where a usable attachment exists. No fallback is specified, deliberately: falling
back would re-show the very picture being replaced. This raises the value of decision 4's later
ticket (telling the admin that a URL failed to load), and is recorded in the spec's Edge Cases and
Assumptions.
