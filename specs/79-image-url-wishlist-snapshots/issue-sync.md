# Issue sync: #79 "A megadott kép-URL a kívánságlistán és a tárolt albumoknál is érvényesüljön (a #60 folytatása)" — dev @ 356bf7a7

**Summary**: 6 ✅ · 5 ⚠️ · 0 ❌ · baseline green. Run 2026-11-06/07. No images in the issue.

The issue body carries T051–T060 word for word from #60's `tasks.md` Phases 8–9. That file no
longer contains them (lines 675–677 point to #79). #85 (album-page store split) and #87 (layering)
are already in `dev`. No other branch or worktree touches these files. #107 (editable wishlist on
mobile) may add a writer later.

## Current-state claims

| # | claim | status | evidence / correction |
|---|---|---|---|
| C1 | `AlbumReference` has no `coverImageUrl` | ✅ | `libs/api/src/lib/domain/music/album/album.ts:76-79`; `Album.coverImageUrl?` at `:31` |
| C2 | The two AC-3 test files hold casts / literals that `tsc` rejects | ✅ | wishlist spec project: `wishlist-item-table.component.spec.ts(76,22)`, `(88,22)` TS2352 (+1 unrelated TS1272). App spec project: `collector-profile.model.spec.ts(280,26)` TS2561, `(289,5)`, `(298,5)` TS2739, among 41 errors in total. Both `tsconfig.spec.json` set `isolatedModules: true`, so ts-jest never type-checks. |
| C3 | `createAlbumReference` at `wishlist-item-util.service.impl.ts:253` | ⚠️ | Now `:255`; the destructure is at `:256` |
| C4 | Hand-built reference at `album-page.store.ts:1297` | ⚠️ | Moved by #85 to `apps/music-collection/src/app/page/album/store/album-wishlist.feature.ts:155-159`. Its shape is pinned exactly by `album-page.store.spec.ts:1233-1237`. |
| C5 | Two production writers | ⚠️ | A third: `wishlist-item-util.service.impl.ts:206` `updateEntity` writes `formGroup.value['albumReference']` raw. That value is the stored reference or, after re-picking, a whole `AlbumEntity`. Also: model→entity passthrough `:89-90`, `wishlist-page.store.ts:297` re-writes the stored reference unchanged, `tools/sync/seed-mock-collectors.mjs:615`. No writer in `apps/functions` (the `albumReference` there is a `DocumentReference`). |
| C6 | B4–B9 call `toAlbumCoverUrl` on a reference | ✅ | B4 `wishlist-item-table.component.ts:69`; B5/B6 `wishlist-item-simple-view.component.ts:46`; B7 `wishlist-item-page.store.ts:55`; B8 `wishlist-page.store.ts:110`; B9 `collector-profile.model.ts:443`. `AlbumImageSource` (all optional) at `libs/common/engine/src/lib/image-url.ts:40`. |
| C7 | The seed writes `coverImage: null` and no address | ✅ | `seed-mock-collectors.mjs:615-619`; the album map already loads `coverImageUrl` (`:216-230`) |
| C8 | `music-view.mapper.ts:100` hand-writes the header order | ✅ | `toArtistHeaderUrl` at `image-url.ts:85-89`; case 16 at `music-view.mapper.spec.ts:67` |
| C9 | Three snapshot-fed Group A surfaces | ⚠️ | Four: A2 `music-view.mapper.ts:74`, A6 `release-table.component.ts:82`, A7 `collection-item-table.component.ts:66`, **A12 `shared/entity-view/pressing-row.ts:37,46`**. Writers `release-util.service.impl.ts:147,242`, `collection-item-util.service.impl.ts:156,259`. New saves copy the whole album, `coverImageUrl` included; only older snapshots lack it. |
| C10 | Stale field comments | ✅ | `album.ts:30`, `artist.ts:44`; `artist.ts:32` stays |
| C11 | The published profile is frozen until a fingerprint change | ✅ | compose `collector-profile.effect.ts:387`, fingerprint `:393`, guard `:395`, save `:399`. `collectorProfileFingerprint` (`collector-profile.model.ts:761`) hashes the whole profile, so a changed `coverUrl` moves it. The fingerprint is in memory only, so each owner session writes once anyway. |

## Tasks

| # | task | status | evidence |
|---|---|---|---|
| T051 | Make the two AC-3 tests fail first | ⬜, premise flawed | They test readers that are already correct, and ts-jest does not type-check. Red-first tests belong on the writers: `wishlist-item-util.service.impl.spec.ts` (no `createEntity`/`updateEntity` test today) and `album-page.store.spec.ts:1233`. The casts are still worth replacing with real fixtures. |
| T052 | Add `coverImageUrl` to `AlbumReference` | ⬜ | `album.ts:76` |
| T053 | Carry it through the writers | ⬜ | `:255`, `album-wishlist.feature.ts:155`, plus `updateEntity :206` (decision D3) |
| T054 | Stored wishes | ⬜ | Decision D1: backfill. Template: `tools/sync/backfill-collection-item-cover-color.mjs` (dry run unless `--confirm`, `collectionGroup`, `stamp` + `touchCatalog` from `catalog-sync.mjs`) |
| T055 | Seed | ⬜ | `seed-mock-collectors.mjs:615` |
| T056 | Header via `toArtistHeaderUrl` | ⬜ | `music-view.mapper.ts:100` |
| T057 | Prove the convergence | ⬜ | verification only |
| T058 | Snapshot-fed Group A surfaces | ⬜ | Decision D2: backfill. Four surfaces, not three. The cover-color backfill already walks both groups (`:52`, `:73`). |
| T059 | Field comments | ⬜ | `album.ts:30`, `artist.ts:44` |
| T060 | Profile fingerprint test | ⬜ | no test yet; describe block at `collector-profile.model.spec.ts:566` |

## Docs

| requirement / screen / architecture | change | file |
|---|---|---|
| REQ-WISH-006 (new) | The wish's cover is the album's entered address, else the attached cover. Felület: mindkettő. | `docs/felhasznaloi/kivansaglista.md` |
| Kívánságlista architektúra | `AlbumReference` gains `coverImageUrl`; the adding section lists it among the needed album fields | `docs/technikai/architektura/kivansaglista.md:10`, `:49` |
| New area: catalog pictures (IMG) | REQ-IMG-001 album cover order (entered address → attached cover), including stored album copies; REQ-IMG-002 artist picture and banner order | `docs/felhasznaloi/katalogus-kepek.md` (new), `docs/README.md` area table |
| Screens | The mobile wishlist list shows a cover per row (`docs/ux/mobil/kivansaglista.md:13`); no new state | — |

No deviation line names #79. No open question is settled. No ADR needed.

## Testing plan

- Unit (jest): the spec files listed under Tasks and C6/C9. No tests exist for `tools/sync` scripts.
- Manual on dev: the two backfills (dry run, then the approved run) and the surfaces after them.
- The constitution does not require a unit test per function (III, XI).

## Constitution

- III: red-first tests on the writers (see T051).
- VI: the read-through routes were rejected partly because lib components would need album sources.
- VIII, XIX: both backfills run on dev only, after a dry run and the maintainer's go-ahead.
- XVII: the backfills write only through `catalog-sync.mjs`.

## Baseline tests

| command | result | failing |
|---|---|---|
| `npx nx test api --runInBand` | 133/133 | none |
| `npx nx test domain-wishlist-item --runInBand` | 17/17 | none (Nx flagged it flaky once: a parallel run's jest worker crashed) |
| `npx nx test domain-release --runInBand` | 64/64 | none |
| `npx nx test domain-collection-item --runInBand` | 28/28 | none |
| `npx nx test ui --runInBand` | 114/114 | none |
| `npx nx test music-collection --runInBand` | 1701/1701 | none |

## Decisions at the gate (2026-11-07)

- D1: stored wishes get the address by a backfill.
- D2: older pressing and copy snapshots get it by a backfill.
- D3: `updateEntity` narrows through `createAlbumReference`.
- D4: a new docs area for catalog pictures, REQ-IMG-001 and REQ-IMG-002.
- The AC list below is approved.

## Approved acceptance criteria

| AC | Given / When / Then | REQ | source | tasks | verification |
|---|---|---|---|---|---|
| AC-1 | Adott egy album megadott kép-URL-lel. Amikor kívánságlistára kerül (album lap, admin létrehozás vagy szerkesztés), a tárolt `albumReference` tartalmazza a `coverImageUrl`-t; szerkesztéskor szűkítve, nem teljes albumként. | REQ-WISH-006 | T052, T053, D3 | T051–T053 | unit |
| AC-2 | Ha egy tétel referenciájában van megadott URL, mind a hat kívánságlista-felület (B4–B9) azt mutatja a csatolt borító helyett. | REQ-WISH-006 | Phase 8 | T051, T053 | unit |
| AC-3 | A korábban tárolt tételek a dev backfill után megkapják az album megadott URL-jét. Előbb dry-run fut, a `--confirm` csak jóváhagyással. | REQ-WISH-006 | T054, D1 | T054 | manual (dev) |
| AC-4 | Ha egy albumnak van megadott URL-je, a régi release- és példány-snapshotok a dev backfill után azt mutatják a release nézetben, a release-táblában, a példány-táblában és a nyomás-sorban (A2, A6, A7, A12). | REQ-IMG-001 | T058, D2 | T058 | unit + manual (dev) |
| AC-5 | A megosztott profil ujjlenyomata megváltozik, ha egy tétel megadott URL-t kap. | REQ-WISH-006 | T060 | T060 | unit |
| AC-6 | Az előadó fejléce a `toArtistHeaderUrl` sorrendjét követi: a csatolt fejléc nyer, a csak szóközből álló útvonal továbbesik. | REQ-IMG-002 | T056 | T056 | unit |
| AC-7 | Az `album.ts:30` és az `artist.ts:44` mezőkommentje az új sorrendet írja le; az `artist.ts:32` marad. | REQ-IMG-001, REQ-IMG-002 | T059 | T059 | manual (grep) |
| AC-8 | A mock-seed beírja a tételekhez a katalógus-album `coverImageUrl`-jét; a seedet nem futtatjuk. | REQ-WISH-006 | T055 | T055 | manual (`node --check`, review) |

T057 is the verification step and maps to every AC.

## Open decisions

None.
