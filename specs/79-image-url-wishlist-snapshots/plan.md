# Implementation Plan: The entered picture address reaches wishes and stored album copies

**Branch**: `79-image-url-wishlist-snapshots` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/79-image-url-wishlist-snapshots/spec.md`

**Issue**: [#79](https://github.com/zs-soft-2/music-collection/issues/79) · **Pre-work**: [issue-sync.md](./issue-sync.md)

## Summary

The readers already follow #60's order; the data they read lacks the address. This plan fixes the
writers, brings old data up to date, and tidies the leftovers.

1. **Docs first.** A new catalog-pictures area (REQ-IMG-001, REQ-IMG-002), REQ-WISH-006, and the
   wishlist architecture's `AlbumReference` shape (R-8).
2. **The reference carries the address.** `AlbumReference` gains `coverImageUrl`. One pure builder,
   `toAlbumReference`, next to the type in `libs/api`, is used by all three writers: create,
   update (now narrowed) and the album page's "add to wishlist" (R-2, R-3).
3. **Old data catches up.** One dry-run-by-default script, `tools/sync/backfill-album-cover-url.mjs`,
   copies each album's entered address onto stored wishes, pressing snapshots and collection-item
   snapshots. It reads albums from the published bundle and writes through `catalog-sync.mjs` (R-4).
   It runs on dev only after the maintainer's go-ahead.
4. **Leftovers.** The artist banner uses `toArtistHeaderUrl` (R-6), two field comments state the
   order, the mock seed carries the address (R-9), and a test pins that the shared profile's
   fingerprint follows the cover (R-7).

No Cloud Function, rules, index or CSP change. No deploy.

## Technical Context

**Language/Version**: TypeScript 5.x, Angular 22 (standalone, zoneless, signals); Node 24 ES modules for `tools/sync`

**Primary Dependencies**: Nx monorepo, NgRx signalStore, `firebase-admin` (scripts only)

**Storage**: Firestore. One new optional field on the wish's `albumReference`; existing fields filled on `release.album` and `collection-item.release.album` by the backfill (data-model.md)

**Testing**: Jest per Nx project (`unit`); `manual` for the backfill on dev, as `.specify/project/verify.md` defines. `tools/sync` has no test runner.

**Target Platform**: Browser app; Node script against the dev Firebase project

**Project Type**: Nx monorepo, Angular web app with shared libraries, plus admin scripts

**Performance Goals**: The backfill reads albums from the bundle (≈1 read + delta) instead of ~2,000 documents (R-4)

**Constraints**: Constitution VIII/XIX: no write to a live project without the go-ahead; XVII: script writes only through `catalog-sync.mjs`; IX: `libs/common/engine` is `platform:agnostic` and cannot import `libs/api`

**Scale/Scope**: 1 type field, 1 builder, 3 writers, 1 mapper line, 2 comments, 1 seed line, 1 new script, ~8 spec files, 4 docs files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | How this plan meets it |
|---|---|---|
| I Approved criteria | ✅ | AC-1…AC-8 approved at the sync gate on 2026-11-07; no open decision |
| II Root cause | ✅ | Fixes the writers that drop the address and the data they left, not the readers |
| III Test proves the change | ✅ | Red-first tests on the writers (R-1). Reader tests pin behaviour. The backfill is proven by a recorded dry run and dev check (AC-3, AC-4). |
| IV Ticket | ✅ | Branch `79-…`; every commit carries `(#79)` |
| V, VI, VII Layers | ✅ | The builder is a pure function in `type:api`. The app store already builds the reference in its feature; it now calls the builder. No repository injected anywhere new. |
| VIII No deploy | ⚠️ gate | No deploy. The backfill's `--confirm` run on dev waits for the maintainer's go-ahead. |
| IX, X Library boundaries | ✅ | `toAlbumReference` in `libs/api` (`type:api`), used by `type:domain` and the app. Not in `libs/common/engine` (agnostic → angular is forbidden). |
| XI Test levels | ✅ | Each AC names `unit` and/or `manual` |
| XII Checks before review | ✅ | test, lint, `test:rules`, `verify:csp` on the touched projects |
| XVII Firestore writes through wrappers | ✅ | Script uses `stamp` + `touchCatalog` from `catalog-sync.mjs`, batches ≤ 400 |
| XIX Verification on dev, carefully | ✅ | Dry run first; the run is idempotent and fills gaps only |
| XIII, XIV, XV, XVI, XVIII, XX, XXI | ✅ n/a | No functions, rules, CSP, private-data sums, App Check, model calls or deletion |

**Post-design re-check**: unchanged, no violations.

## Project Structure

### Documentation (this feature)

```text
specs/79-image-url-wishlist-snapshots/
├── spec.md
├── issue-sync.md
├── plan.md                         # This file
├── research.md                     # R-1 … R-9
├── data-model.md                   # The reference field and the three backfill targets
├── quickstart.md                   # How to validate
├── contracts/
│   ├── album-reference.md          # toAlbumReference
│   └── backfill-album-cover-url.md # The script's CLI and guarantees
└── tasks.md                        # Created by /speckit-tasks
```

### Source Code (repository root)

```text
docs/felhasznaloi/katalogus-kepek.md                      # NEW: REQ-IMG-001, REQ-IMG-002
docs/felhasznaloi/kivansaglista.md                        # REQ-WISH-006
docs/technikai/architektura/kivansaglista.md              # AlbumReference shape, writers, backfill
docs/README.md                                            # area row
libs/api/src/lib/domain/music/album/
├── album.ts                                              # AlbumReference.coverImageUrl, comment at :30
├── album-reference.ts                                    # NEW: toAlbumReference
└── album-reference.spec.ts                               # NEW
libs/api/src/lib/domain/music/artist/artist.ts            # comment at :44
libs/domain/music/wishlist-item/src/lib/util/service/
├── wishlist-item-util.service.impl.ts                    # create + update through the builder
└── wishlist-item-util.service.impl.spec.ts               # AC-1 (red first)
libs/domain/music/wishlist-item/src/lib/**/…spec.ts       # AC-2 fixtures (table, simple view)
apps/music-collection/src/app/page/album/store/album-wishlist.feature.ts   # through the builder
apps/music-collection/src/app/page/album/album-page.store.spec.ts          # AC-1 (red first)
apps/music-collection/src/app/page/wishlist/…             # AC-2 (wishlist page / item page stores)
apps/music-collection/src/app/data/collector-profile/collector-profile.model.spec.ts  # AC-2, AC-5
libs/ui/src/lib/music-view/music-view.mapper.ts (+ .spec) # AC-4 reader, AC-6
apps/music-collection/src/app/shared/entity-view/pressing-row.spec.ts      # AC-4 reader
libs/domain/music/{release,collection-item}/…table.component.spec.ts       # AC-4 readers
tools/sync/backfill-album-cover-url.mjs                   # NEW: AC-3, AC-4
tools/sync/seed-mock-collectors.mjs                       # AC-8
```

**Structure Decision**: the builder lives with the type in `libs/api`, the only layer every writer
may import (R-2). One script handles all three stored copies, because they share the one expensive
input, the album addresses (R-4).

## Complexity Tracking

No constitution violations to justify.
