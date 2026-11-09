# Verification: The entered picture address reaches wishes and stored album copies — issue #79 — 79-image-url-wishlist-snapshots @ cfefffe4 — 2026-11-07

**Result**: READY FOR PR  (8 ✅ · 0 ⚠️ · 0 ❌)

The code, tests, docs and the dev backfill are done and committed, and every suite is green. AC-4's screen check could not be done logged in. Instead, all 53 written copies were read back from dev and run through the very function the screens call: 53 show the entered address, and 30 of the 31 image addresses load (one coverartarchive mirror is flaky). The logged-in look (T021) stays a nice-to-have.

## Acceptance criteria

| AC | Criterion | Verdict | Evidence |
|---|---|---|---|
| AC-1 | Every writer stores `coverImageUrl`, narrowed on edit | ✅ | `wishlist-item-util.service.impl.spec.ts`: create, edit, and edit after re-picking the album (narrowed). `album-page.store.spec.ts` "puts the album on the wishlist…". `album-reference.spec.ts` G1–G4. These failed before the fix: the create path had no `coverImageUrl` and the re-pick path stored the whole album. Code: `libs/api/src/lib/domain/music/album/album-reference.ts:9`, `wishlist-item-util.service.impl.ts:118,203`, `album-wishlist.feature.ts:156`. |
| AC-2 | All six wishlist surfaces show the entered address | ✅ | B4 `wishlist-item-table.component.spec.ts` cases 1–3; B5/B6 `wishlist-item-simple-view.component.spec.ts` (both layouts, rendered `img[src]`); B7 `wishlist-item-page.store.spec.ts`; B8 `wishlist-page.store.spec.ts`; B9 `collector-profile.model.spec.ts` cases 1–3. All pass. The readers are unchanged and call `toAlbumCoverUrl`. |
| AC-3 | Wishes stored earlier get the address after the dev backfill, dry run first | ✅ | `manual-checks.md`: dry run (15 wishes to fill), the `--confirm` run after the maintainer's go-ahead (53/53 written), and a second dry run that found 0 to fill (SC-002). Code: `tools/sync/backfill-album-cover-url.mjs`. |
| AC-4 | Older pressing and copy snapshots show the entered cover on A2, A6, A7 and A12 after the backfill | ✅ | Readers pinned: `music-view.mapper.spec.ts` "toReleaseView" cases 1–2, `release-table.component.spec.ts`, `collection-item-table.component.spec.ts` and `pressing-row.spec.ts` all pass. Data: the backfill wrote 18 releases and 20 collection items, and the second run found 0 to fill. Read back from dev: 18 releases and 20 collection items run through `toAlbumCoverUrl` all yield the entered address, which replaces a different attached cover on 32 of them. The images load, and the CSP allows their hosts (`manual-checks.md`). The pages were not opened logged in. |
| AC-5 | The shared profile's fingerprint changes when a wish gains an address | ✅ | `collector-profile.model.spec.ts` "changes when a wish gains an entered cover" passes |
| AC-6 | The banner follows `toArtistHeaderUrl`; a blank path falls through | ✅ | `music-view.mapper.spec.ts` case 16b failed first (`Received: "   "`) and passes now; case 16 still holds. Code: `libs/ui/src/lib/music-view/music-view.mapper.ts:100` |
| AC-7 | Field comments state the order; `artist.ts:32` stays | ✅ | grep output in `manual-checks.md`: only `artist.ts:32` matches. Code: `album.ts:30`, `artist.ts:44` |
| AC-8 | The mock seed carries `coverImageUrl`; the seed is not run | ✅ | `manual-checks.md`: a one-line diff, and `node --check` passes |

The AC ids sit in each test's doc comment ("AC-n of #79"), not in the test name.

## Docs

| Requirement | Change | Evidence | Verdict |
|---|---|---|---|
| REQ-WISH-006 (new) | `docs/felhasznaloi/kivansaglista.md` | AC-1, AC-2, AC-3, AC-5 | ✅ |
| REQ-IMG-001 (new area) | `docs/felhasznaloi/katalogus-kepek.md` | AC-4 (unit, dev data through the screens' rule), plus #60's live-album surfaces | ✅ |
| REQ-IMG-002 (new area) | `docs/felhasznaloi/katalogus-kepek.md` | AC-6, plus the existing `image-url.spec.ts` for the artist picture order | ✅ |
| Architecture | `docs/technikai/architektura/kivansaglista.md`: the reference fields, `toAlbumReference`, the backfill | review | ✅ |
| README area row | `docs/README.md` | review | ✅ |

- **Deviation lines:** none names #79, and none was added.
- **Docs on the branch:** ✅ `git diff dev...HEAD -- docs/` lists `README.md`, `felhasznaloi/katalogus-kepek.md`, `felhasznaloi/kivansaglista.md` and `technikai/architektura/kivansaglista.md`.
- **Screens:** no documented screen state changed. The mobile wishlist list already shows a cover per row, and the web has no UX docs. Nothing to capture again.
- **Undocumented behaviour:** none. The backfill and the builder are named in the architecture doc.

## Regressions

| Test | Baseline | Now (2026-11-07) |
|---|---|---|
| `api` | 133/133 | 137/137 |
| `domain-wishlist-item` | 17/17 | 22/22 |
| `domain-release` | 64/64 | 65/65 |
| `domain-collection-item` | 28/28 | 29/29 |
| `ui` | 114/114 | 115/115 |
| `music-collection` | 1701/1701 | 1707/1707 (fresh `--runInBand`, no cache, rerun after the fixes) |
| `npx nx run-many -t test --exclude=firestore-rules,functions --parallel=1` | not recorded | All 38 tasks pass on the rerun. On the first run `music-collection` failed with only 1,425 tests reported: the jest-worker crash seen before on this machine. A fresh serial run passes 1707/1707. |
| `npm run test:rules` | not recorded | 384/384 |
| lint (6 projects) | not recorded | 0 errors; 1 old warning in `libs/api/jest.config.ts` (not changed here) |
| `nx build music-collection --configuration=dev` | not recorded | Builds. 5 SCSS budget warnings, all in files this branch does not touch. |
| `npm run verify:csp` | not recorded | Passes |

No regression.

## Constitution

Checked on `git diff dev...HEAD` (2 commits, 37 files).

| Principle | Result |
|---|---|
| I Approved criteria | ✅ AC list identical to `issue-sync.md` (see the analyze note: a small rewording against the chat wording at the gate) |
| II Root cause | ✅ Writers fixed, old data filled; readers untouched |
| III Test proves the change | ✅ Red-first tests on the writers and the banner; the backfill proven by a recorded dry run, the run and a rerun |
| IV Ticket | ✅ Both subjects end with `(#79)`: `05b27a9b docs(79): …`, `cfefffe4 fix(79): …` |
| V–VII Layers | ✅ Pure builder in `type:api`; no repository injected anywhere new |
| VIII No deploy | ✅ No deploy. The one live write (backfill `--confirm` on dev) ran after the maintainer's explicit go-ahead. |
| IX, X Boundaries | ✅ Lint passes; the builder is not in the agnostic engine |
| XI, XII | ✅ |
| XVII Writes through wrappers | ✅ `stamp` + `touchCatalog` from `catalog-sync.mjs`, batches ≤ 400 |
| XIX Verification on dev | ✅ Dry run first; idempotent; read cost 1,751 per run |
| XIII–XVI, XVIII, XX, XXI | ✅ n/a |

## Code review

`code-review` (medium) on the changes before they were committed. Since then only review #2 and #3 were fixed (an optional field, a requirement's wording), so it was not run again. No blocking finding after assessment.

| # | Finding | Location | Assessment |
|---|---|---|---|
| 1 | The backfill only fills, so a cleared album address leaves stale copies that still win | `tools/sync/backfill-album-cover-url.mjs:147` | By design: the spec puts later sync out of scope, and B4 forbids blanking. A real follow-up candidate, because an admin who clears a bad URL expects the attached cover back everywhere. |
| 2 | Editing a wish keeps its old snapshot address; it does not refresh from the album | `wishlist-item-util.service.impl.ts:203` | AC-1 is met: the field is stored and narrowed. But REQ-WISH-006 says the wish "stores the address when it is created or edited", which reads as a refresh. **Fixed** after this run: REQ-WISH-006 now says an edit keeps the stored address, a re-picked album brings its own, and a later album change does not refresh stored wishes. |
| 3 | `AlbumReference.coverImageUrl` is typed required, but stored wishes for albums without an address lack it | `libs/api/src/lib/domain/music/album/album.ts:82` | Valid. The readers cope, but the type lies about old documents. **Fixed** after this run: `coverImageUrl?: string \| null`; api 137/137, domain-wishlist-item 22/22, dev build passes. |
| 4 | `updateEntity` still stores the artist and user references raw | `wishlist-item-util.service.impl.ts:204` | Older behaviour, outside #79. A follow-up candidate. |
| 5 | Resolving the cover from the bundled album instead of a snapshot would avoid backfills | `album-reference.ts:13` | Rejected at the gate (D1, D2) |
| 6 | Rewritten releases make clients re-download them from the bundle | `backfill-album-cover-url.mjs:196` | Not applicable: `release` is not a bundled feature (`BUNDLE_FEATURE_KEYS`). The delta was 18 releases and 20 collection items. |
| 7 | The trimmed album address is compared with the copy's raw value, so a whitespace-padded copy is rewritten on every run | `backfill-album-cover-url.mjs:147` | Valid edge case. On dev the rerun wrote 0, so no such data exists. A one-word fix: trim the copy's value too. |
| 8 | `toAlbumReference(null)` throws in `updateEntity` | `wishlist-item-util.service.impl.ts:203` | Low. The control is `Validators.required`, and the old `createEntity` threw the same way. |

## Open items

- **T021 (unticked):** the logged-in look at the pages on dev. It is replaced by the data read-back through the screens' rule; opening the pages with an admin login is still an optional extra.
- **Review #2 and #3:** fixed after this run (see above). #1, #4 and #7 are follow-up candidates.
- **AC wording:** the spec and `issue-sync.md` reword four approved AC cells slightly (punctuation, "a te jóváhagyásoddal" → "jóváhagyással"), as the analyze report noted (G1).
- **Changed since the spec:** nothing. The issue was last updated on 2026-11-02 and has no comments.

## PR summary

### Summary

Completes #60's AC-3: the entered picture address now reaches the surfaces that read a stored copy of the album.

- Wishes store the album's entered cover address. All three writers build the reference through one function, `toAlbumReference`, and an edit narrows a re-picked album instead of storing it whole.
- A one-off script, `tools/sync/backfill-album-cover-url.mjs`, copied the address onto 15 wishes, 18 pressing snapshots and 20 collection-copy snapshots on dev. It is a dry run by default, idempotent and fills gaps only.
- The artist banner uses the shared header order. Two field comments now state the precedence, and the mock seed carries the address.
- Docs: a new catalog-pictures area (REQ-IMG-001, REQ-IMG-002), REQ-WISH-006, and the wishlist architecture.

No Cloud Function, rules, index or CSP change; no deploy. The shared collector profile picks up a new cover on its owner's next session.

### Acceptance criteria

| AC | Status | Evidence |
|---|---|---|
| AC-1 | ✅ | writer specs (red first), `album-reference.spec.ts` |
| AC-2 | ✅ | six reader specs |
| AC-3 | ✅ | dev backfill: 15 wishes, rerun 0 |
| AC-4 | ✅ | reader specs; backfill 18 + 20 read back through `toAlbumCoverUrl`: all 38 show the entered cover |
| AC-5 | ✅ | fingerprint spec |
| AC-6 | ✅ | mapper case 16b (red first) |
| AC-7 | ✅ | grep |
| AC-8 | ✅ | seed diff |

Closes #79
