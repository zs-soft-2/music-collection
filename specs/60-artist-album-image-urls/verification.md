# Verification: 60-artist-album-image-urls — issue #60 — 60-artist-album-image-urls @ 46ce1de4 (working tree) — 2026-11-01

**Result**: GAPS  (4 ✅ · 1 ⚠️ · 1 ❌)

The branch carries **no commits**: every change listed here is in the working tree on top of
`46ce1de4`. All 50 tasks in `tasks.md` are ticked. The issue has not changed since the spec
(`updatedAt` 2026-10-31, no comments), so there is nothing "changed since the spec".

## Acceptance criteria

| AC | Criterion | Verdict | Evidence |
|---|---|---|---|
| AC-1 | An artist with both an attached main image and an entered photo URL shows the entered URL | ✅ met | `unit` — `libs/common/engine/src/lib/image-url.spec.ts` case 10, `libs/ui/src/lib/music-view/music-view.mapper.spec.ts` case 10, `libs/domain/music/artist/.../artist-table.component.spec.ts` case 1 → `common-engine` 61/61, `ui` 105/105, `domain-artist` 57/57 pass. Code: `libs/common/engine/src/lib/image-url.ts:68`, `libs/ui/src/lib/music-view/music-view.mapper.ts:93`, `libs/domain/music/artist/src/lib/collection/component/table/artist-table.component.ts:65`, `libs/domain/music/artist/src/lib/view/component/simple/artist-simple-view.component.ts:42`. Every artist surface is handed a full `ArtistEntity`, so `imageUrl` really reaches the rule. |
| AC-2 | An album with both an attached cover and an entered cover URL shows the entered URL | ✅ met | `unit` — `image-url.spec.ts` cases 1–2, `music-view.mapper.spec.ts` cases 1–2 (album **and** release), `album-table.component.spec.ts` case 1 → `domain-album` 64/64, `music-collection-core` 19/19, `music-collection` 1551/1551 pass. Code: `image-url.ts:92` and the 14 group-A call sites (`album-table.component.ts:79`, `release-table.component.ts:81`, `collection-item-table.component.ts:65`, `album-{simple,item,detail}-view.component.ts`, `music-collection.mapper.ts:40`, `pressing-row.ts:46`, `player.store.ts:290,869`). The release snapshot carries the field: `release-util.service.impl.ts:299,312` already copies `coverImageUrl`. |
| AC-3 | An entered URL with no attachment is used on the surfaces that today render only the attachment | ❌ **not met** (3 of 9 sites) | ✅ B1 `artist-simple-view.component.spec.ts` case 3, B2 `artist-detail-view.component.ts:57` (`toArtistHeaderUrl`), B3 `album-simple-view.component.ts:24` — all three are handed full entities. ❌ B4–B9 (wishlist table, both wishlist-simple-view layouts, `wishlist-item-page.store.ts:55`, `wishlist-page.store.ts:110`, `collector-profile.model.ts:443`) read `wishlistItem.albumReference`, and `AlbumReference` (`libs/api/src/lib/domain/music/album/album.ts:76`) has **no `coverImageUrl`**; `createAlbumReference` (`libs/domain/music/wishlist-item/src/lib/util/service/wishlist-item-util.service.impl.ts:253`) stores only `{ coverImage, name, uid }`. The two tests that claim these sites pass only on a fabricated shape — `tsc -p apps/music-collection/tsconfig.spec.json` reports `TS2561: 'coverImageUrl' does not exist in type 'Partial<AlbumReference>'` at `collector-profile.model.spec.ts:280`. See Code review finding 1. |
| AC-4 | The server composers use the entered cover URL | ✅ met | `functions` — `apps/functions/src/catalog-image-url.spec.ts` (the full 9-case table), `music-collection-badge-facts.spec.ts`, `daily-question-compose.spec.ts` → `npx nx test functions` 677/677 pass; `npx tsc -p apps/functions/tsconfig.app.json --noEmit` clean. Code: `catalog-image-url.ts:36`, `music-collection-badge-facts.ts:87`, `daily-question-compose.ts:180`. Inert until the functions are deployed — the maintainer's call (constitution VIII), as the spec assumes. |
| AC-5 | The hint under the image URL field says the entered URL takes precedence, in hu/en/de | ✅ met | `unit` — `artist-form.component.spec.ts` and `album-form.component.spec.ts` assert the rendered placeholder, that it is not the bare key, that it matches `/precedence/i` and no longer `/used when no/i` (en locale) → `domain-artist` and `domain-album` green. hu/de: `core-i18n` `dictionaries.spec.ts` ("has exactly the keys English has", "leaves nothing blank") → 50/50 pass, and the three strings read directly: `hu.json:1844,1979`, `en.json:1844,1979`, `de.json:1844,1979`. The old keys `used-when-no-main` / `used-when-no-cover` are gone from the whole repo. |
| AC-6 | An artist's attached header image keeps precedence over the entered photo URL | ✅ met, with a note | `unit` — `image-url.spec.ts` cases 16–19, `music-view.mapper.spec.ts` case 16 → green. Code: `image-url.ts:85`, `artist-detail-view.component.ts:57`. ⚠️ `music-view.mapper.ts:100` still hand-writes `headerImage?.filePath \|\| imageUrl` instead of calling `toArtistHeaderUrl` — deliberate per `data-model.md` group C1, but it diverges from guarantee G5 (see Code review finding 4). |

## Regressions

Baseline from `issue-sync.md` (green at `329ba317`), rerun on the working tree:

| Check | Baseline | Now |
|---|---|---|
| `npx nx run-many -t test -p domain-artist domain-album --skip-nx-cache` | ✅ pass | ✅ pass — `domain-artist` 57/57, `domain-album` 64/64 |
| `npm run build:dev` → `npm run verify:csp` | ✅ pass | ✅ pass — "The hosting CSP matches the built page: 2 inline things hashed, nothing left over." |

Full fast suites from `.specify/project/verify.md`:

| Suite | Result |
|---|---|
| `unit` — `npx nx run-many -t test --exclude=firestore-rules,functions` | ✅ pass, 35 projects. Re-run fresh (`--skip-nx-cache`) for the 9 touched projects: `common-engine` 61, `ui` 105, `domain-artist` 57, `domain-album` 64, `domain-wishlist-item` 28, `domain-release` 79, `domain-collection-item` 17, `music-collection-core` 19, `music-collection` 1551 — all pass |
| `functions` — `npx nx test functions` | ✅ pass, 42 suites / 677 tests |
| `rules` — `npm run test:rules` | ✅ pass, 21 suites / 384 tests (no rules file changed; run as the standing gate) |
| `e2e` | not run — no AC is at the `e2e` level, and the suite needs the dev project's deployed callables |

No regression. Nx reported `music-collection:test` and `domain-release:test` as historically flaky; both passed here. `role-admin.store.spec.ts` produced one unrelated SIGSEGV flake during the review run and passed on re-run.

## Constitution

Checked `.specify/memory/constitution.md` v1.0.0 (ratified, not the template) and
`.specify/kit/stack-angular-firebase.md` against the working-tree diff (41 modified files,
5 new files, +612/−87).

| Principle | Verdict |
|---|---|
| II Root cause over workaround | ✅ the order is changed in one shared rule per runtime, not patched at the edges. ⚠️ one hand-written copy survives at `music-view.mapper.ts:100` (group C1, deliberate) |
| III A test proves the change | ❌ the two AC-3 wishlist/profile tests (`wishlist-item-table.component.spec.ts:75,86,100`, `collector-profile.model.spec.ts:279,287,296`) assert a shape the app cannot produce; `tsc` flags it and ts-jest does not fail on diagnostics, so they prove nothing. Every other AC's test is sound |
| IV No change without a ticket | ⚠️ the branch has **no commits** — nothing references `(#60)` yet. Commit before the PR |
| VI Layer chain / VII Business logic in the store | ✅ no component injects a repository; the rule lives in `common-engine` (`type:engine`) and components only hold a `protected readonly` reference to the pure function for their template, as `research.md` D3 decided |
| VIII No deploy without the maintainer | ✅ nothing deployed, nothing written to dev or prod; AC-4 is flagged as deploy-pending |
| IX `platform:` boundaries | ✅ `libs/common/engine/src/lib/image-url.ts` imports nothing — no Angular, no Firebase; the shapes are structural |
| X `type:` boundaries | ✅ `type:domain → type:engine` is allowed; `npx nx run-many -t lint` over all 9 touched projects: 0 errors (warnings only, all pre-existing) |
| XI Every AC names its test level | ✅ all six name `unit` or `functions`, and both suites pass |
| XII The checks pass before review | ✅ `npm test`, `npm run test:rules`, `npm run lint`, `npm run verify:csp` all pass. Note `npm run lint` only lints the `music-collection` app; the nine touched projects were linted separately |
| XIII `apps/functions` is its own project | ✅ `catalog-image-url.ts` imports nothing from `libs/`; `tsc -p apps/functions/tsconfig.app.json --noEmit` clean |
| XIV Rules change with a test | n/a — `firestore.rules` and `storage.rules` untouched |
| XV New origins through the CSP | ✅ no new origin; `verify:csp` green |
| XVI–XXI | n/a — no private-data read, no Firestore write path, no App Check change, no model call, no deletion path touched |
| Stack rules (`stack-angular-firebase.md`) | ✅ no `as any`, no `standalone: true`, no inline template in the diff. ⚠️ its "verify against the emulators, never a live project" conflicts with constitution XIX (dev project) — the constitution's Sync Impact Report already records that the kit's `emulators-only` principle was replaced by `dev-verification`; no finding |

**Traceability note**: AC-1, AC-2 and AC-6 tests are named `case <n>` after the case table in
`contracts/image-url-rule.md` rather than `AC-<n>`. The mapping is written in the contract
(case 1 → AC-2/AC-4, case 10 → AC-1, case 16 → AC-6), so it is traceable, but a grep for `AC-1`
finds nothing.

## Code review

Ran the `code-review` skill at `medium` on the working-tree diff. Five findings, all verified:

1. **AC-3 is not met on six surfaces** — `wishlist-item-util.service.impl.ts:253` /
   `libs/api/.../album.ts:76`. `AlbumReference` has no `coverImageUrl` and
   `createAlbumReference` strips it, so B4–B9 still cannot show an entered cover.
   `AlbumImageSource`'s all-optional shape makes TypeScript accept the argument silently —
   the very structural looseness `research.md` D1 chose for these call sites is what hid the gap.
   A fix needs the field on the type, in `createAlbumReference`, and a backfill for the wishlist
   items already stored (or a read-through to the album). The plan never noticed this:
   `tasks.md:248-311` prescribes exactly what was built.
2. **The tests mask finding 1** — `collector-profile.model.spec.ts:280` (and
   `wishlist-item-table.component.spec.ts:75,86,100`) fabricate `coverImageUrl` on an
   `AlbumReference`; `tsc -p apps/music-collection/tsconfig.spec.json` reports TS2561 at 280 and
   TS2739 at 289/298. ts-jest does not fail on diagnostics (that tsconfig has 38 further
   pre-existing errors, so it is not a gate in this repo).
3. **The Discogs fill-in now overrides attached covers** — `album-discogs.mapper.ts:89,116`:
   `coverImageUrl` is one of `ALBUM_GAPS`, so the fill-in writes the external URL whenever the
   field is empty, without looking at whether a cover is attached. With the precedence reversed,
   running the fill-in on an album with a hand-uploaded cover silently replaces what is shown.
   The spec treats `imageUrl`/`coverImageUrl` as "the admin's deliberate choice"; three writers
   (Discogs fill-in, the Wikimedia lookup, the server import) also write it. Not an AC violation
   — a consequence the spec did not weigh.
4. **`music-view.mapper.ts:100`** hand-writes the header order instead of calling
   `toArtistHeaderUrl`, and diverges on guarantee G5: a whitespace-only `headerImage.filePath` is
   returned as the banner instead of falling through. Group C1 says this site keeps its own
   expression; calling `toArtistHeaderUrl(artist)` would be equivalent and G5-correct.
5. **`album-simple-view.component.html:1`** — `[style.background]="coverUrl(album)"` puts a bare
   URL into the `background` shorthand, which is invalid CSS and dropped by the browser. B3's
   "(background)" half renders nothing, before or after this change. The `<p-image>` in the same
   component does work, so the surface is not blank.

## Open items

- **AC-3 fails on the six wishlist/collector-profile surfaces** (finding 1). Blocking: the spec's
  User Story 2 scenario 2 ("an album whose only picture is an entered address, on a wishlist") and
  SC-002 ("no surface renders an empty frame") are not satisfied.
- **Two tests assert an impossible shape** (finding 2) — constitution III. They must fail before
  the fix, not pass without it.
- **The Discogs fill-in interaction** (finding 3) — needs a maintainer decision: either exclude
  `coverImageUrl`/`imageUrl` from the gap fill-in when an attachment exists, or accept it and
  record it in the spec's Assumptions. A separate issue is the natural home.
- **Nothing is committed.** The branch has no commits, so no commit message references `(#60)`
  (constitution IV). The ticket-number check cannot pass until the work is committed.
- **G5 divergence at `music-view.mapper.ts:100`** (finding 4) — cosmetic, one-line.
- **`album-simple-view` background is invalid CSS** (finding 5) — pre-existing, worth its own issue.
- **AC-4 is inert until the functions are deployed** — the maintainer's call (constitution VIII);
  recorded in the spec's Assumptions, not a gap.
- Unticked tasks: none (50 of 50 ticked).
- Changed since the spec: nothing — issue #60 has no comments and has not been edited since
  2026-10-31.

## PR summary

*Not ready to open yet — finding 1 fails AC-3. Kept here for when the gap is closed.*

### Entered image URLs take precedence (#60)

An admin who may no longer show an artist's or an album's attached picture had no way to replace
it: the attachment won and the typed-in address was only a fallback. This reverses the order
everywhere a picture is drawn.

One rule per runtime, rather than 25 copies of a `||` chain:

- `libs/common/engine/src/lib/image-url.ts` — `toArtistImageUrl`, `toArtistHeaderUrl`,
  `toAlbumCoverUrl` for the browser (`platform:agnostic`, structural shapes).
- `apps/functions/src/catalog-image-url.ts` — the album half again for the Cloud Functions, which
  may not import workspace libraries (constitution XIII).
- `specs/60-artist-album-image-urls/contracts/image-url-rule.md` — the one written statement of the
  order; both suites assert its case table, and the overlap is the drift guard.

The artist's attached **header** keeps precedence, because one typed-in address cannot serve both
the banner and the picture. Attachments stay stored, searchable and selectable; only the order
changes. The form placeholders in hu/en/de now say what the order is.

| AC | Criterion | Verdict |
|---|---|---|
| AC-1 | An artist's entered photo URL beats the attached main image | ✅ |
| AC-2 | An album's entered cover URL beats the attached cover | ✅ |
| AC-3 | The entered URL reaches the surfaces that ignored it | ❌ six wishlist surfaces outstanding |
| AC-4 | The badge and daily-question composers apply the same order | ✅ (needs a functions deploy) |
| AC-5 | The form hint states the precedence, in hu/en/de | ✅ |
| AC-6 | The attached header image keeps precedence | ✅ |

Closes #60
