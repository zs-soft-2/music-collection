# Phase 0 research: Entered image URLs take precedence

**Feature**: `60-artist-album-image-urls` · **Issue**: #60 · **Date**: 2026-11-01

The spec carries no `[NEEDS CLARIFICATION]` marker — the five product questions were settled at the
gate on 2026-11-01 (`issue-sync.md`, "Decisions taken at the gate"). What was left open was
*technical*: three items in `checklists/requirements.md` → "Carried into planning", plus two
questions the inventory raised once it was read site by site. Each is resolved below.

---

## D1 — One shared rule, not 25 edits

**Carried in from**: `checklists/requirements.md` → "The order is duplicated across 25 sites.
Constitution VII favours one shared rule over 25 separate edits."

**Decision**: add a pure rule module `libs/common/engine/src/lib/image-url.ts` exporting
`toArtistImageUrl`, `toArtistHeaderUrl` and `toAlbumCoverUrl`. Every browser-side site calls it;
none re-spells the order. Contract: [contracts/image-url-rule.md](./contracts/image-url-rule.md).

**Rationale**:

- `issue-sync.md` found the current order written out 25 times. Reversing it 25 times leaves the
  same 25 chances to be wrong next time — and the inventory itself is proof that the duplication
  already drifted: 16 sites consult the entered URL, 9 forgot to.
- Constitution II (root cause over workaround) reads on this directly. The root cause of "nine
  surfaces ignore the field" is that there is no one place that knows the answer.
- `libs/common/engine` already holds exactly this kind of module — `catalog-name.ts`,
  `catalog-number.ts`, `catalog-value.ts` — and `libs/ui/src/lib/music-view/music-view.mapper.ts`,
  the biggest consumer, already imports from it.
- The tags allow every consumer: `type:engine` is reachable from `type:ui`, `type:domain`,
  `type:core` and `type:app` (`eslint.config.cjs:18`).

**Alternatives considered**:

| Alternative | Rejected because |
|---|---|
| 25 independent edits, no shared module | Leaves the duplication that caused the defect; constitution VII was flagged ⚠️ on exactly this in `issue-sync.md`. |
| Put the rule in `libs/api` next to `toCoverColor` | `libs/api` is `platform:angular`, so the functions-side mirror could never be checked against it, and anything exported from the `libs/api` barrel lands in the main bundle. |
| Normalise the data instead — write a resolved `displayCoverUrl` onto the documents | A write (constitution XVII, wrapper required), a backfill script needing the maintainer's go-ahead (VIII), and a second field to keep in step on every edit. The spec asks for a display-order change, not a data change. |
| Resolve it in each store as a `computed` | Four of the sites are plain `@Input()` presentational components with no store, and three are pure mapper functions. A store per site is more machinery than the rule. |

**Structural types, not `@music-collection/api` imports.** `libs/common/engine` is
`platform:agnostic`; importing `AlbumEntity` / `ArtistEntity` from `@music-collection/api`
(`platform:angular`) is a lint error under constitution IX. The rule therefore takes the narrowest
shape it needs — `{ coverImageUrl?, coverImage?: { filePath? } }` — which also makes it callable
from the wishlist's `albumReference`, the player's partial album and the release's nested
`release.album`, none of which is a full entity.

---

## D2 — The server copy is a deliberate second implementation

**Decision**: `apps/functions/src/catalog-image-url.ts`, a mirror of the album half of the rule,
with its own spec. `music-collection-badge-facts.ts` and `daily-question-compose.ts` call it.

**Rationale**: constitution XIII — `apps/functions` is its own npm project (`rootDir: src`), built
by Cloud Build from that directory alone, and never imports from `libs/`. An import that
type-checks locally breaks the deploy. The same directory already mirrors shared logic this way:
`cover-color.ts` (against `toCoverColor` in `libs/api`) and `country-name.ts`.

The two call sites read their data differently — `badge-facts` from a
`Record<string, unknown>` field map, `daily-question-compose` from `DocumentSnapshot.get()` — so the
server signature takes the two raw values rather than an object:
`toAlbumCoverUrl(coverImageUrl: unknown, coverImage: unknown)`. It validates `typeof` itself, which
is what both sites do inline today.

The drift risk is real and is recorded in the plan's Complexity Tracking. Mitigation: each file
names the other in a comment, and `contracts/image-url-rule.md` is the one written case table that
both suites assert.

**Alternatives considered**: a path alias from `apps/functions` into `libs/` (the deploy failure XIII
exists to prevent); publishing the rule as an npm package (a release cycle for three `||`
operators); leaving the server on the old order (fails FR-004/AC-4, and the comment at
`daily-question-compose.ts:181` would still promise a sequence nothing else follows).

---

## D3 — Templates reach the rule through a `protected` component member

**Decision**: the seven template sites bind to a component member that *is* the rule, e.g.

```ts
protected readonly coverUrl = toAlbumCoverUrl;
```

```html
[src]="coverUrl(album) || ''"
```

No new pipe, no new directive, no logic in the class body.

**Rationale**: the affected components (`album-simple-view`, `album-item-view`,
`album-detail-view`, `artist-simple-view`, `artist-detail-view`,
`wishlist-item-simple-view`) are `@Input()`-driven presentational components extending
`BaseComponent`, with `ChangeDetectionStrategy.OnPush` and no store of their own. Assigning the
imported function to a `protected readonly` field is the smallest change that keeps the order out of
the template — Angular templates may read `protected` members, the function is pure, and the call is
cheaper than the string concatenation it replaces.

**Alternatives considered**:

| Alternative | Rejected because |
|---|---|
| A `CoverUrlPipe` in `libs/ui` | Three domain libraries would gain a dependency on `libs/ui` and an entry in every `imports` array, for a call that is already one expression. Pipes earn their keep when the transform is expensive or widely reused in one template; neither holds. |
| A `computed()` per component | Would mean converting `@Input()` to signal inputs in six components — a refactor the ticket did not ask for, touching change detection in the album and artist views. Out of scope (spec Assumptions). |
| Leave the expression in the template, just reorder it | The duplication D1 removes would stay in seven HTML files, where no unit test looks. |

---

## D4 — The two placeholder strings are replaced, and their keys renamed

**Decision**: replace the text behind `ui.artistForm.used-when-no-main` and
`ui.albumForm.used-when-no-cover` in `hu.json`, `en.json` and `de.json`, **and rename both keys** to
`ui.artistForm.url-wins-over-main` and `ui.albumForm.url-wins-over-cover`, updating the two
templates that reference them.

**Finding worth recording**: the spec and AC-5 call this a "hint under the field". In the code it is
the input's `placeholder` attribute — `artist-form.component.html:164` and
`album-form.component.html:260` — not a separate hint element. The text is what AC-5 is about, so
this is a naming mismatch in the spec, not a scope change: the same string is replaced either way.
AC-5's test asserts the rendered placeholder.

**Rationale for the rename**: `used-when-no-main` *is* the stale statement, encoded in the key.
Leaving the key while changing its value means the next reader of `hu.json` sees a key that
contradicts its own text — the same confusion that opened #60, one layer down. The rename is
mechanical: both keys have exactly one reference each.

**Alternatives considered**: changing only the values (leaves a lying key); adding a separate
`<small>` hint element below the input (new markup and new styling the ticket did not ask for, and
the placeholder would still say the wrong thing).

**Current strings, for the record** (`libs/core/i18n/assets/i18n/`):

| key | hu | en | de |
|---|---|---|---|
| `ui.artistForm.used-when-no-main` | "Akkor használjuk, ha nincs csatolt főkép" | "Used when no main image is attached" | "Wird genutzt, wenn kein Hauptbild angehängt ist" |
| `ui.albumForm.used-when-no-cover` | "Akkor használjuk, ha nincs csatolt borítókép" | "Used when no cover image is attached" | "Wird genutzt, wenn kein Coverbild angehängt ist" |

---

## D5 — The admin dashboard's "header attached" indicator stays as it is

**Question raised by reading the inventory**: `issue-sync.md` lists
`admin-dashboard.mapper.ts:70` among the nine sites that ignore the entered URL. The line is

```ts
{ labelKey: 'admin.field.headerImage', isFilled: (artist) => !!artist.headerImage?.filePath }
```

**Decision**: leave it unchanged.

**Rationale**: this is not a surface that draws a picture — it is the admin's completeness checklist,
and the question it asks is "does this artist have a **header image attached**". Routing it through
`toArtistHeaderUrl` would mark the row filled for every artist that has any photo URL, because the
header rule falls back to the main picture (FR-006 / `music-view.mapper.ts:105`). That would empty
the admin's to-do list of exactly the work it exists to track. The neighbouring row at line 66
already goes through `toArtistView(artist).imageUrl`, so the *photo* check picks up the new order
for free.

**Consequence for the spec, stated plainly**: SC-002 says the entered picture appears on "all 9
surfaces that today ignore it". With this decision the number is **8 rendering surfaces (9 code
sites — `wishlist-item-simple-view.component.html` has two)**, plus one admin indicator left
deliberately on the attachment. SC-002's intent — "no surface of the app renders an empty frame for
an entry whose only picture is an entered URL" — is met in full, because the indicator renders no
frame. `/speckit-tasks` should carry this wording; the maintainer may overrule it, in which case the
single edit is a one-line change.

**Alternatives considered**: route it through `toArtistHeaderUrl` (destroys the checklist's
usefulness, as above); split the row into "header attached" and "header renders" (new admin UI, out
of scope).

---

## D6 — FR-007 is proven by assertions added to the two form specs

**Carried in from**: `checklists/requirements.md` → "FR-007 has no dedicated test. The plan should
decide whether a regression test is worth adding."

**Decision**: no new test file. Two things already being written cover it:

1. The rule's own spec asserts the attachment is still consulted — "no entered URL, attachment
   present → the attachment" is a required case in
   [contracts/image-url-rule.md](./contracts/image-url-rule.md). That proves attachments are not
   dropped from the order.
2. `artist-form.component.spec.ts` and `album-form.component.spec.ts` are already touched for AC-5.
   Each gains one assertion that the document-autocomplete control (`headerImage` / `mainImage` /
   `coverImage`) is still present in the form group and still rendered. That proves attachments stay
   selectable.

**Rationale**: FR-007 records a deliberate *non*-change. A dedicated test file for "we did not
remove this" is weaker than the two assertions above, which sit where a future removal would
actually be noticed. Nothing in this feature touches `album-util.service.impl.ts`,
`artist-util.service.impl.ts`, the document search or Storage, so "stored" needs no new proof beyond
the untouched existing suites.

---

## D7 — Verification needs no deploy, and no live write

**Carried in from**: `checklists/requirements.md` → "AC-4 needs a functions deploy to be
observable."

**Decision**: the feature is verified entirely by `unit` and `functions` Jest suites plus an
optional read-only manual pass against the dev project. The functions deploy is handed to the
maintainer in the PR description and is not part of the work.

**Rationale**: constitution VIII — nobody deploys without the maintainer's go-ahead. Constitution XI
accepts the `functions` level as proof of AC-4, and `npx nx test functions` runs the composer and
the badge-facts collector with fixture documents, so the order is provable without a deployed
function. Constitution XIX permits reading dev data; the optional manual pass opens an artist and an
album that already have both an attachment and an entered URL and writes nothing.

**Note for the PR**: until the deploy happens, a freshly generated badge or daily question keeps the
old order. Already-generated artefacts keep their picture regardless — the spec says so in Edge
Cases.

---

## D8 — Two pre-existing oddities found at the sites, left for later tickets

Both are at sites this feature touches, so they are named here rather than silently fixed or
silently inherited (constitution II: a workaround that hides a symptom is not a fix, and an
unrelated fix smuggled into a ticket is not either).

1. **`album-simple-view.component.html:1`** — `[style.background]="album.coverImage?.filePath"`
   binds a bare URL to `background`, with no `url(...)` wrapper, so the background has never drawn.
   This feature routes the value through the rule (it is a listed B-site) but keeps the binding
   shape: adding `url('…')` would make a background appear where none has ever appeared, which is a
   visual change the ticket did not ask for. **→ worth its own issue.**
2. **`daily-question-compose.ts:181`** — the comment states the old order as the intended one and
   points at `music-view.mapper`. It is replaced with the new order as part of T3; it is listed here
   because it is the only *written* statement of the old rule in the source, and a plan that
   reverses the rule while leaving its documentation standing would be the stale-hint defect
   (FR-005) all over again, one file down.

Out of scope by the maintainer's gate decision 4 and therefore **not** investigated here: the red
outline on the field and the broken preview in the issue's screenshot.
