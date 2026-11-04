# Research: Honest feedback on the image URL field

**Feature**: `80-image-url-field-feedback` · **Issue**: #80 · **Date**: 2026-11-03

The causes behind the ticket are in [issue-sync.md](./issue-sync.md). This file records the design decisions.

## R-1: How the failure is detected and reset

**Decision**: Listen to `p-image`'s `onImageError` output and keep the outcome in a `linkedSignal`
whose source is the `url` input, so any address change resets it. While the outcome is failed,
`p-image` is not rendered.

**Rationale**:
- `p-image` already re-emits the `error` event of its `<img>` (PrimeNG 22.1.1), and a CSP-blocked image fires the same event.
- Resetting on change meets FR-005, and returning to an address that failed before tries it again.
- For a change during a load, the HTML standard discards the pending tasks of an aborted image request, so the earlier address cannot report late. If the previous address had failed, its `<img>` is already gone.

**Alternatives considered**:
- Storing the failed address and comparing it with the current one: going A → B → A would show A's old failure without retrying.
- Hiding the broken image with CSS: the failed `<img>` would stay in the document.
- A separate probe with `new Image()`: a second request for every value, and it duplicates what `p-image` reports.

## R-2: Where the message state lives

**Decision**: In a new component, not in the form services or a store.

**Rationale**: A load outcome belongs to one on-screen element. It is not saved, validated or shared.
Two forms need it, and a form service would have to duplicate it. Constitution VII covers business
logic, and FR-004 says this state must not affect saving.

**Alternatives considered**: A signal in each `*FormService`: two copies of the same logic, plus a
state field per image field.

## R-3: Which library and import path

**Decision**: `libs/ui/src/lib/image-url-preview`, imported as `@music-collection/ui/image-url-preview`.

**Rationale**: Both domain libraries can use `libs/ui`, which already imports `core/i18n` (tagged
`type:api`). The main `@music-collection/ui` barrel is pulled in widely, and earlier barrel work
showed that this can carry unwanted code into the main bundle. A subpath alias avoids the question.

**Alternatives considered**: The main barrel: smaller change, but it risks `primeng/image` in the main bundle.

## R-4: How the library-styled fields change

**Decision**: Add `formField: { focusBorderColor: '{focus.ring.color}' }` to the `semantic` part of `MusicPreset`.

**Rationale**:
- Aura sets this token to `{primary.color}`, which is the actual cause of the red outline.
- `inputtext`, `textarea`, `select`, `multiselect`, `autocomplete` and the other field components read this one token.
- Verified by resolving the preset: `--p-form-field-focus-border-color` becomes `var(--p-focus-ring-color)`, which is `light-dark(#0091b3, #00d4ff)`, and the preset's other `formField` values are kept.

**Alternatives considered**:
- Per-component overrides: many lines for the same result, and new field types would miss them.
- Changing `primary.color`: breaks FR-007.

**Left alone**: `checkbox` and `radiobutton` use `checkedFocusBorderColor: {primary.color}`. That is the colour of their checked state, not an outline on a resting field.

## R-5: How the hand-built fields change

**Decision**: Replace `var(--mc-primary)` with `var(--mc-info)` in exactly the 16 rules listed in [data-model.md](./data-model.md).

**Rationale**:
- `--mc-info` has the same values as the theme's focus ring (`#00d4ff` dark, `#0091b3` light), and the global `:focus-visible` rule already uses it.
- A one-word edit keeps each rule's width and offset.
- The list comes from a selector-aware scan of every `.scss` file and inline `styles` block, then a check of borderline selectors. The `.chip`, `.option` and similar selectors outside the list are buttons or links, so they stay red under FR-007.

**Alternatives considered**:
- Deleting the rules to fall back on the global `:focus-visible`: this changes offsets, and does nothing for rules that set `border-color`.
- A new `--mc-focus` token: a second name for an existing value in two token files, for a one-ticket need.

**Unaffected**: Hand-built fields without their own focus rule are already cyan through the global rule. A hand-built field with an error keeps its `--mc-status-bad` border, since this ticket changes only the focus outline.

## R-6: Message text, style and accessibility

**Decision**: The key is `ui.imageUrlPreview.could-not-load`:

| Language | Text |
|---|---|
| hu | A kép nem tölthető be erről a címről. |
| en | The picture cannot be loaded from this address. |
| de | Das Bild kann von dieser Adresse nicht geladen werden. |

It uses the `--mc-status-bad` colour that field errors use, inside a permanently rendered
`role="status"` container.

**Rationale**:
- The wording follows FR-002 and the clarification: it states only the fact.
- A polite live region suits a message that blocks nothing and can appear while typing. The container must exist before its content, or screen readers may not announce it.
- This also settles the accessibility item left open by clarification.

**Alternatives considered**: `role="alert"`: it would interrupt screen reader users on half-typed addresses.
