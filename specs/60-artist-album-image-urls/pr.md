# Entered image URLs take precedence (#60)

Closes #60.

An entered image URL now wins over an attached image document everywhere an artist's or an album's
picture is drawn — with one deliberate exception, the artist's attached header image (FR-006).

## What changed, and why it is not 25 edits

The order was spelled out 25 times across mappers, components, stores and two Cloud Functions, and
the inventory in [data-model.md](./data-model.md) is itself the evidence that the duplication had
already drifted: 16 sites consulted the entered URL, 9 had forgotten to. So the order moved into one
place instead of being reversed in 25:

- **`libs/common/engine/src/lib/image-url.ts`** (new) — `toArtistImageUrl`, `toArtistHeaderUrl`,
  `toAlbumCoverUrl`. Pure, total, imports nothing (`platform:agnostic`, so the types are structural
  rather than `@music-collection/api`).
- **`apps/functions/src/catalog-image-url.ts`** (new) — the album half, mirrored, because
  `apps/functions` may not import from `libs/` (constitution XIII). Precedent in the same directory:
  `cover-color.ts`, `country-name.ts`.

After this change exactly **two** places in the repository know the order, each with its own unit
test, and `contracts/image-url-rule.md` is the one written statement both suites assert.

The new order:

| Derived value | After | Before |
|---|---|---|
| artist picture | `imageUrl` → `mainImage.filePath` → `discogs.imageUrl` → `null` | `mainImage.filePath` → `imageUrl` → `discogs.imageUrl` → `null` |
| artist header | `headerImage.filePath` → *artist picture* | `headerImage.filePath` → `imageUrl` |
| album cover | `coverImageUrl` → `coverImage.filePath` → `null` | `coverImage.filePath` → `coverImageUrl` → `null` |

Nothing about storage changed: attached documents stay stored, searchable and selectable (FR-007).
No Firestore write, no schema change, no index, no rules change, no new external origin.

## Acceptance criteria → passing tests

| AC | Level | Proven by |
|---|---|---|
| **AC-1** — entered photo wins over the attached main image | `unit` | `libs/ui/src/lib/music-view/music-view.mapper.spec.ts` (case 10), `libs/domain/music/artist/.../artist-table.component.spec.ts` |
| **AC-2** — entered cover wins over the attached cover | `unit` | `libs/ui/src/lib/music-view/music-view.mapper.spec.ts` (case 1), `libs/domain/music/album/.../album-table.component.spec.ts` |
| **AC-3** — the surfaces that ignored the field pick it up | `unit` | `libs/domain/music/artist/.../artist-simple-view.component.spec.ts`, `libs/domain/music/wishlist-item/.../wishlist-item-table.component.spec.ts`, `apps/music-collection/src/app/data/collector-profile/collector-profile.model.spec.ts` |
| **AC-4** — the server follows the same order | `functions` | `apps/functions/src/music-collection-badge-facts.spec.ts`, `apps/functions/src/daily-question-compose.spec.ts` |
| **AC-5** — the form's placeholder states the order, in hu/en/de | `unit` | `libs/domain/music/artist/.../artist-form.component.spec.ts`, `libs/domain/music/album/.../album-form.component.spec.ts`, plus `libs/core/i18n/src/lib/dictionaries.spec.ts` keeping the three dictionaries in step |
| **AC-6** — the attached header keeps precedence | `unit` | `libs/ui/src/lib/music-view/music-view.mapper.spec.ts` (case 16) |

The rule's own suite (`libs/common/engine/src/lib/image-url.spec.ts`, 33 tests) and its server mirror
(`apps/functions/src/catalog-image-url.spec.ts`, 28 tests) assert the full case table of
[contracts/image-url-rule.md](./contracts/image-url-rule.md) §3. Cases 1–8 are asserted in **both**
— that overlap is the drift guard, verified case by case (T048: no drift).

Each test was watched fail against the old order before the source changed (constitution III).

### Checks

| Check | Result |
|---|---|
| `npx nx run-many -t test --exclude=firestore-rules,functions` | green — 35 projects |
| `npx nx test functions` | green — 42 suites, 677 tests |
| `npx nx run-many -t lint` | green — 38 projects, **no** `@nx/enforce-module-boundaries` error |
| `npm test` | green — 137 suites, 1551 tests |
| `npm run test:rules` | green — 21 suites, 384 tests (regression check; the rules are untouched) |
| `npm run lint` | green — 0 errors |
| `npm run build:dev` → `verify:csp` | green — *"The hosting CSP matches the built page: 2 inline things hashed, nothing left over."* |
| `tsc --project apps/functions/tsconfig.app.json` (via `nx build functions`) | clean |

The two projects that gain a *new* dependency on `common-engine` — `domain-wishlist-item` and
`domain-collection-item` (`type:domain → type:engine`, allowed) — both lint clean.

## Three things for the maintainer to decide

### 1. The functions deploy is pending your go-ahead (constitution VIII)

**AC-4 is not observable in the product until `apps/functions` is deployed.** This PR produces the
code and a green `functions` suite; it deploys nothing. Until the deploy happens, a freshly
generated badge or daily question keeps the old order. Already-generated artefacts keep their picture
regardless — the spec says so in Edge Cases.

### 2. SC-002's wording is narrowed — please accept or overrule

SC-002 says the entered picture appears on "all 9 surfaces that today ignore it". With
[research.md](./research.md) D5 the number is **8 rendering surfaces across 9 code sites**
(`wishlist-item-simple-view.component.html` has two bindings, horizontal and vertical), **plus one
admin indicator deliberately left on the attachment**:

`apps/music-collection/src/app/page/admin/dashboard/admin-dashboard.mapper.ts:70` still reads
`isFilled: (artist) => !!artist.headerImage?.filePath`. That row asks "is a header **attached**", not
"does a header render". Routing it through `toArtistHeaderUrl` would mark it filled for every artist
with any photo and empty the admin's to-do list of exactly the work it exists to track. The
neighbouring row already goes through `toArtistView(artist).imageUrl`, so the *photo* check picks up
the new order for free.

SC-002's intent — *no surface of the app renders an empty frame for an entry whose only picture is an
entered URL* — is met in full, because that indicator renders no frame. If you would rather have it
follow the rule, it is a one-line change.

### 3. Four follow-up findings, none of them fixed here

Named rather than silently fixed or silently inherited (constitution II cuts both ways: a workaround
that hides a symptom is not a fix, and an unrelated fix smuggled into a ticket is not one either).

1. **`album-simple-view.component.html:1` has never drawn a background.**
   `[style.background]` is bound to a bare URL with no `url(...)` wrapper. This PR routes the value
   through the rule (it is a listed B-site) but **keeps the binding shape**: adding the wrapper would
   make a background appear where none ever has, which this ticket did not ask for.
   **→ deserves its own issue.**
2. **A stale comment in `daily-question-compose.ts` was replaced** (not a follow-up, just worth
   naming): it stated the old order as the intended one and pointed at `music-view.mapper`. It was
   the only *written* statement of the old rule left in the source, so leaving it would have been the
   stale-hint defect (FR-005) all over again, one file down.
3. **`libs/domain/music/concert/src/lib/concert.repository.impl.ts:400`** derives an artist photo as
   `imageUrl → discogs.imageUrl` and never consults `mainImage`. It is **not** a Group A or Group B
   site — it already puts the entered address first, so it does not contradict FR-001 — but an artist
   whose only picture is an *attached* main image shows no photo in the act rows. Pre-existing, not in
   the 25-site inventory, and the inverse of the defect #60 describes. **→ worth its own issue.**
4. **`apps/functions/src/upcoming-release.ts:435`** has the same shape as (3), server-side. Fixing it
   would mean giving the mirrored server rule an artist half it does not currently need.
   **→ same issue as (3).**

Out of scope by your gate decision 4 and therefore not investigated: the red outline on the field and
the broken preview in the issue's screenshot.

## One deliberate duplication, recorded

`libs/common/engine/src/lib/image-url.ts` and `apps/functions/src/catalog-image-url.ts` are twins by
constitution XIII — `apps/functions` is its own npm project (`rootDir: src`) built by Cloud Build
from that directory alone, and an import from `libs/` type-checks locally and breaks the deploy.
Sharing one file would mean either a path alias into `libs/` (the exact failure XIII exists to
prevent) or publishing the rule as a package (a release cycle for three `||` operators).

The drift risk is mitigated, not solved: each file names the other as its twin in a comment,
`contracts/image-url-rule.md` is the arbiter, and cases 1–8 are asserted in both suites. If the rule
ever changes, the contract changes first.
