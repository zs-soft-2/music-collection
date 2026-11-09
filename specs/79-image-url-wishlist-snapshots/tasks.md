---

description: "Task list for #79: the entered picture address reaches wishes and stored album copies"
---

# Tasks: The entered picture address reaches wishes and stored album copies

**Input**: Design documents from `/specs/79-image-url-wishlist-snapshots/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md), [issue-sync.md](./issue-sync.md)

**Tests**: Included. Every AC names a test level, and constitution III requires a test that fails before a fix. The red-first tests are on the writers (research R-1). Reader tests document behaviour that is already correct.

**Organization**: Grouped by user story. Docs come first (docs-first profile).

## Format: `[ID] [P?] [Story] [Model] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US4 from spec.md
- **[Model]**: `[opus]` or `[sonnet]`, the model that implements the task in `/speckit-implement`. `[sonnet]` tasks go to a subagent and are self-contained.
- Paths are relative to the repository root. Line numbers are from `356bf7a7`.
- Run jest projects one at a time with `--runInBand`: parallel runs have crashed jest workers on this machine.

---

## Phase 1: Setup

The baseline is already recorded in [issue-sync.md](./issue-sync.md) (api 133, domain-wishlist-item 17, domain-release 64, domain-collection-item 28, ui 114, music-collection 1701, all green). No setup task.

---

## Phase 2: Foundational (docs first, then the shared type and builder)

**Purpose**: The docs state the behaviour before any code (docs-first). `AlbumReference` and `toAlbumReference` are needed by US1 and US2.

- [X] T001 [P] [sonnet] [REQ-IMG-001, REQ-IMG-002] [FR-010] Create `docs/felhasznaloi/katalogus-kepek.md` in Hungarian, following the structure of `docs/felhasznaloi/kivansaglista.md` and the rules in `.specify/project/docs.md`:
  - a title `# Katalógus-képek`;
  - `**Azonosító-előtag:** IMG`;
  - a `## Felhasználói leírás` paragraph saying that an admin can attach a picture or enter a picture address for an album and an artist, and that the entered address takes precedence everywhere;
  - `## Követelmények` with exactly two requirements, per `specs/79-image-url-wishlist-snapshots/research.md` §R-8:
    - `### REQ-IMG-001: Album borítójának sorrendje`: the cover is the entered address, else the attached cover. It holds on every surface, including those that show a stored copy of the album (pressing, collection copy, wish). Lines `**Felület:** mindkettő` and `**Ticket:** #79`.
    - `### REQ-IMG-002: Előadó képének és fejlécének sorrendje`: the artist's picture is the entered address, else the attached main image, else the imported photo. The banner is the attached banner, else the artist's picture, and a blank banner path counts as absent. Lines `**Felület:** mindkettő` and `**Ticket:** #79`.
  - `## Nem része`: keeping stored copies in step when an album's address changes later.

  Then add one row to the area table in `docs/README.md`: `| Katalógus-képek (IMG) | [katalogus-kepek](felhasznaloi/katalogus-kepek.md) | — | — |`. Done when both files are saved and `grep -c '^### REQ-IMG-' docs/felhasznaloi/katalogus-kepek.md` prints 2.
- [X] T002 [P] [sonnet] [REQ-WISH-006] [FR-010] In `docs/felhasznaloi/kivansaglista.md`, after `### REQ-WISH-005` and before `## Nem része`, add `### REQ-WISH-006: A tétel borítója` in Hungarian: every place that shows a wish (list, the wish's page, the admin list and table, the shared profile) shows the album's entered picture address, else the attached cover. A wish stores the address when it is created or edited; wishes stored earlier get it from a one-off update. Lines: `**Felület:** mindkettő`, `**Ticket:** #79`, `**Technikai:** [Kívánságlista architektúra](../technikai/architektura/kivansaglista.md)`. Follow the format of REQ-WISH-001…005 in the same file. Done when `grep -n 'REQ-WISH-006' docs/felhasznaloi/kivansaglista.md` shows the heading.
- [X] T003 [P] [sonnet] [REQ-WISH-006] [FR-010] In `docs/technikai/architektura/kivansaglista.md`, per `specs/79-image-url-wishlist-snapshots/research.md` §R-8 and `data-model.md` "Album reference on a wish":
  - line 10 becomes: the `AlbumReference` holds `{ uid, name, coverImage, coverImageUrl }`, and every writer builds it with `toAlbumReference` (`libs/api/src/lib/domain/music/album/album-reference.ts`);
  - in the paragraph at line 49 ("A felvétel kiemelése"), add `coverImageUrl` to the album fields the adding needs;
  - add one bullet under "Ami ma megvan": wishes stored before #79 got the address from `tools/sync/backfill-album-cover-url.mjs`.

  Write in Hungarian and keep the file's style. Done when `grep -n 'coverImageUrl' docs/technikai/architektura/kivansaglista.md` shows at least two lines.
- [X] T004 [opus] [AC-1] [FR-001] Write `libs/api/src/lib/domain/music/album/album-reference.spec.ts` for guarantees G1–G4 of `contracts/album-reference.md`:
  - a whole `AlbumEntity` in returns exactly the keys `uid`, `name`, `coverImage`, `coverImageUrl` (`Object.keys(...).sort()`);
  - a missing `coverImageUrl` gives `null`, and a missing `coverImage` gives `null`;
  - `coverImageUrl: '  x  '` comes back unchanged.

  Expected failure: the module does not exist.
- [X] T005 [opus] [AC-1] [FR-001] Implement the field and the builder (depends on T004):
  - In `libs/api/src/lib/domain/music/album/album.ts:76`, add `coverImageUrl: string | null;` to `AlbumReference`, with a one-line comment: the entered address at the time of writing, which the wishlist surfaces read because they never load the album.
  - Create `album-reference.ts` exporting `toAlbumReference(album: Pick<Album, 'coverImage' | 'coverImageUrl' | 'name'> & Identifiable): AlbumReference`. It returns `{ uid, name, coverImage: coverImage ?? null, coverImageUrl: coverImageUrl ?? null }` and nothing else. Import the types with `import type`, because the webpack build needs it.
  - Add `export * from './album-reference';` to `libs/api/src/lib/domain/music/album/index.ts`. Keep `export type * from './album'` as it is.

  Done when `npx nx test api --runInBand` passes, including T004, and `npx nx lint api` passes.

**Checkpoint**: docs state the behaviour, and the builder exists.

---

## Phase 3: User Story 1 - A wish shows the cover the curator chose (P1) 🎯 MVP

**Goal**: Every writer stores the address. Every wishlist surface shows it. The shared profile follows.

**Independent Test**: unit tests of the writers and the six readers.

### Tests for User Story 1 (write first; T006 and T007 must fail before T011/T012)

- [X] T006 [P] [US1] [opus] [AC-1] [FR-001, FR-002] In `libs/domain/music/wishlist-item/src/lib/util/service/wishlist-item-util.service.impl.spec.ts`, add tests that build a `FormGroup` with `albumReference`, `artistReference`, `userReference`, `medias`, `isActive`, `sourceLink` and `uid` controls:
  - (a) `createEntity` with an album that has `coverImageUrl: 'https://a/url.jpg'` returns an `albumReference` that equals `{ uid, name, coverImage, coverImageUrl: 'https://a/url.jpg' }`.
  - (b) `updateEntity` with a stored reference that carries an address keeps it.
  - (c) `updateEntity` with a whole `AlbumEntity` in the control (an admin re-picked the album) returns exactly the four reference keys: assert with `toEqual`, and assert that `format` is absent.

  Expected failure: (a) has no `coverImageUrl`; (c) returns the whole album.
- [X] T007 [P] [US1] [opus] [AC-1] [FR-001] In `apps/music-collection/src/app/page/album/album-page.store.spec.ts`, the test "puts the album on the wishlist and closes once it is wanted" (around line 1219) asserts the exact `albumReference` at :1233-1237.
  - Give the album fixture used by `setUp()` a `coverImageUrl: 'https://a/url.jpg'`, either in that test or through the fixture's override mechanism (check how `setUp` builds the album first).
  - Expect `albumReference: { coverImage: null, coverImageUrl: 'https://a/url.jpg', name: 'Bonded by Blood', uid: 'al1' }`.

  Expected failure: the stored reference lacks `coverImageUrl`.
- [X] T008 [P] [US1] [opus] [AC-2] [FR-003] Replace the `as` fixtures with real typed ones, so the compiler checks them (issue-sync C2, research R-1):
  - In `libs/domain/music/wishlist-item/src/lib/collection/component/table/wishlist-item-table.component.spec.ts`, cases 3, 1 and 2 (around :71-100) build the item with a local `wishItem(albumReference: AlbumReference): WishlistItemEntity` helper that fills every required field of `WishlistItemEntity`, with no `as`. The attachment is a real `AlbumDocument`, with `entityType`, `uid`, `name` and `filePath`.
  - In `apps/music-collection/src/app/data/collector-profile/collector-profile.model.spec.ts` (around :265-300), `wishlistCover` takes `Partial<AlbumReference>` merged into a full `AlbumReference`, and the attachments are real `AlbumDocument`s.

  The assertions stay as they are. Done when both tests pass and `npx tsc -p libs/domain/music/wishlist-item/tsconfig.spec.json --noEmit` and `npx tsc -p apps/music-collection/tsconfig.spec.json --noEmit` report no diagnostic in these two files (other files have pre-existing errors; judge only these). Needs T005.
- [X] T009 [P] [US1] [opus] [AC-2] [FR-003] Add reader tests for the three wishlist readers that have none. Each uses a real `AlbumReference` that has both `coverImageUrl: 'https://a/url.jpg'` and an attached `coverImage`, and expects the address:
  - (a) `libs/domain/music/wishlist-item/src/lib/view/component/simple/wishlist-item-simple-view.component.spec.ts`: the component's `coverUrl` (`wishlist-item-simple-view.component.ts:46`).
  - (b) a new `apps/music-collection/src/app/page/wishlist/wishlist-page.store.spec.ts` that tests only the exported `toWishlistEntryView` (`wishlist-page.store.ts:90`): `release.coverUrl`.
  - (c) a new `apps/music-collection/src/app/page/wishlist-item/wishlist-item-page.store.spec.ts` for `WishlistItemPageStore.coverUrl` (`wishlist-item-page.store.ts:55`). Provide `TextService` and whatever else the store injects with fakes. Check the store's injections first, and do not hit real services.

  These pass once T005 exists. They pin behaviour and are not red-first.
- [X] T010 [P] [US1] [opus] [AC-5] [FR-006] In `apps/music-collection/src/app/data/collector-profile/collector-profile.model.spec.ts`, inside `describe('collectorProfileFingerprint'` (around :566), add: "changes when a wish gains an entered cover". Compare `fingerprint({ wishes: [wish with an attachment only] })` against the same wish with `coverImageUrl` added, with the wishlist shared as the neighbouring test "changes when the wishlist joins the page" does. Expect them to differ. It pins research R-7, and is not red-first.

### Implementation for User Story 1

- [X] T011 [US1] [opus] [AC-1] [FR-001, FR-002] In `libs/domain/music/wishlist-item/src/lib/util/service/wishlist-item-util.service.impl.ts`:
  - `createEntity` (:119) and `updateEntity` (:206) build `albumReference` with `toAlbumReference(formGroup.value['albumReference'])` from `@music-collection/api`;
  - remove the private `createAlbumReference` (:255).

  Depends on T005 and T006. Done when T006 passes and `npx nx test domain-wishlist-item --runInBand` is green.
- [X] T012 [US1] [opus] [AC-1] [FR-001] In `apps/music-collection/src/app/page/album/store/album-wishlist.feature.ts:155-159`, replace the hand-built `albumReference` literal with `toAlbumReference(album)` from `@music-collection/api`. Depends on T005 and T007. Done when T007 passes and `npx nx test music-collection --runInBand --testFile=apps/music-collection/src/app/page/album/album-page.store.spec.ts` is green.

**Checkpoint**: AC-1, AC-2 and AC-5 pass at unit level.

---

## Phase 4: User Story 2 - Wishes stored earlier catch up (P2)

**Goal**: One backfill script fills the address onto stored wishes (and, for US3, pressing and copy snapshots). The seed carries it.

**Independent Test**: dry run on dev lists what it would change; after the approved run a second dry run reports 0.

- [X] T013 [US2] [opus] [AC-3, AC-4] [FR-004, FR-005] Create `tools/sync/backfill-album-cover-url.mjs` per `contracts/backfill-album-cover-url.md` (B1–B6), `data-model.md` "Backfill rule" and research R-4.
  - Copy the option parsing, `sync/catalog` read and `feature()` wrapper of `tools/sync/backfill-album-has-tracks.mjs`: `--env`, `--read-all`, `--catch-up`, `--confirm`, and `readFeatureDocuments` from `bundle-reader.mjs`.
  - Copy the batch loop of `tools/sync/backfill-collection-item-cover-color.mjs`: `BATCH_SIZE = 400`, `stamp`, then `touchCatalog`.
  - Build `uid → trimmed address` from the album documents. The uid is the last path segment; skip blank addresses.
  - Read `collectionGroup('wishlist-item')`, `collectionGroup('release')` and `collectionGroup('collection-item')`. For each document whose album (`albumReference.uid`, `album.uid` or `release.album.uid`) has an address that differs from the copy's (`albumReference.coverImageUrl`, `album.coverImageUrl` or `release.album.coverImageUrl`), queue `batch.update(ref, stamp({ '<that path>': address }))`.
  - Count per target, and list the documents whose album uid is not among the albums.
  - Without `--confirm`, print the counts and `DRY RUN, add --confirm to write`, and exit.
  - With `--confirm`, write, then `touchCatalog(db, <only the written feature keys>)`.
  - Start the file with a doc comment like the cover-color script's: what, why, usage, and the read cost.

  Done when `node --check tools/sync/backfill-album-cover-url.mjs` passes. **Do not run it.**
- [X] T014 [P] [US2] [sonnet] [AC-8] [FR-009] In `tools/sync/seed-mock-collectors.mjs`, in the `albumReference` object at lines 615-619 (`{ uid: wish.uid, name: wish.name, coverImage: null }`), add `coverImageUrl: wish.coverUrl,` after `coverImage: null,`. `wish` comes from the `albums` map, whose entries carry `coverUrl` (set at line 229 from the album's `coverImageUrl`), per `specs/79-image-url-wishlist-snapshots/research.md` §R-9. Change nothing else. **Do not run the seed**: it writes to Firestore. Done when `node --check tools/sync/seed-mock-collectors.mjs` passes and `git diff tools/sync/seed-mock-collectors.mjs` shows one added line.
- [X] T015 [US2] [opus] [AC-3, AC-4] [SC-002] Dry run on dev, read-only: `node tools/sync/backfill-album-cover-url.mjs --env dev`. Record the counts per target and the missing albums in `specs/79-image-url-wishlist-snapshots/manual-checks.md`.
  - If the album bundle is unusable, stop and report the script's message. Do not pass `--read-all` without the maintainer.
  - Then ask the maintainer for the go-ahead for `--confirm` (constitution VIII, XIX).

  Depends on T013.
- [X] T016 [US2] [opus] [AC-3, AC-4] [SC-002] Only after the maintainer's explicit go-ahead: run the same command with `--confirm` on dev, then the dry run once more. Record both outputs in `manual-checks.md`. The second run must report 0 to fill in for every target. Depends on T015.

**Checkpoint**: stored data carries the address on dev.

---

## Phase 5: User Story 3 - Pressings and copies show the current cover order (P3)

**Goal**: The four snapshot readers are pinned by tests. The data comes from T016.

- [X] T017 [P] [US3] [opus] [AC-4] [FR-005] Pin the snapshot readers (research R-5). Each test uses a release whose `album` has both `coverImageUrl` and an attached `coverImage`, and expects the address:
  - (a) `libs/domain/music/release/src/lib/collection/component/table/release-table.component.spec.ts`: `imageOf(release)` (`release-table.component.ts:82`).
  - (b) `libs/domain/music/collection-item/src/lib/collection/component/table/collection-item-table.component.spec.ts`: `imageOf(item)` (`collection-item-table.component.ts:66`).
  - (c) check that `apps/music-collection/src/app/shared/entity-view/pressing-row.spec.ts` (around :16-33) and `libs/ui/src/lib/music-view/music-view.mapper.spec.ts` (around :130-157) already cover the release snapshot with both fields. Add the "both fields" case where one is missing.

  Not red-first: the readers are already correct. Done when the four specs pass.

**Checkpoint**: AC-4's unit part is green; its dev part is T016 plus T021.

---

## Phase 6: User Story 4 - The artist banner and the field definitions agree (P3)

- [X] T018 [US4] [opus] [AC-6] [FR-007] In `libs/ui/src/lib/music-view/music-view.mapper.spec.ts`, near case 16 (:67), add a case: an artist whose `headerImage.filePath` is `'   '` and whose `imageUrl` is `'https://a/photo.jpg'` gets `headerUrl` `'https://a/photo.jpg'`.
  - Expected failure: today the blank path is returned.
  - Then change `libs/ui/src/lib/music-view/music-view.mapper.ts:100` to `headerUrl: toArtistHeaderUrl(artist),`, importing it from `@music-collection/common/engine` the way `toArtistImageUrl` is imported in that file. Keep the `imageUrl` local, which line 98 still uses.

  Done when case 16, the new case and `npx nx test ui --runInBand` pass.
- [X] T019 [P] [US4] [sonnet] [AC-7] [FR-008] Replace two field comments, per `specs/79-image-url-wishlist-snapshots/research.md` and issue #79 T059:
  - in `libs/api/src/lib/domain/music/album/album.ts:30`, replace `/** Cover found online, used when no cover image is attached. */` with `/** Cover address entered by an admin; it takes precedence over the attached cover image. */`;
  - in `libs/api/src/lib/domain/music/artist/artist.ts:44`, replace `/** Photo on the web (Wikimedia Commons), for artists without an uploaded image. */` with `/** Photo address entered by an admin; it takes precedence over the attached main image, and the imported Discogs photo comes last. */`.

  Leave `artist.ts:32` unchanged, and edit no other line. Done when `grep -rni -e 'used when no' -e 'without an uploaded image' libs/api/src/lib/domain/music/` prints only `artist.ts:32`, and `npx nx lint api` passes.

---

## Phase 7: Polish & cross-cutting

- [X] T020 [sonnet] Run each check below from the repository root, one at a time, and report each result. Compare against the baseline in `specs/79-image-url-wishlist-snapshots/issue-sync.md` ("Baseline tests"). Fix nothing; report failures with their test names.
  - `npx nx test <p> --runInBand` for `api`, `domain-wishlist-item`, `domain-release`, `domain-collection-item`, `ui` and `music-collection`
  - `npm run test:rules`
  - `npx nx run-many -t lint -p api,domain-wishlist-item,domain-release,domain-collection-item,ui,music-collection`
  - `npm run verify:csp` (run `npx nx build music-collection --configuration=dev` first if it complains about an old build)
  - `node --check tools/sync/backfill-album-cover-url.mjs`
  - `node --check tools/sync/seed-mock-collectors.mjs`
  - `npx nx build music-collection --configuration=dev`, to catch type-only import problems that jest does not see
- [ ] T021 [opus] [AC-3, AC-4, AC-7, AC-8] Record in `specs/79-image-url-wishlist-snapshots/manual-checks.md` the AC-7 grep output and the AC-8 diff.
  - After T016, run the logged-in UI checks of `quickstart.md` "Backfill on dev" step 4 on the dev data: an old wish, a pressing and a copy of an album with an entered address. They need an admin login. If none is available, leave them open and tell the maintainer.
  - Never press Save.

---

## Dependencies & Execution Order

- **Phase 2**: T001–T003 (docs) come first and run in parallel. T004 → T005.
- **US1**: needs T005.
  - T006, T007, T008, T009 and T010 run in parallel.
  - T006 → T011; T007 → T012.
- **US2**: T013 needs no TS code; it can start after Phase 2 docs.
  - T014 runs in parallel with T013.
  - T013 → T015 → (maintainer go-ahead) → T016.
- **US3**: T017 is independent. Its dev proof needs T016 and T021.
- **US4**: T018 and T019 are independent of the others.
- **Polish**: T020 after all code tasks; T021 after T016.

### Parallel Opportunities

- T001, T002, T003.
- T006, T007, T008, T009, T010.
- T013 with T014, T017, T018, T019.

## Parallel Example: User Story 1

```bash
Task: "T006 writer tests in wishlist-item-util.service.impl.spec.ts"
Task: "T007 addToWishlist expectation in album-page.store.spec.ts"
Task: "T008 real fixtures in the table and collector-profile specs"
Task: "T009 reader tests: simple view, toWishlistEntryView, WishlistItemPageStore"
Task: "T010 fingerprint test"
```

## Implementation Strategy

### MVP

Phase 2 and US1: new wishes carry the address, and every wishlist surface shows it.

### Incremental delivery

1. Docs and builder (Phase 2).
2. US1: writers and readers.
3. US2: script and seed, then the dry run. Stop for the go-ahead before `--confirm`.
4. US3 and US4: tests and the banner.
5. Polish and manual records.

## Notes

- Every commit carries `(#79)` (constitution IV).
- Nothing deploys. The only live write is T016, and it needs the maintainer's go-ahead.
- T057 of the issue (prove the convergence) is T020 here; T051 is split into T006–T008 (research R-1).
