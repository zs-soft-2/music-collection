# Feature Specification: Honest feedback on the image URL field

**Feature Branch**: `80-image-url-field-feedback`

**Created**: 2026-11-03

**Status**: Draft

**Input**: GitHub issue [#80](https://github.com/zs-soft-2/music-collection/issues/80): "A kép-URL mező piros keretes, és törött az előnézete érvényes URL-nél is"

**Source Issue**: https://github.com/zs-soft-2/music-collection/issues/80

## Background

The ticket asked why a valid picture address showed a red field outline and a broken preview on the
artist form. The investigation (see [issue-sync.md](issue-sync.md)) found that neither is a
validation failure:

- **The red outline is the focus style.** The field has no validation at all; every focused form
  field in the application takes the theme's primary colour, which is red, so an ordinary focus
  reads as an error.
- **The broken preview most likely came from the content policy of that day.** The screenshot was
  taken about six hours before the picture's host was allowed. Under today's policy the same address
  loads; under the earlier one it fails. This is an inference from the timeline and a browser check
  outside the form, so AC-1 confirms it on the real form.

What remains is that the form still misleads: focus looks like an error, and a picture that truly
cannot load shows as a silent broken glyph with no explanation.

## Clarifications

### Session 2026-11-03

- Q: Should the focus colour change also cover hand-built form fields, or only the library-styled ones? → A: Every form field: library-styled fields, hand-built fields and choice cards built around a hidden radio or checkbox. Buttons, cards and links keep their red focus.
- Q: Should the message say only that the picture cannot be loaded, or also that a saved address leaves the entry without a picture? → A: Only that the picture cannot be loaded from the address.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A picture that cannot load says so (Priority: P1)

An admin curating the catalog enters a picture address on an artist or an album. If the picture
loads, they see it. If it does not, they see a plain message saying so instead of a broken-image
glyph, and they can correct the address or still save it, because the address remains theirs to
decide on.

**Why this priority**: a silent broken glyph gives no way of telling a mistyped address from a
temporary failure, and this is the behaviour the ticket reported.

**Independent Test**: on one artist and one album, enter a loading address, a non-loading address,
and then a loading address again, and watch the preview area.

**Acceptance Scenarios** (AC-1, AC-2, AC-3, AC-4):

1. **Given** the artist form, **When** a loading address is pasted, **Then** the preview shows that picture with no message (AC-1).
2. **Given** an address that does not load, **When** the preview fails, **Then** a message replaces the broken glyph, the value stays and the form can be saved (AC-2).
3. **Given** the album form, **When** its cover address does not load, **Then** the same happens (AC-3).
4. **Given** a visible message, **When** the address changes to a loading one, **Then** the message goes and the picture appears (AC-4).

---

### User Story 2 - Focus no longer looks like an error (Priority: P2)

An admin moving through any form sees the focused field marked in a colour that does not suggest
something is wrong. Red stays the brand's primary colour elsewhere.

**Why this priority**: it is half of the ticket's report, but cosmetic: nothing is lost, only
misread. It affects every form in the application, so it is verified separately.

**Independent Test**: focus a field holding a valid value, on any form, in both colour modes.

**Acceptance Scenarios** (AC-5):

1. **Given** a form field with a valid value, **When** it receives focus, **Then** its outline is not red, so it does not look like an error (AC-5).

---

### Edge Cases

- **Empty field**: no preview and no message.
- **Half-typed address**: the preview attempts each intermediate value, so a message may appear while typing. It clears on the next change (AC-4) and blocks nothing.
- **Address changes during a load**: the outcome of the earlier address must not decide what is shown for the current one.
- **Address filled in from external data** (the artist form's data suggestions): behaves exactly like a typed one.
- **Same failing address opened again**: a freshly opened form tries to load it again.
- **Attached pictures** (header, main image): unchanged, they have their own previews.

## Acceptance Criteria (issue #80)

Wording as approved by the maintainer at the sync gate on 2026-11-03.

| AC | Given / When / Then | FR / SC | Verification | Test file |
|---|---|---|---|---|
| AC-1 | Adott az artist űrlap és egy betölthető kép-URL; beillesztéskor az előnézet ezt a képet mutatja, hibaüzenet nélkül | FR-001, SC-001 | unit + manual (dev, CSP-vel) | `libs/domain/music/artist/src/lib/form/component/artist-form.component.spec.ts` |
| AC-2 | Adott egy nem betölthető URL; amikor az előnézet hibát kap, törött kép helyett magyar/angol/német üzenet jelenik meg, az érték megmarad és az űrlap menthető | FR-002, FR-003, FR-004, SC-002 | unit | `libs/domain/music/artist/src/lib/form/component/artist-form.component.spec.ts` |
| AC-3 | Ugyanez az album `coverImageUrl` mezőjén | FR-001, FR-002, FR-003, FR-004 | unit | `libs/domain/music/album/src/lib/form/component/album-form.component.spec.ts` |
| AC-4 | Hibaüzenet látszik; ha az URL betölthetőre változik, az üzenet eltűnik és megjelenik a kép | FR-005 | unit | `artist-form.component.spec.ts`, `album-form.component.spec.ts` |
| AC-5 | Adott egy érvényes értékű űrlapmező; fókuszban a kerete nem piros, így nem néz ki hibának | FR-006, FR-007, SC-003 | manual, és unit a téma tokenjére | `apps/music-collection/src/app/theme/music-preset.spec.ts` (new) |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The artist photo field and the album cover field MUST preview the picture at the entered address when it loads, with no message.
- **FR-002**: When the picture cannot be loaded, the form MUST show a message in place of the broken-image glyph. The message MUST state only that the picture cannot be loaded from the entered address.
- **FR-003**: The message MUST be available in Hungarian, English and German.
- **FR-004**: A failed preview MUST NOT change the entered value or prevent saving. The field accepts free text as it does today, and no new validation is added.
- **FR-005**: When the address changes, the form MUST discard the previous outcome and judge the preview by the current address only.
- **FR-006**: A focused form field holding a valid value MUST NOT be outlined in red. It MUST use the theme's existing cyan focus colour, in both colour modes.
- **FR-007**: The focus colour change MUST apply to every form field across the application, however it is built: text fields, selects and choice cards. It MUST leave the primary colour unchanged everywhere else, including the focus of buttons, cards and links.

### Out of scope

- The label, musician and music-collection cover forms: their previews stay as they are (decided at the gate).
- The content policy: it already allows the host, and no change is needed.
- Waiting for typing to pause before attempting a preview.
- Warning in the message that saving a failing address leaves the entry without a picture (decided at clarification).
- Publishing the current hosting configuration to production, which sends no content policy today.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The address from the ticket's screenshot shows its picture on the Razor artist form on the dev environment.
- **SC-002**: On both forms, 0 failing addresses leave a broken-image glyph on screen, and each shows the message instead.
- **SC-003**: In both colour modes, 0 focused form fields with a valid value have a red outline, checked on the artist form and on the copy details form.

## Assumptions

- The screenshot's broken preview was caused by the earlier content policy. AC-1 checks this on the real form; if the picture still fails there, the root cause is not found and the ticket goes back to investigation (constitution principle II).
- The red outline in the screenshot was the focus style. AC-5 checks this: after the change the field must no longer be red while focused.
- A preview failure cannot tell why the picture failed (address, host or policy), so the message states only that it could not be loaded.
- Verification on dev requires a hosting and client deploy, done by the maintainer (constitution principle VIII).
