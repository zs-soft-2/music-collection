# Feature Specification: Entered image URLs take precedence

**Feature Branch**: `60-artist-album-image-urls`

**Created**: 2026-11-01

**Status**: Draft

**Input**: GitHub issue [#60](https://github.com/zs-soft-2/music-collection/issues/60): "Artist and Album image urls cannot be used."

**Source Issue**: https://github.com/zs-soft-2/music-collection/issues/60

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The entered picture is the one that shows (Priority: P1)

An admin curating the catalog has an artist (or an album) whose attached picture may not be used any
more. They enter a replacement address in the form's picture field and save. From that moment the
entry shows the picture they entered — in the lists, on the cards, on the detail pages, in the
player — without anyone having to touch the attachment that is already there.

Today the opposite happens: the attached picture wins, and the entered address is only consulted
when no attachment exists. The admin has no way to override an attachment short of removing it.

**Why this priority**: this is the whole point of the ticket. Until the entered address wins, the
admin cannot replace a picture they are not allowed to show, which is the reason the ticket exists.

**Independent Test**: take one artist and one album that have both an attachment and an entered
address, and confirm the entered picture is what appears everywhere the entry is listed or opened.

**Acceptance Scenarios**:

1. **Given** an artist with both an attached main picture and an entered photo address, **When** the
   artist appears in a list, on a card or on a detail page, **Then** the entered photo is shown
   (illustrates **AC-1**).
2. **Given** an album with both an attached cover and an entered cover address, **When** the album
   appears anywhere its cover is drawn, **Then** the entered cover is shown (illustrates **AC-2**).
3. **Given** an artist with an attached header picture and an entered photo address, **When** the
   artist's detail header is drawn, **Then** the attached header picture is still shown, because the
   header is a role of its own (illustrates **AC-6**).

---

### User Story 2 - The entered picture reaches every surface (Priority: P2)

The admin expects the address they entered to be used wherever the entry shows a picture — not only
in the places that happen to consult it. Today nine surfaces render the attachment alone and ignore
the entered address completely, so an entry whose only picture is an entered address appears blank
there.

**Why this priority**: without it the replacement is partial. The entry looks right in the catalog
lists but blank on the wishlist, on the collector profile and in the artist header — which reads as
a broken app, and leaves the admin unsure whether the change took effect at all.

**Independent Test**: take an artist and an album whose only picture is an entered address, and open
each of the surfaces that today render the attachment alone.

**Acceptance Scenarios**:

1. **Given** an artist whose only picture is an entered address, **When** their simple view, their
   detail header or a collector profile that names them is opened, **Then** the entered picture is
   shown instead of an empty frame (illustrates **AC-3**).
2. **Given** an album whose only picture is an entered address, **When** it appears on a wishlist,
   **Then** the entered picture is shown (illustrates **AC-3**).

---

### User Story 3 - Server-generated content follows the same order (Priority: P3)

The collection badges and the daily question are composed on the server, and they pick a picture by
the same rule the interface uses. If the server keeps the old order, a generated badge or a daily
question keeps showing the picture the admin replaced, even though every screen already shows the
new one.

**Why this priority**: it is the same rule in a second place. It matters, but it is invisible until
a badge or a question is generated, and it only takes effect after a deploy — so it must not hold up
the parts that work immediately.

**Independent Test**: compose a badge and a daily question for an album that has both an attachment
and an entered address, and confirm the generated artefact names the entered picture.

**Acceptance Scenarios**:

1. **Given** an album with both an attached cover and an entered cover address, **When** the server
   composes a collection badge or a daily question that names the album's cover, **Then** the
   entered cover address is the one it uses (illustrates **AC-4**).

---

### User Story 4 - The form says what the order is (Priority: P3)

The hint under the picture-address field currently tells the admin the field is "used when no main
image is attached". After this change that sentence is false in every language the app offers, and
an admin reading it would conclude the field cannot do what it now does.

**Why this priority**: a hint that contradicts the behaviour costs more than no hint. It is a small
change, but leaving it stale re-creates the confusion that opened this ticket.

**Independent Test**: open the artist form and the album form in each offered language and read the
hints.

**Acceptance Scenarios**:

1. **Given** an admin opens the artist form or the album form, **When** they read the hint under the
   picture-address field, **Then** it states that the entered address takes precedence over the
   attached picture, in whichever of the offered languages they are using (illustrates **AC-5**).

---

### Edge Cases

- **The entered address cannot be loaded.** The entry then shows no picture, even though a usable
  attachment exists — the attachment is no longer consulted once an address is entered. This is an
  accepted consequence of the precedence flip, not an oversight: falling back to the attachment
  would re-show exactly the picture the admin is trying to replace, which defeats the purpose. The
  separate question of telling the admin that an address failed to load is a later ticket.
- **An entry has neither an attachment nor an entered address.** Unchanged: nothing is shown.
- **An artist has an imported photo from the external source but nothing else.** Unchanged: the
  imported photo stays the last resort, behind both the entered address and the attachment.
- **An album's picture feeds something already generated.** Artefacts produced before the change
  keep the old picture until they are regenerated; the change applies to what is composed next.
- **An artist has an attached header picture, an attached main picture and an entered address.** The
  header shows the attached header picture; every other surface shows the entered address.

## Acceptance Criteria (issue #60)

| AC | Given / When / Then | FR / SC | Verification | Test file |
|---|---|---|---|---|
| AC-1 | **Given** an artist has both an attached main image document and an entered photo URL, **When** the artist's picture is shown anywhere in the app, **Then** the entered photo URL is the one used | FR-001, SC-001 | `unit` | `libs/ui/src/lib/music-view/music-view.mapper.spec.ts`, `libs/domain/music/artist/src/lib/collection/component/table/artist-table.component.spec.ts` |
| AC-2 | **Given** an album has both an attached cover image document and an entered cover URL, **When** the album's cover is shown anywhere in the app, **Then** the entered cover URL is the one used | FR-002, SC-001 | `unit` | `libs/ui/src/lib/music-view/music-view.mapper.spec.ts`, `libs/domain/music/album/src/lib/collection/component/table/album-table.component.spec.ts` |
| AC-3 | **Given** an artist or album has an entered image URL and no attached document, **When** it is shown on a surface that today renders only the attached document, **Then** the entered URL is used instead of an empty frame | FR-003, SC-002 | `unit` | `libs/domain/music/artist/src/lib/view/component/simple/artist-simple-view.component.spec.ts`, `libs/domain/music/wishlist-item/src/lib/collection/component/table/wishlist-item-table.component.spec.ts`, `apps/music-collection/src/app/data/collector-profile/collector-profile.model.spec.ts` |
| AC-4 | **Given** the server composes a collection badge or a daily question for an album that has both an attached cover and an entered cover URL, **When** the generated content names the album's cover, **Then** the entered cover URL is the one it uses | FR-004 | `functions` | `apps/functions/src/music-collection-badge-facts.spec.ts`, `apps/functions/src/daily-question-compose.spec.ts` |
| AC-5 | **Given** an admin opens the artist form or the album form, **When** they read the hint under the image URL field, **Then** it states that the entered URL takes precedence over the attached image — in Hungarian, English and German | FR-005, SC-004 | `unit` | `libs/domain/music/artist/src/lib/form/component/artist-form.component.spec.ts`, `libs/domain/music/album/src/lib/form/component/album-form.component.spec.ts` |
| AC-6 | **Given** an artist has both an attached header image and an entered photo URL, **When** the artist's header is drawn, **Then** the attached header image is used | FR-006, SC-003 | `unit` | `libs/ui/src/lib/music-view/music-view.mapper.spec.ts` |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Wherever an artist's picture is shown, the system MUST prefer the entered photo URL
  over the attached main image document, and fall back to the imported external photo only when
  neither is present.
- **FR-002**: Wherever an album's cover is shown, the system MUST prefer the entered cover URL over
  the attached cover image document.
- **FR-003**: Every surface that shows an artist's or an album's picture MUST consult the entered
  URL, including the surfaces that today render only the attached document.
- **FR-004**: Content composed on the server that names an album's cover MUST apply the same order
  as the interface.
- **FR-005**: The hint shown under each image URL field MUST state that the entered URL takes
  precedence over the attached image, in every language the app offers.
- **FR-006**: An artist's attached header image MUST keep precedence over the entered photo URL when
  the header is drawn, because a single entered URL cannot distinguish the header role from the main
  picture.
- **FR-007**: Attached image documents MUST remain stored, searchable and selectable in the forms.
  This feature changes only which picture is shown, never what is kept.

### Key Entities

- **Artist**: carries an attached main image document, an attached header image document, an entered
  photo URL and an imported external photo. All four may be present at once; only the order between
  them changes.
- **Album**: carries an attached cover image document and an entered cover URL. Both may be present
  at once.
- **Image document**: a stored, reusable picture the admin attaches by searching for it. Unaffected
  by this feature except in the order it is consulted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every artist and album that has an entered image URL, that picture — and not the
  attached one — is what appears on **all 16** surfaces that today consult both.
- **SC-002**: The entered picture appears on **all 9** surfaces that today ignore it, so no surface
  of the app renders an empty frame for an entry whose only picture is an entered URL.
- **SC-003**: The artist detail header keeps showing the attached header picture where one exists —
  zero regressions on the header among the surfaces changed.
- **SC-004**: An admin who reads the field's hint predicts the resulting picture correctly, in each
  of the three offered languages.
- **SC-005**: An admin replacing a picture needs exactly one action — entering the URL — with no
  edit, withdrawal or removal of the existing attachment required.

## Assumptions

- **Existing attachments stay.** The pictures that prompted this ticket remain stored and remain
  offered in the forms' document search; this feature only moves them behind the entered URL.
  Withdrawing or deleting them is out of scope (maintainer's decision on issue #60).
- **The screenshot's other symptoms are out of scope.** The red outline on the field and the broken
  preview visible in the issue's screenshot are a separate, still-unexplained defect; the URL in the
  screenshot and the hosting content policy were both verified to be sound. A later ticket covers
  them (maintainer's decision on issue #60).
- **No fallback after a failed load.** Once an entry has an entered URL, a failure to load it does
  not fall back to the attachment — see Edge Cases for why this is deliberate.
- **The imported external photo keeps its place** as the last resort for artists, behind both the
  entered URL and the attachment.
- **The server-side part needs a deploy.** The badge and daily-question changes have no effect until
  the functions are deployed, which is the maintainer's call (constitution VIII); the interface
  parts take effect without one.
- **One entered URL per entry.** Artists have a single entered photo URL but two attachment roles
  (main and header), which is why FR-006 exists.
