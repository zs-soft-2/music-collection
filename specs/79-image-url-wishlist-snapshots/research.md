# Research: The entered picture address reaches wishes and stored album copies

**Feature**: `79-image-url-wishlist-snapshots` · **Issue**: #79 · **Date**: 2026-11-07

The facts behind these decisions are in [issue-sync.md](./issue-sync.md). Decisions D1–D4 of the
sync gate are taken as given.

## R-1: Which tests fail first (T051)

**Decision**: The red-first tests go on the **writers**:
- `wishlist-item-util.service.impl.spec.ts`: `createEntity` and `updateEntity` with an album that has an address. `updateEntity` also gets a whole `AlbumEntity` in the form, and must return only the reference fields.
- `album-page.store.spec.ts:1233`: the `addToWishlist` case expects `coverImageUrl` in the reference.

The two test files named by T051 get real fixtures instead of `as` casts, but they are not counted
as red-first proof.

**Rationale**: The readers (`imageOf`, `toWishlist`) already call `toAlbumCoverUrl`, so a fixture
carrying the address passes before the change. ts-jest runs with `isolatedModules: true` and never
type-checks, so a fixture that does not compile does not fail either. The defect is in the writers.

**Alternatives considered**: Asserting through `tsc` on the spec projects: both carry pre-existing
errors elsewhere (3 and 41), so a type-check gate would be noisy and is not part of `npm test`.

## R-2: One builder for the reference

**Decision**: A pure `toAlbumReference(album)` in
`libs/api/src/lib/domain/music/album/album-reference.ts`, exported next to `AlbumReference`. Input:
`Pick<Album, 'coverImage' | 'coverImageUrl' | 'name'> & Identifiable`. Output: exactly
`{ uid, name, coverImage, coverImageUrl }`, with `null` for a missing attachment or address.
`WishlistItemUtilServiceImpl` (create and update) and `album-wishlist.feature.ts` call it.

**Rationale**: Two hand-written writers already drifted once (#60's T053). Every writer can import
`type:api`. `libs/common/engine` would be the natural home next to `toAlbumCoverUrl`, but it is
`platform:agnostic` and may not import the `platform:angular` `libs/api` types (constitution IX).
A five-line function adds nothing noticeable to the main bundle.

**Alternatives considered**: Adding the field in each writer: the drift stays possible. Calling the
util service from the album feature: it would make the app store inject a domain util for one object
literal.

**Note**: an empty or blank address is stored as `null`, as entered. The readers already treat a
blank as absent.

## R-3: Narrowing on update (D3)

**Decision**: `updateEntity` passes `formGroup.value['albumReference']` through `toAlbumReference`.

**Rationale**: The control holds either the stored reference or, after the admin re-picks the album,
a whole `AlbumEntity`. Narrowing makes the stored shape the same as on create. An old reference
without the field becomes `coverImageUrl: null`. That reads the same as before, and the backfill
fills it.

## R-4: The backfill (D1, D2)

**Decision**: One script, `tools/sync/backfill-album-cover-url.mjs`, following
`backfill-collection-item-cover-color.mjs` and `backfill-album-has-tracks.mjs`:

1. Read `sync/catalog` once. Read albums through `readFeatureDocuments(…, 'album', …)` from
   `bundle-reader.mjs`, which costs 0 reads for the bundle plus the delta. Build `uid → trimmed
   address` for albums whose address is not blank. The uid is the last segment of the path.
2. Read `collectionGroup('wishlist-item')`, `collectionGroup('release')` and
   `collectionGroup('collection-item')`. None of them is bundled.
3. For each document whose album (`albumReference.uid`, `album.uid` or `release.album.uid`) has an
   address that differs from the copy's value, queue an update of that one nested field
   (`albumReference.coverImageUrl`, `album.coverImageUrl` or `release.album.coverImageUrl`).
   Updates go through `stamp(...)`.
4. Without `--confirm`, print the counts per target and the documents whose album is missing, then stop.
5. With `--confirm`, write in batches of ≤ 400. Then `touchCatalog` only the features that were written.

It accepts `--env`, `--read-all` and `--catch-up` exactly as `backfill-album-has-tracks.mjs` does.

**Rationale**:
- One album read serves all three targets, and the maintainer approves one dry run.
- It fills gaps only. A copy that already holds the album's address is left alone. An album without
  an address changes nothing, so the run cannot erase an address and a second run writes 0 (FR-004).
- `stamp` sets `updatedAt`, so clients pick up the change through their delta sync.

**Cost**: 1 read for `sync/catalog`, the album delta, and every release, collection item and wish
(about 500 + 520 + a few dozen on dev). The dry run costs the same reads.

**Alternatives considered**:
- Two scripts, one for wishes and one for snapshots: the album read would be paid twice.
- Reading albums with a plain `collectionGroup`: about 2,000 reads per run (see the project note on catalog script costs).
- A read-through in the readers: rejected at the gate (D1, D2).

## R-5: The readers stay as they are

**Decision**: `music-view.mapper.ts:74`, `release-table.component.ts:82`,
`collection-item-table.component.ts:66`, `pressing-row.ts:46` and the six wishlist readers are not
changed. Tests pin that each prefers a snapshot's `coverImageUrl` over its `coverImage`.

**Rationale**: They already call `toAlbumCoverUrl`. AC-4's unit part therefore documents behaviour
rather than failing first. The fix for AC-4 is data, and its proof is the dev check (constitution III
allows a recorded manual check).

## R-6: The artist banner (T056)

**Decision**: `toArtistView` uses `headerUrl: toArtistHeaderUrl(artist)`.

**Rationale**: It is the third hand-written copy of the order. Its only difference from the shared
function is that a blank attached banner path falls through, and a padded path is trimmed. Case 16
(`music-view.mapper.spec.ts:67`) keeps the attached banner's precedence. A new case covers the
blank path.

## R-7: The shared profile (T060)

**Decision**: A test in `collector-profile.model.spec.ts` asserts that
`collectorProfileFingerprint` differs between a profile whose wish has only an attachment and the
same profile with an entered address. No forced republish is added.

**Rationale**: The fingerprint hashes the whole composed profile, so a changed `coverUrl` moves it.
The fingerprint lives in memory, so each owner session writes the page once anyway. The delay until
the owner's next session is accepted and is mentioned in the PR.

## R-8: Docs first (D4)

**Decision**: Before any code task:
- New `docs/felhasznaloi/katalogus-kepek.md` with prefix `IMG`:
  - REQ-IMG-001: an album's cover is the entered address, else the attached cover. It holds for every surface, including those fed by a stored album copy.
  - REQ-IMG-002: an artist's picture is the entered address, else the main image, else the imported photo. The banner is the attached banner, else the artist's picture.
  - Felület for both: mindkettő. No deviation line, because the backfill closes the gap within this ticket.
- `docs/felhasznaloi/kivansaglista.md` gains REQ-WISH-006 (Felület: mindkettő, Ticket: #79).
- `docs/technikai/architektura/kivansaglista.md:10` and `:49`: the reference fields add `coverImageUrl`; the writers go through `toAlbumReference`; the backfill is named.
- `docs/README.md` gets a row for the new area. The area has no UX file of its own, so its UX cell reads "—".

**Rationale**: The docs-first profile requires every AC to name a requirement. No catalog-picture
area existed.

## R-9: The mock seed (T055)

**Decision**: At `seed-mock-collectors.mjs:615`, `albumReference` gains `coverImageUrl: wish.coverUrl`.
The album map already loads that value at `:229`. The seed is not run.
