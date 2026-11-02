---

description: "Task list for feature 60-artist-album-image-urls"
---

# Tasks: Entered image URLs take precedence

**Input**: Design documents from `/specs/60-artist-album-image-urls/`

**Issue**: [#60](https://github.com/zs-soft-2/music-collection/issues/60) · **Branch**: `60-artist-album-image-urls`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/image-url-rule.md](./contracts/image-url-rule.md),
[quickstart.md](./quickstart.md)

**Tests**: Required. Constitution III ("a test proves the change") and constitution XI (every AC
names its test level) make the test tasks mandatory, not optional. Every AC-1…AC-6 has a named test
file in [spec.md](./spec.md) → Acceptance Criteria.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested and
delivered on its own.

## Format: `[ID] [P?] [Story] [Model] Description`

- **[P]**: Can run in parallel (different files, no dependencies on an incomplete task)
- **[Story]**: Which user story the task belongs to (US1…US4); Setup, Foundational and Polish carry
  no story label
- **[Model]**: `[opus]` or `[sonnet]`, the model that implements the task in `/speckit-implement`.
  `[sonnet]` tasks are delegated to a subagent with no conversation context, so each one states its
  exact file paths, the contract section it implements and the command that proves it is done.
- Include exact file paths in descriptions

## Path Conventions

Nx monorepo. Paths are repository-root-relative:

- `libs/common/engine/` — `type:engine`, `platform:agnostic` (the shared rule lives here)
- `libs/ui/`, `libs/domain/music/*/`, `libs/core/i18n/` — shared libraries
- `apps/music-collection/src/app/` — the Angular app
- `apps/functions/src/` — a self-contained npm project that **never** imports from `libs/`
  (constitution XIII)

Line numbers below are as of `46ce1de4` and were re-verified against the working tree while this
file was generated.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: confirm the starting point, so a later red suite is attributable to this change

- [X] T001 [sonnet] Install dependencies and record the green baseline: run `npm ci`, then
      `npx nx run-many -t test -p domain-artist domain-album --skip-nx-cache`. Done when both
      projects pass; compare the wall time against the ~18.8 s baseline recorded in
      [issue-sync.md](./issue-sync.md) and report the actual numbers. Do not change any file.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the one shared rule module every browser-side site delegates to
([research.md](./research.md) D1). US1 and US2 cannot start before it exists.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. (US3 depends on the
mirrored *server* rule instead, which is created inside Phase 5 — see
[research.md](./research.md) D2.)

- [X] T002 [opus] Write the failing unit test for the browser rule in **new** file
      `libs/common/engine/src/lib/image-url.spec.ts`. Assert every row of
      [contracts/image-url-rule.md](./contracts/image-url-rule.md) §3 that is browser-side: album
      cover cases 1–8, artist picture cases 10–15, artist header cases 16–19 (case 9 is server-only
      — the browser types forbid it). Also assert guarantees G2 (never throws for `null`,
      `undefined`, or an object with missing members), G3 (`''` falls through and is never
      returned), G4 (the result is a non-empty `string` or `null`, never `''` or `undefined`) and
      G5 (a whitespace-only value falls through). Verify it fails for the right reason — the module
      does not exist yet — with
      `npx nx test common-engine --testFile=libs/common/engine/src/lib/image-url.spec.ts`.
- [X] T003 [opus] Create the rule in **new** file `libs/common/engine/src/lib/image-url.ts` and
      export it from `libs/common/engine/src/index.ts` (append
      `export * from './lib/image-url';` to the existing four exports). Implement exactly the
      signatures in [contracts/image-url-rule.md](./contracts/image-url-rule.md) §1: the structural
      interfaces `AttachedImage { filePath?: string | null }`,
      `ArtistImageSource { imageUrl?, mainImage?, headerImage?, discogs?: { imageUrl? } }`,
      `AlbumImageSource { coverImageUrl?, coverImage? }`, and the functions
      `toArtistImageUrl(artist): string | null` (entered `imageUrl` → `mainImage.filePath` →
      `discogs.imageUrl` → `null`), `toArtistHeaderUrl(artist): string | null`
      (`headerImage.filePath` → the artist-picture order) and
      `toAlbumCoverUrl(album): string | null` (`coverImageUrl` → `coverImage.filePath` → `null`).
      **Import nothing** — the project is `platform:agnostic`, so `@music-collection/api` types are
      a lint error (constitution IX); that is why the interfaces are structural. Honour G1–G6:
      pure, total, trims before testing for presence, returns `null` rather than `''`. Add the
      mirror comment naming `apps/functions/src/catalog-image-url.ts` as the twin and
      `specs/60-artist-album-image-urls/contracts/image-url-rule.md` as the arbiter — the server
      file will carry the inverse comment (plan.md → Complexity Tracking).
- [X] T004 [sonnet] Prove the foundation: run
      `npx nx test common-engine --testFile=libs/common/engine/src/lib/image-url.spec.ts` (must now
      pass, every case from the §3 table) and `npx nx lint common-engine` (must report no
      `@nx/enforce-module-boundaries` error — in particular no `platform:agnostic → platform:angular`
      violation out of `libs/common/engine`). Report both outputs. Change no file; if either fails,
      stop and report rather than editing the rule.

**Checkpoint**: the rule exists, is exported as `@music-collection/common/engine`, is proven by its
own suite and breaks no boundary. US1 and US2 can now proceed in parallel.

---

## Phase 3: User Story 1 - The entered picture is the one that shows (Priority: P1) 🎯 MVP

**Goal**: reverse the order at the 16 sites where the attachment wins today
([data-model.md](./data-model.md) → Group A, browser half: A1–A14), so an artist or album with both
an attachment and an entered URL shows the **entered** picture in the lists, the cards, the detail
pages and the player — while the artist detail header keeps its attached header picture (FR-006).

**Independent Test**: take one artist and one album that have both an attachment and an entered
address and confirm the entered picture is what appears everywhere the entry is listed or opened;
then open an artist that has an attached header and confirm the banner is still the attached header.

**Covers**: AC-1, AC-2, AC-6 · FR-001, FR-002, FR-006 · SC-001, SC-003

### Tests for User Story 1 ⚠️

> Write these FIRST and confirm they fail against the current order before touching any source file.

- [X] T005 [P] [US1] [opus] Create **new** file
      `libs/ui/src/lib/music-view/music-view.mapper.spec.ts` covering AC-1, AC-2 and AC-6 for the
      three exported mappers in `libs/ui/src/lib/music-view/music-view.mapper.ts`:
      `toArtistView` — an artist with `imageUrl`, `mainImage.filePath` **and**
      `discogs.imageUrl` yields `imageUrl` as `imageUrl` (AC-1, case 10), and falls back to
      `mainImage.filePath` then `discogs.imageUrl` (cases 11, 12);
      `toArtistView().headerUrl` — an artist with an attached `headerImage` plus an entered
      `imageUrl` yields the **header's** `filePath` (AC-6, case 16), and an artist with no attached
      header yields the entered `imageUrl` (case 17) then `mainImage.filePath` (case 18);
      `toAlbumView` — an album with both `coverImageUrl` and `coverImage.filePath` yields
      `coverImageUrl` (AC-2, case 1), and `null` + an attachment still yields the attachment
      (FR-007, case 2);
      the collection-item mapper's `coverUrl` (built from `release.album` at line 73) — the same
      reversal through a partial nested album. Confirm the artist/album assertions fail and the
      AC-6 assertion already passes.
- [X] T006 [P] [US1] [opus] Extend
      `libs/domain/music/artist/src/lib/collection/component/table/artist-table.component.spec.ts`
      with AC-1 for `imageOf()`: an `ArtistEntity` carrying `imageUrl`, `mainImage.filePath` and
      `discogs.imageUrl` must return `imageUrl`; with no `imageUrl` it must still return
      `mainImage.filePath` (FR-007). Confirm the first assertion fails against the current
      `mainImage?.filePath || imageUrl || discogs?.imageUrl` at line 62.
- [X] T007 [P] [US1] [opus] Extend
      `libs/domain/music/album/src/lib/collection/component/table/album-table.component.spec.ts`
      with AC-2 for the cover derivation at line 78: an `AlbumEntity` carrying both
      `coverImageUrl` and `coverImage.filePath` must yield `coverImageUrl`; with no `coverImageUrl`
      it must still yield `coverImage.filePath` (FR-007). Confirm the first assertion fails.

### Implementation for User Story 1

- [X] T008 [US1] [opus] Delegate the three Group A sites in
      `libs/ui/src/lib/music-view/music-view.mapper.ts` to the rule, importing
      `toAlbumCoverUrl` / `toArtistImageUrl` from `@music-collection/common/engine`: line 73
      (`coverUrl: release.album?.coverImage?.filePath || release.album?.coverImageUrl || null` →
      `toAlbumCoverUrl(release.album)`, A2), line 95 (the `const imageUrl = artist.mainImage?.filePath
      || artist.imageUrl || artist.discogs?.imageUrl || null` block → `toArtistImageUrl(artist)`,
      A1) and line 118 (`coverUrl: album.coverImage?.filePath || album.coverImageUrl || null` →
      `toAlbumCoverUrl(album)`, A3). **Leave line 105 (`headerUrl: artist.headerImage?.filePath ||
      imageUrl`) exactly as it is** — it already expresses the header rule and picks up the new
      artist-picture order through its fallback ([data-model.md](./data-model.md) → Group C, C1).
      T005 must go green.
- [X] T009 [P] [US1] [opus] Replace the body of `imageOf()` at line 62 of
      `libs/domain/music/artist/src/lib/collection/component/table/artist-table.component.ts` with
      `toArtistImageUrl(artist)` from `@music-collection/common/engine`, and rewrite the now-false
      JSDoc above it ("The uploaded main image, else the photo found on the web.") to state the new
      order. T006 must go green.
- [X] T010 [P] [US1] [opus] Delegate the cover derivation at line 78 of
      `libs/domain/music/album/src/lib/collection/component/table/album-table.component.ts` to
      `toAlbumCoverUrl` from `@music-collection/common/engine`. T007 must go green.
- [X] T011 [P] [US1] [opus] Delegate the cover derivation at line 81 of
      `libs/domain/music/release/src/lib/collection/component/table/release-table.component.ts` to
      `toAlbumCoverUrl(release.album)` from `@music-collection/common/engine` (A6).
- [X] T012 [P] [US1] [opus] Delegate the cover derivation at line 65 of
      `libs/domain/music/collection-item/src/lib/collection/component/table/collection-item-table.component.ts`
      to `toAlbumCoverUrl` from `@music-collection/common/engine` (A7). Note: `domain-collection-item`
      gains a **new** dependency on `common-engine` (`type:domain → type:engine`, allowed by
      `eslint.config.cjs`); `npx nx lint domain-collection-item` must stay green.
- [X] T013 [P] [US1] [opus] In `libs/domain/music/album/src/lib/view/simple/album-simple-view.component.ts`
      add `protected readonly coverUrl = toAlbumCoverUrl;` (imported from
      `@music-collection/common/engine`), and in
      `libs/domain/music/album/src/lib/view/simple/album-simple-view.component.html` replace the
      `p-image` binding at line 3 (`[src]="album.coverImage?.filePath || album.coverImageUrl || ''"`)
      with `[src]="coverUrl(album) || ''"` (A8). **Do not touch line 1** — the
      `[style.background]` binding is a Group B site handled in T023; T013 and T023 therefore must
      not run in parallel with each other.
- [X] T014 [P] [US1] [opus] In `libs/domain/music/album/src/lib/view/item/album-item-view.component.ts`
      add `protected readonly coverUrl = toAlbumCoverUrl;` and in
      `libs/domain/music/album/src/lib/view/item/album-item-view.component.html` replace the
      `p-image` binding at line 5 with `[src]="coverUrl(album) || ''"` (A9).
- [X] T015 [P] [US1] [opus] In `libs/domain/music/album/src/lib/view/detail/album-detail-view.component.ts`
      add `protected readonly coverUrl = toAlbumCoverUrl;` and in
      `libs/domain/music/album/src/lib/view/detail/album-detail-view.component.html` replace the
      `p-image` binding at line 14 (`params.album.coverImage?.filePath ||
      params.album.coverImageUrl || ''`) with `[src]="coverUrl(params.album) || ''"` (A10).
- [X] T016 [P] [US1] [opus] Delegate the `coverUrl` derivation at line 36 of
      `libs/domain/music/music-collection/core/src/lib/music-collection.mapper.ts` to
      `toAlbumCoverUrl(album)` from `@music-collection/common/engine` (A11).
- [X] T017 [P] [US1] [opus] Delegate the `coverUrl` derivation at line 45 of
      `apps/music-collection/src/app/shared/entity-view/pressing-row.ts` to `toAlbumCoverUrl(album)`
      from `@music-collection/common/engine` (A12). The site reads a possibly-`undefined` `album`,
      which the rule's G2 guarantee already covers.
- [X] T018 [P] [US1] [opus] Delegate **both** `coverUrl` derivations in
      `apps/music-collection/src/app/shared/player/player.store.ts` — line 289 and line 869 — to
      `toAlbumCoverUrl(album)` from `@music-collection/common/engine` (A13, A14). One task because
      both edits are in the same file.
- [X] T019 [US1] [sonnet] Prove User Story 1. Run, and report the output of, each command in
      [quickstart.md](./quickstart.md) step 2 that belongs to US1:
      `npx nx test ui --testFile=libs/ui/src/lib/music-view/music-view.mapper.spec.ts`,
      `npx nx test domain-artist --testFile=libs/domain/music/artist/src/lib/collection/component/table/artist-table.component.spec.ts`,
      `npx nx test domain-album --testFile=libs/domain/music/album/src/lib/collection/component/table/album-table.component.spec.ts`,
      then `npx nx run-many -t test -p ui domain-artist domain-album domain-release domain-collection-item music-collection-core music-collection`
      and `npx nx run-many -t lint -p ui domain-artist domain-album domain-release domain-collection-item music-collection-core music-collection`.
      Done when all are green with no `@nx/enforce-module-boundaries` error. Change no source file;
      if something fails, stop and report the failing suite and message.

**Checkpoint**: User Story 1 is complete and independently testable. An artist or album with both an
attachment and an entered URL now shows the entered picture in every catalog list, card, detail view
and the player; the artist header still shows its attachment.

---

## Phase 4: User Story 2 - The entered picture reaches every surface (Priority: P2)

**Goal**: wire the entered URL into the 9 code sites / 8 rendering surfaces that ignore it today
([data-model.md](./data-model.md) → Group B, B1–B9), so no surface renders an empty frame for an
entry whose only picture is an entered URL.

**Independent Test**: take an artist and an album whose **only** picture is an entered address and
open the artist simple view, the artist detail header, the wishlist, a wishlist item page and a
shared collector profile — the entered picture appears on each.

**Covers**: AC-3 · FR-003 · SC-002 (as narrowed by [research.md](./research.md) D5: 8 rendering
surfaces across 9 code sites, plus one admin indicator deliberately left on the attachment)

### Tests for User Story 2 ⚠️

> Write these FIRST and confirm they fail against the current code.

- [X] T020 [P] [US2] [opus] Extend
      `libs/domain/music/artist/src/lib/view/component/simple/artist-simple-view.component.spec.ts`
      with AC-3: an artist whose only picture is an entered `imageUrl` (no `mainImage`) must have
      that URL in the rendered `p-image` `src`, not an empty string (case 13). Confirm it fails
      against the current `artist.mainImage?.filePath || ''` at line 26 of the template.
- [X] T021 [P] [US2] [opus] Extend
      `libs/domain/music/wishlist-item/src/lib/collection/component/table/wishlist-item-table.component.spec.ts`
      with AC-3 for `imageOf()`: a `WishlistItemEntity` whose `albumReference` carries only
      `coverImageUrl` must return that URL (case 3), and one carrying both must return
      `coverImageUrl` (case 1). Confirm both fail against the current
      `wishlistItem.albumReference?.coverImage?.filePath || null` at line 64.
- [X] T022 [P] [US2] [opus] Extend
      `apps/music-collection/src/app/data/collector-profile/collector-profile.model.spec.ts` with
      AC-3: a wish whose `albumReference` carries only `coverImageUrl` must produce a
      `CollectorWish.coverUrl` of that URL, and one carrying both must produce `coverImageUrl`.
      Confirm both fail against the current `wish.albumReference?.coverImage?.filePath ?? null` at
      line 442.

### Implementation for User Story 2

- [X] T023 [US2] [opus] In
      `libs/domain/music/album/src/lib/view/simple/album-simple-view.component.html` route the
      `[style.background]` binding at line 1 (`album.coverImage?.filePath`) through the
      `coverUrl` member added in T013: `[style.background]="coverUrl(album)"` (B3). **Keep the
      binding shape** — do not add a `url('…')` wrapper: the background has never drawn because of
      the missing wrapper, and fixing that would make a background appear where none ever has,
      which this ticket did not ask for ([research.md](./research.md) D8 item 1 — raise a separate
      issue instead). Depends on T013 (same file).
- [X] T024 [P] [US2] [opus] In
      `libs/domain/music/artist/src/lib/view/component/simple/artist-simple-view.component.ts` add
      `protected readonly imageUrl = toArtistImageUrl;` (imported from
      `@music-collection/common/engine`), and in
      `libs/domain/music/artist/src/lib/view/component/simple/artist-simple-view.component.html`
      replace the `p-image` binding at line 26 (`[src]="artist.mainImage?.filePath || ''"`) with
      `[src]="imageUrl(artist) || ''"` (B1). T020 must go green.
- [X] T025 [P] [US2] [opus] In
      `libs/domain/music/artist/src/lib/detail/component/artist-detail-view.component.ts` add
      `protected readonly headerUrl = toArtistHeaderUrl;` (imported from
      `@music-collection/common/engine`), and in
      `libs/domain/music/artist/src/lib/detail/component/artist-detail-view.component.html`
      replace the header `p-image` binding at line 8
      (`[src]="store.artist()?.headerImage?.filePath || ''"`) with
      `[src]="headerUrl(store.artist()) || ''"` (B2). Use `toArtistHeaderUrl`, **not**
      `toArtistImageUrl`: an artist with an attached header keeps it (AC-6, case 16), while an
      artist without one now gets the entered photo instead of today's empty frame (AC-3, case 17).
- [X] T026 [P] [US2] [opus] Replace the body of `imageOf()` at line 64 of
      `libs/domain/music/wishlist-item/src/lib/collection/component/table/wishlist-item-table.component.ts`
      with `toAlbumCoverUrl(wishlistItem.albumReference)` from `@music-collection/common/engine`,
      and update the JSDoc above it (B4). Note: `domain-wishlist-item` gains a **new** dependency on
      `common-engine` (`type:domain → type:engine`, allowed); `npx nx lint domain-wishlist-item`
      must stay green. T021 must go green.
- [X] T027 [P] [US2] [opus] In
      `libs/domain/music/wishlist-item/src/lib/view/component/simple/wishlist-item-simple-view.component.ts`
      add `protected readonly coverUrl = toAlbumCoverUrl;` and in
      `libs/domain/music/wishlist-item/src/lib/view/component/simple/wishlist-item-simple-view.component.html`
      replace **both** `p-image` bindings — the `horizontal` layout at line 12 and the vertical
      layout at line 56, each currently `wishlistItem.albumReference.coverImage?.filePath || ''` —
      with `[src]="coverUrl(wishlistItem.albumReference) || ''"` (B5, B6: two sites, one component).
- [X] T028 [P] [US2] [opus] Replace the `coverUrl` computed at line 54 of
      `apps/music-collection/src/app/page/wishlist-item/wishlist-item-page.store.ts`
      (`computed(() => album()?.coverImage?.filePath ?? null)`) with
      `computed(() => toAlbumCoverUrl(album()))` from `@music-collection/common/engine` (B7). The
      rule returns `null` for a `null` album (G2), so the `?? null` is no longer needed.
- [X] T029 [P] [US2] [opus] Replace the `coverUrl` derivation at line 109 of
      `apps/music-collection/src/app/page/wishlist/wishlist-page.store.ts`
      (`item.albumReference?.coverImage?.filePath || null`) with
      `toAlbumCoverUrl(item.albumReference)` from `@music-collection/common/engine` (B8).
- [X] T030 [P] [US2] [opus] Replace the `coverUrl` derivation at line 442 of
      `apps/music-collection/src/app/data/collector-profile/collector-profile.model.ts`
      (`wish.albumReference?.coverImage?.filePath ?? null`) with
      `toAlbumCoverUrl(wish.albumReference)` from `@music-collection/common/engine` (B9). T022 must
      go green.
- [X] T031 [US2] [sonnet] Confirm the one Group B site that must **not** change is unchanged:
      `apps/music-collection/src/app/page/admin/dashboard/admin-dashboard.mapper.ts` line 70 must
      still read `isFilled: (artist) => !!artist.headerImage?.filePath` for the
      `admin.field.headerImage` row. Verify with
      `grep -n "headerImage" apps/music-collection/src/app/page/admin/dashboard/admin-dashboard.mapper.ts`
      and report the matching line. Rationale ([research.md](./research.md) D5): the row asks "is a
      header **attached**", not "does a header render"; routing it through `toArtistHeaderUrl` would
      mark it filled for every artist with any photo and empty the admin's to-do list. Edit no file
      — this task only records the evidence that the site was left alone deliberately.
- [X] T032 [US2] [sonnet] Prove User Story 2. Run, and report the output of,
      `npx nx test domain-artist --testFile=libs/domain/music/artist/src/lib/view/component/simple/artist-simple-view.component.spec.ts`,
      `npx nx test domain-wishlist-item --testFile=libs/domain/music/wishlist-item/src/lib/collection/component/table/wishlist-item-table.component.spec.ts`,
      `npx nx test music-collection --testFile=apps/music-collection/src/app/data/collector-profile/collector-profile.model.spec.ts`,
      then `npx nx run-many -t test -p domain-artist domain-album domain-wishlist-item music-collection`
      and `npx nx run-many -t lint -p domain-artist domain-album domain-wishlist-item music-collection`.
      Done when all are green with no `@nx/enforce-module-boundaries` error — in particular none
      from `domain-wishlist-item`'s new `common-engine` dependency. Change no source file; report
      any failure instead of fixing it.

**Checkpoint**: User Stories 1 and 2 both work independently. No surface of the app renders an empty
frame for an entry whose only picture is an entered URL.

---

## Phase 5: User Story 3 - Server-generated content follows the same order (Priority: P3)

**Goal**: apply the same order in the two Cloud Functions that name an album's cover
([data-model.md](./data-model.md) → A15, A16), through a deliberately mirrored rule file, because
`apps/functions` may not import from `libs/` (constitution XIII, [research.md](./research.md) D2).

**Independent Test**: compose a badge and a daily question for an album fixture that has both an
attached cover and an entered cover URL, and confirm the generated artefact names the entered cover.

**Covers**: AC-4 · FR-004 · test level `functions`

**⚠️ Not observable in the product until the functions are deployed**, which is the maintainer's
call (constitution VIII). This phase ends at a green `npx nx test functions`; it does **not** deploy.

### Tests for User Story 3 ⚠️

- [X] T033 [P] [US3] [opus] Write the failing unit test for the server rule in **new** file
      `apps/functions/src/catalog-image-url.spec.ts`. Assert album-cover cases **1–9** of
      [contracts/image-url-rule.md](./contracts/image-url-rule.md) §3 — the same eight cases the
      browser suite asserts, which is the drift guard, plus case 9 (`coverImageUrl` is the number
      `42` and the attachment wins, G2 on a wrongly typed Firestore value). Also assert G3 (`''`
      falls through), G4 (non-empty `string` or `null`) and G5 (whitespace-only falls through).
      Confirm it fails because the module does not exist:
      `npx nx test functions --testFile=apps/functions/src/catalog-image-url.spec.ts`.
- [X] T034 [P] [US3] [opus] Extend `apps/functions/src/music-collection-badge-facts.spec.ts` with
      AC-4: a `toAlbum()` input `Record<string, unknown>` carrying both
      `coverImage: { filePath: 'https://storage/doc.jpg' }` and
      `coverImageUrl: 'https://a/url.jpg'` must yield `coverUrl: 'https://a/url.jpg'`; with no
      `coverImageUrl` it must still yield the attachment (FR-007). Confirm the first assertion
      fails against the current order at lines 74–88.
- [X] T035 [P] [US3] [opus] Extend `apps/functions/src/daily-question-compose.spec.ts` with AC-4:
      a `DocumentSnapshot` fixture whose `get('coverImage')` returns
      `{ filePath: 'https://storage/doc.jpg' }` and whose `get('coverImageUrl')` returns
      `'https://a/url.jpg'` must produce a `MaterialAlbum.coverUrl` of `'https://a/url.jpg'`; with
      no `coverImageUrl` it must still produce the attachment. Confirm the first assertion fails
      against the current order at lines 183–187.

### Implementation for User Story 3

- [X] T036 [US3] [opus] Create the mirrored rule in **new** file
      `apps/functions/src/catalog-image-url.ts`, exporting
      `toAlbumCoverUrl(coverImageUrl: unknown, coverImage: unknown): string | null` exactly as
      specified in [contracts/image-url-rule.md](./contracts/image-url-rule.md) §2. Take the two
      raw values rather than an object, because the two callers read their documents differently
      (`music-collection-badge-facts.ts` from a `Record<string, unknown>` field map,
      `daily-question-compose.ts` from `DocumentSnapshot.get()`). Inspect both arguments
      defensively with `typeof` — `coverImage` may be anything, including `null` or a number — and
      honour G1–G6, trimming before testing for presence. **Import nothing from `libs/`**: this is
      its own npm project compiled with `rootDir: src`, and an import that type-checks locally
      breaks the Cloud Build deploy (constitution XIII). Carry the Hungarian doc comment from the
      contract naming `libs/common/engine/src/lib/image-url.ts` as the twin and the contract file
      as the arbiter. Precedent in the same directory: `cover-color.ts`, `country-name.ts`.
      T033 must go green.
- [X] T037 [P] [US3] [opus] In `apps/functions/src/music-collection-badge-facts.ts` replace the
      `coverUrl` derivation inside `toAlbum()` (the `cover?.filePath || (typeof
      data['coverImageUrl'] === 'string' ? … ) || null` block at lines 74–88) with a call to
      `toAlbumCoverUrl(data['coverImageUrl'], data['coverImage'])` imported from
      `./catalog-image-url`, and drop the now-unused local `cover` binding and its inline `typeof`
      checks (A15). T034 must go green.
- [X] T038 [P] [US3] [opus] In `apps/functions/src/daily-question-compose.ts` replace the
      `coverUrl` derivation inside `toMaterialAlbum()` (lines 183–187) with
      `toAlbumCoverUrl(document.get('coverImageUrl'), document.get('coverImage'))` imported from
      `./catalog-image-url`, and drop the now-unused local `cover` binding at line 169 (A16).
      **Replace the stale comment** immediately above it — "Ugyanaz a sorrend, mint a felületen
      (`music-view.mapper`): a feltöltött borító előbbre való a netről talált címnél." — with the
      new order, since it is the only written statement of the old rule left in the source
      ([research.md](./research.md) D8 item 2). T035 must go green.
- [X] T039 [US3] [sonnet] Prove User Story 3. Run, and report the output of,
      `npx nx test functions --testFile=apps/functions/src/catalog-image-url.spec.ts`,
      `npx nx test functions --testFile=apps/functions/src/music-collection-badge-facts.spec.ts`,
      `npx nx test functions --testFile=apps/functions/src/daily-question-compose.spec.ts`,
      then the whole level `npx nx test functions` and the project's own type-check
      `npx tsc -p apps/functions/tsconfig.app.json --noEmit` (the root `apps/functions/tsconfig.json`
      is empty — do not use it). Done when all are green and the type-check is clean. Do **not**
      deploy anything. Change no source file; report any failure instead of fixing it.

**Checkpoint**: the server composes badges and daily questions with the new order, proven by the
`functions` suite. The deploy is handed to the maintainer in the PR.

---

## Phase 6: User Story 4 - The form says what the order is (Priority: P3)

**Goal**: replace the two placeholder strings that still claim the field is "used when no main image
is attached", and rename their keys, so the text and the key both match the new behaviour
([research.md](./research.md) D4). The same phase adds the FR-007 assertions
([research.md](./research.md) D6).

**Independent Test**: open the artist form and the album form in Hungarian, English and German and
read the placeholder under the picture-address field.

**Covers**: AC-5, FR-005 (and FR-007 via T042/T043) · SC-004

**Note**: the text is the input's `placeholder` attribute, not a separate hint element — a naming
mismatch in the spec, not a scope change ([research.md](./research.md) D4).

### Tests for User Story 4 ⚠️

- [X] T040 [P] [US4] [opus] Extend
      `libs/domain/music/artist/src/lib/form/component/artist-form.component.spec.ts` with AC-5 and
      FR-007: assert the rendered placeholder of the photo-URL input resolves the key
      `ui.artistForm.url-wins-over-main` (and that `ui.artistForm.used-when-no-main` is gone), and
      assert the `headerImage` and `mainImage` document-autocomplete controls are still present in
      the form group and still rendered (FR-007 — attachments stay selectable). Confirm the
      placeholder assertion fails against the current key at line 164 of
      `artist-form.component.html`.
- [X] T041 [P] [US4] [opus] Extend
      `libs/domain/music/album/src/lib/form/component/album-form.component.spec.ts` with AC-5 and
      FR-007: assert the rendered placeholder of the cover-URL input resolves the key
      `ui.albumForm.url-wins-over-cover` (and that `ui.albumForm.used-when-no-cover` is gone), and
      assert the `coverImage` document-autocomplete control is still present in the form group and
      still rendered (FR-007). Confirm the placeholder assertion fails against the current key at
      line 260 of `album-form.component.html`.

### Implementation for User Story 4

- [X] T042 [P] [US4] [sonnet] Rename two keys and replace their text in all three translation
      files, editing **in place** (the keys follow template order, not alphabetical order — keep
      each on its current line):
      `libs/core/i18n/assets/i18n/hu.json` line 1844 `"used-when-no-cover"` →
      `"url-wins-over-cover": "A beírt cím előbbre való a csatolt borítóképnél"`, and line 1979
      `"used-when-no-main"` → `"url-wins-over-main": "A beírt cím előbbre való a csatolt főképnél"`;
      `libs/core/i18n/assets/i18n/en.json` line 1844 →
      `"url-wins-over-cover": "Takes precedence over the attached cover image"`, line 1979 →
      `"url-wins-over-main": "Takes precedence over the attached main image"`;
      `libs/core/i18n/assets/i18n/de.json` line 1844 →
      `"url-wins-over-cover": "Hat Vorrang vor dem angehängten Coverbild"`, line 1979 →
      `"url-wins-over-main": "Hat Vorrang vor dem angehängten Hauptbild"`.
      Done when `grep -rn "used-when-no-main\|used-when-no-cover" libs/ apps/` returns only the two
      template references that T043 and T044 fix, and each of the three JSON files still parses
      (`node -e "require('./libs/core/i18n/assets/i18n/hu.json')"` and the same for `en`/`de`).
      Rationale: `used-when-no-main` *is* the stale statement, encoded in the key
      ([research.md](./research.md) D4).
- [X] T043 [P] [US4] [sonnet] In
      `libs/domain/music/artist/src/lib/form/component/artist-form.component.html` line 164, change
      the transloco key `'ui.artistForm.used-when-no-main'` to
      `'ui.artistForm.url-wins-over-main'`. It is the only reference to that key. Done when
      `grep -n "url-wins-over-main" libs/domain/music/artist/src/lib/form/component/artist-form.component.html`
      matches and T040's placeholder assertion passes.
- [X] T044 [P] [US4] [sonnet] In
      `libs/domain/music/album/src/lib/form/component/album-form.component.html` line 260, change
      the transloco key `'ui.albumForm.used-when-no-cover'` to
      `'ui.albumForm.url-wins-over-cover'`. It is the only reference to that key. Done when
      `grep -n "url-wins-over-cover" libs/domain/music/album/src/lib/form/component/album-form.component.html`
      matches and T041's placeholder assertion passes.
- [X] T045 [US4] [sonnet] Prove User Story 4. Run, and report the output of,
      `npx nx test domain-artist --testFile=libs/domain/music/artist/src/lib/form/component/artist-form.component.spec.ts`
      and
      `npx nx test domain-album --testFile=libs/domain/music/album/src/lib/form/component/album-form.component.spec.ts`,
      plus `grep -rn "used-when-no-main\|used-when-no-cover" libs/ apps/` which must return
      nothing. Done when both suites are green and the grep is empty. Change no source file; report
      any failure instead of fixing it.

**Checkpoint**: all four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: the workspace-wide gates and the hand-off notes. [quickstart.md](./quickstart.md) steps
3–6 and its Definition of Done.

- [X] T046 [sonnet] Run the whole `unit` level and the whole `lint` target across the workspace:
      `npx nx run-many -t test --exclude=firestore-rules,functions` and
      `npx nx run-many -t lint`. Done when both are green with no
      `@nx/enforce-module-boundaries` error — in particular no `platform:agnostic → platform:angular`
      violation out of `libs/common/engine`, and no complaint from `domain-wishlist-item` or
      `domain-collection-item`, the only two projects that gain a new `common-engine` dependency
      ([quickstart.md](./quickstart.md) step 3). Report the full failure list if anything is red;
      change no source file.
- [X] T047 [P] [sonnet] Run the four constitution XII pre-review checks from
      [quickstart.md](./quickstart.md) step 4 and report each result: `npm test`
      (`nx test music-collection`), `npm run test:rules` (`nx test firestore-rules`, needs the
      Firestore emulator), `npm run lint` (`nx lint music-collection`) and `npm run build:dev`
      (which runs `verify:csp` against a **fresh** build — never run `verify:csp` against a stale
      `dist/`). Expected from `verify:csp`: "The hosting CSP matches the built page…". No new origin
      is introduced by this feature, so this is a regression check. Change no source file.
- [X] T048 [P] [sonnet] Verify the drift guard between the two rule implementations
      ([quickstart.md](./quickstart.md) step 6): run
      `npx nx test common-engine --testFile=libs/common/engine/src/lib/image-url.spec.ts` and
      `npx nx test functions --testFile=apps/functions/src/catalog-image-url.spec.ts`, then confirm
      by reading both spec files that album-cover cases 1–8 of
      [contracts/image-url-rule.md](./contracts/image-url-rule.md) §3 are asserted in **both**
      suites with identical expected values. Report any case asserted in one suite but not the
      other — that is drift, and the contract file is the arbiter. Also confirm each rule file
      carries the comment naming the other as its twin. Change no file.
- [X] T049 [opus] Compare the final diff against the 25-site inventory in
      [data-model.md](./data-model.md) → Surfaces: all 14 browser Group A sites (A1–A14) and both
      server sites (A15, A16) delegate to a rule; all 9 Group B sites (B1–B9) do too; and both
      Group C sites are untouched — `libs/ui/src/lib/music-view/music-view.mapper.ts:105` and
      `apps/music-collection/src/app/page/admin/dashboard/admin-dashboard.mapper.ts:70`. Confirm no
      file still spells the order out by hand:
      `grep -rn "coverImage?.filePath ||\|mainImage?.filePath ||" libs/ apps/` should return only
      the deliberate exceptions. Fix any site the implementation missed.
- [X] T050 [opus] Write the PR description for issue #60, covering the four items
      [quickstart.md](./quickstart.md) → Definition of Done requires the maintainer to see: (1) the
      functions deploy is pending the maintainer's go-ahead (constitution VIII) and AC-4 is not
      observable in the product until then; (2) [research.md](./research.md) D5's narrowing of
      SC-002 — 8 rendering surfaces across 9 code sites, plus the admin "header attached" indicator
      deliberately left on the attachment, for the maintainer to accept or overrule; (3)
      [research.md](./research.md) D8's two follow-up findings — the missing `url(...)` wrapper on
      `album-simple-view.component.html:1`, which deserves its own issue, and the replaced stale
      comment in `daily-question-compose.ts`; (4) the AC-1…AC-6 → passing-test table from
      [spec.md](./spec.md). Reference `(#60)` in the commit messages.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — T001 can start immediately
- **Foundational (Phase 2)**: depends on Setup — **blocks US1 and US2**
- **US1 (Phase 3)**: depends on Phase 2
- **US2 (Phase 4)**: depends on Phase 2; T023 additionally depends on T013 (same file)
- **US3 (Phase 5)**: depends only on **Setup** — it builds its own server-side rule and never
  imports `libs/`, so it can run fully in parallel with Phase 2, US1 and US2
- **US4 (Phase 6)**: depends only on **Setup** — it touches translation files and form templates
  only, and shares no file with any other phase
- **Polish (Phase 7)**: depends on every user story that is being shipped

### User Story Dependencies

- **US1 (P1)**: needs the shared rule (Phase 2). No dependency on another story.
- **US2 (P2)**: needs the shared rule (Phase 2). Independent of US1 except for the one shared file
  `album-simple-view.component.html` (T013 before T023).
- **US3 (P3)**: fully independent — separate project, separate rule file, separate test level.
- **US4 (P3)**: fully independent — translations and form templates only.

### Within Each User Story

- Tests are written and confirmed failing before the implementation (constitution III)
- The rule before its call sites
- `.ts` member before the template binding that reads it
- The story's own verification task (`T019` / `T032` / `T039` / `T045`) last

### Parallel Opportunities

- US3 and US4 can run from the start, alongside Phase 2 — nothing in them touches
  `libs/common/engine`
- Within Phase 2: nothing — T002 → T003 → T004 is a strict chain
- Within US1: all three test tasks T005–T007 in parallel; then T009–T018 in parallel (T008 is the
  mapper and T005 depends on it going green, so run T008 with them but keep it out of any batch
  that also edits `music-view.mapper.ts`)
- Within US2: T020–T022 in parallel; then T024–T030 in parallel, with T023 after T013
- Within US3: T033–T035 in parallel; T036 then T037 and T038 in parallel
- Within US4: T040 and T041 in parallel; then T042, T043 and T044 in parallel
- Within Polish: T047 and T048 in parallel after T046

---

## Parallel Example: User Story 1

```bash
# The three test tasks first — different files, no dependencies:
Task: "T005 Create libs/ui/src/lib/music-view/music-view.mapper.spec.ts (AC-1, AC-2, AC-6)"
Task: "T006 Extend artist-table.component.spec.ts (AC-1)"
Task: "T007 Extend album-table.component.spec.ts (AC-2)"

# Then the call sites — one task per file:
Task: "T009 artist-table.component.ts:62 → toArtistImageUrl"
Task: "T010 album-table.component.ts:78 → toAlbumCoverUrl"
Task: "T011 release-table.component.ts:81 → toAlbumCoverUrl"
Task: "T012 collection-item-table.component.ts:65 → toAlbumCoverUrl"
Task: "T014 album-item-view.component.{ts,html}:5 → coverUrl member"
Task: "T015 album-detail-view.component.{ts,html}:14 → coverUrl member"
Task: "T016 music-collection.mapper.ts:36 → toAlbumCoverUrl"
Task: "T017 pressing-row.ts:45 → toAlbumCoverUrl"
Task: "T018 player.store.ts:289,:869 → toAlbumCoverUrl"
```

---

## Implementation Strategy

### MVP First (Foundational + User Story 1)

1. T001 — baseline green
2. T002–T004 — the rule exists and is proven
3. T005–T019 — the 14 browser Group A sites reverse
4. **STOP and VALIDATE**: an artist and an album that have both an attachment and an entered URL
   show the entered picture everywhere they are listed or opened; the artist header still shows its
   attachment
5. Ship if desired — the interface parts take effect with no deploy

### Incremental Delivery

1. Phase 2 → the rule is the single place that knows the order
2. + US1 → the reversal lands on every surface that already consulted the field (MVP, SC-001)
3. + US2 → the 8 surfaces that ignored the field pick it up (SC-002); the app no longer renders an
   empty frame for an entry whose only picture is an entered URL
4. + US4 → the form's placeholder stops contradicting the behaviour in all three languages (SC-004)
5. + US3 → the server follows suit; takes effect on the maintainer's deploy

US3 and US4 are both P3 and mutually independent; US4 is the cheaper of the two and needs no deploy,
so it is the better one to take first if only one fits.

### Parallel Team Strategy

With several implementers, after T001:

- Implementer A: T002–T004 (the rule), then US1
- Implementer B: US3 — `apps/functions` only, no dependency on the rule module
- Implementer C: US4 — translations and form templates only
- Implementer A or a fourth: US2 once Phase 2 is done

No two of these share a file.

---

## Notes

- **Model routing**: `.specify/kit/stack-angular-firebase.md` tags changes to shared libraries
  `[opus]`, which is why every source edit under `libs/` and every new or extended spec file is
  `[opus]`. The `[sonnet]` tasks are the ones the skill's own rules route there: running validation
  commands and collecting their output (T001, T004, T019, T031, T032, T039, T045, T046, T047, T048)
  and the fully specified translation-string and transloco-key edits (T042, T043, T044), whose exact
  before/after values are written into the task.
- **The order is implemented twice on purpose.** `libs/common/engine/src/lib/image-url.ts` and
  `apps/functions/src/catalog-image-url.ts` are twins because `apps/functions` may not import from
  `libs/` (constitution XIII). Cases 1–8 of the contract are asserted in both suites; T048 checks
  that guard. If the rule ever changes,
  [contracts/image-url-rule.md](./contracts/image-url-rule.md) changes first.
- **Two sites deliberately do not change**: `music-view.mapper.ts:105` (the artist header's
  attachment keeps precedence — FR-006/AC-6) and `admin-dashboard.mapper.ts:70` (the admin asks "is
  a header attached", not "does one render" — [research.md](./research.md) D5). T031 and T049 record
  that.
- **No deploy.** No task runs `firebase deploy`, `npm run deploy:*`, `tofu apply` or any `tools/`
  script with `--confirm` (constitution VIII, XIX). The optional read-only manual pass is
  [quickstart.md](./quickstart.md) step 7 and is not a task — it proves nothing the suites do not.
- **No write, no schema change, no rules change, no new origin.** Every field the rule reads already
  exists ([data-model.md](./data-model.md)); `firestore.rules` and `storage.rules` are untouched.
- Line numbers shift as tasks land. Each task names the expression to replace as well as its line,
  so a stale number does not make it ambiguous.
- Commit after each task or logical group, referencing `(#60)` (constitution IV).

---

## Moved out

The convergence phases 8 and 9 (T051–T060) continue in #79.
