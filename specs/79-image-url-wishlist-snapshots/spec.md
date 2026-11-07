# Feature Specification: The entered picture address reaches wishes and stored album copies

**Feature Branch**: `79-image-url-wishlist-snapshots`

**Created**: 2026-11-07

**Status**: Draft

**Input**: GitHub issue [#79](https://github.com/zs-soft-2/music-collection/issues/79): "A megadott kép-URL a kívánságlistán és a tárolt albumoknál is érvényesüljön (a #60 folytatása)"

**Source Issue**: https://github.com/zs-soft-2/music-collection/issues/79

## Background

#60 made an address entered on an album or an artist take precedence over the attached picture. The
surfaces that read the live album already follow it. Some surfaces do not read the live album: they
read a copy stored with another record, so they still show the attached picture or an empty frame.

- **Wishes** store a narrow copy of the album that has no field for the entered address. Six wishlist
  surfaces read only that copy.
- **Pressings and copies** store a whole copy of the album as it stood when they were saved. A new
  save already includes the entered address. Copies saved before #60 do not, and four surfaces read
  them.
- The **shared collector profile** is a published page built from the wishes. It changes only when
  its content changes.

The investigation is in [issue-sync.md](issue-sync.md). The maintainer decided there that the stored
copies are brought up to date by a one-off update on dev, run only with their go-ahead.

## Clarifications

### Session 2026-11-07 (sync gate)

- Q: How do wishes already stored get the address? → A: A one-off update (backfill) copies it from the album. It runs on dev only after a dry run and the maintainer's go-ahead.
- Q: How do pressings and copies stored before #60 get it? → A: The same kind of one-off update.
- Q: What happens when an admin edits a wish? → A: The album copy is narrowed the same way as at creation, so a whole album is never stored on a wish.
- Q: Where do the catalog picture rules go in the docs? → A: A new docs area for catalog pictures, with one requirement for the album cover order and one for the artist header order.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A wish shows the cover the curator chose (Priority: P1)

A collector puts an album on their wishlist. If the album has an entered picture address, every
place that shows the wish shows that picture: the wishlist page, a wish's own page, the admin list
and table, and the shared profile.

**Why this priority**: it is the open part of #60's AC-3, and wishes are what collectors see most often.

**Independent Test**: add an album that has an entered address to a wishlist, then open each wishlist surface.

**Acceptance Scenarios** (AC-1, AC-2, AC-5):

1. **Given** an album with an entered address, **When** it is added to a wishlist from the album page or created or edited by an admin, **Then** the stored wish carries the address, narrowed to the album's reference fields (AC-1).
2. **Given** a wish that carries an address, **When** any of the six wishlist surfaces shows it, **Then** it shows the entered address instead of the attached cover (AC-2).
3. **Given** a shared profile, **When** one of its wishes gains an address, **Then** the profile counts as changed and is published again (AC-5).

---

### User Story 2 - Wishes stored earlier catch up (Priority: P2)

Wishes created before this change carry no address. After the one-off update on dev, they show the
album's entered address like new ones.

**Why this priority**: without it, existing wishes keep the old behaviour, and they are most of the data.

**Independent Test**: dry run of the update lists the wishes it would change; after the approved run, an old wish on dev shows the entered cover.

**Acceptance Scenarios** (AC-3, AC-8):

1. **Given** wishes stored before the change, **When** the approved update has run on dev, **Then** each wish whose album has an entered address carries it (AC-3).
2. **Given** the mock collector seed, **When** it builds a wish, **Then** it includes the catalog album's address, so mock data can show the behaviour (AC-8).

---

### User Story 3 - Pressings and copies show the current cover order (Priority: P3)

Pressings and copies saved before #60 store an album copy without the entered address. After the
one-off update on dev, the release view, the release table, the copy table and the pressing rows show
the entered cover.

**Why this priority**: affects older data only; new saves already carry the address.

**Independent Test**: on dev, open a pressing and a copy of an album that has an entered address, before and after the update.

**Acceptance Scenarios** (AC-4):

1. **Given** an album with an entered address, **When** the approved update has run on dev, **Then** its older pressings and copies show the entered cover on all four surfaces (AC-4).

---

### User Story 4 - The artist banner and the field definitions agree with the order (Priority: P3)

The artist banner follows the same order as every other artist picture, and the definitions of the
two address fields describe the order that is in force.

**Why this priority**: consistency; the visible difference is limited to a blank banner path.

**Independent Test**: unit tests of the banner, and reading the field definitions.

**Acceptance Scenarios** (AC-6, AC-7):

1. **Given** an artist with an attached banner, **When** the banner is shown, **Then** the attached banner wins; a banner path made only of spaces falls through to the next picture (AC-6).
2. **Given** the album and artist address fields, **When** their definitions are read, **Then** they say the entered address takes precedence (AC-7).

---

### Edge Cases

- **Album without an entered address**: the wish stores an empty address, and surfaces show the attached cover as today.
- **Admin re-picks the album on a wish**: the new album is narrowed, never stored whole.
- **Album address changed later**: wishes, pressings and copies keep the address they stored. Keeping them in step is not part of this feature.
- **Wish whose album no longer exists**: the update skips it and reports it.
- **Update run twice**: the second run changes nothing.
- **Shared profile not republished**: it catches up on the owner's next session.

## Acceptance Criteria (issue #79)

Wording as approved by the maintainer at the sync gate on 2026-11-07.

| AC | Given / When / Then | REQ | FR / SC | Verification | Test file |
|---|---|---|---|---|---|
| AC-1 | Adott egy album megadott kép-URL-lel. Amikor kívánságlistára kerül (album lap, admin létrehozás vagy szerkesztés), a tárolt `albumReference` tartalmazza a `coverImageUrl`-t; szerkesztéskor szűkítve, nem teljes albumként. | REQ-WISH-006 | FR-001, FR-002 | unit | `libs/domain/music/wishlist-item/src/lib/util/service/wishlist-item-util.service.impl.spec.ts`, `apps/music-collection/src/app/page/album/album-page.store.spec.ts` |
| AC-2 | Ha egy tétel referenciájában van megadott URL, mind a hat kívánságlista-felület (B4–B9) azt mutatja a csatolt borító helyett. | REQ-WISH-006 | FR-003, SC-001 | unit | `wishlist-item-table.component.spec.ts`, `wishlist-item-simple-view.component.spec.ts`, `wishlist-page` and `wishlist-item-page` store specs, `collector-profile.model.spec.ts` |
| AC-3 | A korábban tárolt tételek a dev backfill után megkapják az album megadott URL-jét. Előbb dry-run fut, a `--confirm` csak jóváhagyással. | REQ-WISH-006 | FR-004, SC-002 | manual (dev) | `manual-checks.md` |
| AC-4 | Ha egy albumnak van megadott URL-je, a régi release- és példány-snapshotok a dev backfill után azt mutatják a release nézetben, a release-táblában, a példány-táblában és a nyomás-sorban (A2, A6, A7, A12). | REQ-IMG-001 | FR-005, SC-003 | unit + manual (dev) | `music-view.mapper.spec.ts`, `release-table.component.spec.ts`, `collection-item-table.component.spec.ts`, `pressing-row.spec.ts`; `manual-checks.md` |
| AC-5 | A megosztott profil ujjlenyomata megváltozik, ha egy tétel megadott URL-t kap. | REQ-WISH-006 | FR-006 | unit | `apps/music-collection/src/app/data/collector-profile/collector-profile.model.spec.ts` |
| AC-6 | Az előadó fejléce a `toArtistHeaderUrl` sorrendjét követi: a csatolt fejléc nyer, a csak szóközből álló útvonal továbbesik. | REQ-IMG-002 | FR-007 | unit | `libs/ui/src/lib/music-view/music-view.mapper.spec.ts` |
| AC-7 | Az `album.ts:30` és az `artist.ts:44` mezőkommentje az új sorrendet írja le; az `artist.ts:32` marad. | REQ-IMG-001, REQ-IMG-002 | FR-008 | manual (grep) | `manual-checks.md` |
| AC-8 | A mock-seed beírja a tételekhez a katalógus-album `coverImageUrl`-jét; a seedet nem futtatjuk. | REQ-WISH-006 | FR-009 | manual (`node --check`, review) | `manual-checks.md` |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every way a wish is created MUST store the album's entered address with the album reference, or an empty value when the album has none.
- **FR-002**: Editing a wish MUST store the album reference narrowed to its reference fields, including the entered address, never the whole album.
- **FR-003**: Every wishlist surface MUST show the entered address when the wish carries one, and the attached cover otherwise.
- **FR-004**: A one-off update MUST be able to copy the album's entered address onto every stored wish. It MUST list what it would change without writing unless explicitly confirmed, MUST skip and report wishes whose album is missing, and MUST change nothing on a second run.
- **FR-005**: A one-off update of the same kind MUST copy the album's entered address onto the album copies stored with pressings and with collection copies.
- **FR-006**: A wish gaining an entered address MUST count as a change of the shared profile, so the profile is published again.
- **FR-007**: The artist banner MUST follow the shared artist banner order: attached banner first, a blank path counting as absent.
- **FR-008**: The definitions of the album and artist address fields MUST state that the entered address takes precedence over the attached picture.
- **FR-009**: The mock collector seed MUST include the catalog album's entered address on the wishes it builds.
- **FR-010**: The docs MUST record the new wish requirement and the catalog picture order before the code changes (docs-first).

### Key Entities

- **Album reference on a wish**: the narrow album copy a wish stores (identifier, name, attached cover). Gains the entered address.
- **Album copy on a pressing / collection copy**: a whole album as it stood when the record was saved. Older ones lack the entered address.
- **Shared collector profile**: a published page derived from the wishes, republished when its content changes.

### Out of scope

- Keeping stored copies in step when an album's address changes later.
- Running either update on prod (prod data predates albums, see the project's prod data note).
- The six wishlist surfaces' layout; only the picture they choose changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 of the 6 wishlist surfaces shows the attached cover or an empty frame for a wish whose album has an entered address.
- **SC-002**: After the approved update on dev, 100% of wishes whose album has an entered address carry it, and a second run changes 0 wishes.
- **SC-003**: After the approved update on dev, 0 of the 4 pressing and copy surfaces shows an outdated cover for an album with an entered address.

## Assumptions

- Both updates follow the existing one-off update pattern of the project and write only through its shared write path (constitution XVII).
- Running them needs the maintainer's go-ahead (constitution VIII, XIX). They are verified on dev only.
- The shared profile republishes automatically on the owner's next session once its content changes; no forced republish is added.
- The two tests named in the issue as "made honest" (T051) cannot fail before the change, because the readers are already correct. The tests that must fail first are on the writers instead (issue-sync, T051).
