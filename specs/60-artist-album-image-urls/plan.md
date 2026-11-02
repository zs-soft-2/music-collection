# Implementation Plan: Entered image URLs take precedence

**Branch**: `60-artist-album-image-urls` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/60-artist-album-image-urls/spec.md`

**Issue**: [#60](https://github.com/zs-soft-2/music-collection/issues/60) · **Pre-work**: [issue-sync.md](./issue-sync.md)

## Summary

An entered image URL must win over an attached image document, everywhere an artist's or an album's
picture is drawn — with one exception, the artist's attached header image (FR-006).

The order is spelled out 25 times across mappers, components, stores and two Cloud Functions. The
technical approach is therefore **not** 25 independent edits: one pure rule module is added to
`libs/common/engine` and every browser-side site delegates to it, with a second, deliberately
mirrored copy under `apps/functions` because the functions may not import workspace libraries
(constitution XIII). After the change there are exactly **two** places in the repository that know
the order, and both are covered by their own unit tests.

Nothing about storage changes: attached documents stay stored, searchable and selectable (FR-007).
No Firestore write, no rules change, no new external origin.

## Technical Context

**Language/Version**: TypeScript 5.x, Angular 22.2 (standalone, zoneless, signals), Node 22 for the
Cloud Functions

**Primary Dependencies**: Nx monorepo, `@ngrx/signals`, PrimeNG (`p-image`), Transloco, Firebase
(Firestore / Functions). The new rule module depends on nothing — it is a pure function file.

**Storage**: Firestore. Read-only for this feature; the `coverImage` / `mainImage` / `headerImage`
document references and the `coverImageUrl` / `imageUrl` string fields all already exist on the
`album` and `artist` documents. No migration, no backfill, no script.

**Testing**: Jest per Nx project (`unit`), Jest for `apps/functions` (`functions`). Levels and
commands come from `.specify/project/verify.md`.

**Target Platform**: Browser (the `music-collection` app) + Cloud Functions (codebase `security`,
`europe-west4`)

**Project Type**: Nx monorepo — Angular web app, shared libraries, and a self-contained Cloud
Functions project

**Performance Goals**: none specific. The rule is three `||` operators; the template sites call it
once per change-detection pass on an already `OnPush` component, which is cheaper than the string
concatenation it replaces.

**Constraints**:

- `platform:agnostic` libraries must not import Angular, PrimeNG or Firebase (constitution IX), so
  the rule module uses structural types instead of importing `@music-collection/api`.
- `apps/functions` must not import from `libs/` (constitution XIII), so the server copy is a
  separate file — see Complexity Tracking.
- The server-side half (AC-4) has no effect until the functions are deployed, which is the
  maintainer's call (constitution VIII). The plan stops at green `npx nx test functions`.

**Scale/Scope**: 25 code sites across 9 Nx projects. 16 reverse an existing order, 9 gain the
entered URL for the first time, 1 site (`music-view.mapper.ts:105`, the artist header) is
deliberately left alone, and 1 further site (the admin dashboard's "header attached" indicator) is
deliberately left alone — see [research.md](./research.md) D5. Plus 6 translation strings (2 keys ×
3 languages) and 4 new or extended test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Verdict | Note |
|---|---|---|---|
| I | Approved acceptance criteria before implementation | ✅ pass | AC-1…AC-6 approved by the maintainer on 2026-11-01 (`issue-sync.md`). No open `[NEEDS DECISION]`. |
| II | Root cause over workaround | ✅ pass | The order itself is changed, and moved to one place. No guard, no retry, no special case. The deliberate *absence* of a fallback after a failed load (spec Edge Cases) is a specified behaviour, not a workaround. |
| III | A test proves the change | ✅ pass | The rule module and its server mirror each get a unit test that fails before the change; every AC names its test file. See [quickstart.md](./quickstart.md). |
| IV | No change without a ticket | ✅ pass | Issue #60; branch `60-artist-album-image-urls`; every commit references `(#60)`. |
| V | A new capability reaches every layer | ➖ n/a | No new data capability: no model, effect, store method or repository query is added. The feature changes a presentation derivation over fields that already exist. |
| VI | Layer chain without skipping | ✅ pass | No layer is skipped or added. The rule is a pure function, not data access; no component gains a repository or a service. |
| VII | Business logic in the store | ✅ pass — the gate that shaped the design | `issue-sync.md` flagged the order as duplicated across mappers, components and stores. The plan removes the duplication: one rule, 25 delegating call sites. Templates reach it through a `protected` component member rather than re-spelling the expression. See [research.md](./research.md) D1 and D3. |
| VIII | No deploy without the maintainer | ⚠️ noted, not a violation | AC-4 only takes effect after a functions deploy. The plan produces the code and a green `npx nx test functions`; it does not deploy, and the PR says so. |
| IX | Library boundaries by `platform:` tags | ✅ pass | `libs/common/engine` is `platform:agnostic`; the new module imports nothing. Structural types keep `@music-collection/api` (`platform:angular`) out. `npm run lint` enforces it. |
| X | Library boundaries by `type:` tags | ✅ pass | The module is `type:engine`. Every consumer — `ui`, the four `type:domain` libs, `music-collection-core` (`type:core`), the app (`type:app`) — is allowed to depend on `type:engine`. |
| XI | Every acceptance criterion names its test level | ✅ pass | `unit` for AC-1, AC-2, AC-3, AC-5, AC-6; `functions` for AC-4. |
| XII | The checks pass before review | ✅ pass | `npm test`, `npm run test:rules`, `npm run lint`, `npm run verify:csp` all run before the PR. Note: those four scripts only cover the `music-collection` app project, so the quickstart adds the workspace-wide `run-many` variants — this change lives mostly in libraries. See [quickstart.md](./quickstart.md). |
| XIII | `apps/functions` is a project of its own | ✅ pass, at a cost | The server half is a separate file under `apps/functions/src`, never an import from `libs/`. The duplication is recorded in Complexity Tracking. Precedent: `apps/functions/src/cover-color.ts` mirrors `toCoverColor`. |
| XIV | Security rules change with a test | ➖ n/a | `firestore.rules` and `storage.rules` are untouched. |
| XV | New origins go through the CSP | ➖ n/a | No new origin. `issue-sync.md` C4 verified `thumb.wikimedia.org` is already allowed by `firebase.json:44` (commit `34048fcc`). `npm run verify:csp` still runs as a regression check (XII). |
| XVI | Private data leaves the user document only as a sum | ➖ n/a | No collector-private field is read or published. |
| XVII | Firestore writes go through the wrappers | ➖ n/a | The feature performs no write. |
| XVIII | The App Check debug token is for localhost only | ➖ n/a | Untouched. |
| XIX | Verification runs on the dev project, carefully | ✅ pass | The optional manual pass reads dev data only and writes nothing. No seeding, no `--confirm` script, no `tofu apply`. |
| XX | Every model call goes through the AI gateway | ➖ n/a | `music-collection-badge-facts.ts` only *collects* the facts; the model call downstream is unchanged and still goes through the gateway. |
| XXI | Deleting from the catalog: the client asks, the server decides | ➖ n/a | FR-007 keeps every attachment. Nothing is deleted or archived. |

**Gate result**: pass. No unjustified violation. One `⚠️ noted` (VIII) which is a hand-off to the
maintainer, not a design problem, and one justified duplication in Complexity Tracking.

### Post-design re-check (after Phase 1)

Re-evaluated against [data-model.md](./data-model.md),
[contracts/image-url-rule.md](./contracts/image-url-rule.md) and [quickstart.md](./quickstart.md):
unchanged. The design added no dependency, no layer, no write and no origin. VII moved from the
⚠️ it carried in `issue-sync.md` to ✅ precisely because the design answered it. The one new
question the design surfaced — the admin dashboard's "header attached" indicator — is resolved as an
assumption in [research.md](./research.md) D5 and narrows SC-002's wording rather than any
principle.

## Project Structure

### Documentation (this feature)

```text
specs/60-artist-album-image-urls/
├── spec.md                      # input (/speckit-specify)
├── issue-sync.md                # input (/speckit-issue-sync)
├── checklists/requirements.md   # input (/speckit-checklist)
├── plan.md                      # this file
├── research.md                  # Phase 0 output — the design decisions
├── data-model.md                # Phase 1 output — the fields and the order
├── contracts/
│   └── image-url-rule.md        # Phase 1 output — the shared rule's contract
├── quickstart.md                # Phase 1 output — how to prove it works
└── tasks.md                     # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
libs/common/engine/src/                       # type:engine, platform:agnostic
├── lib/image-url.ts                          # NEW — the one rule (browser side)
├── lib/image-url.spec.ts                     # NEW — unit test for the rule
└── index.ts                                  # export the new module

libs/ui/src/lib/music-view/                   # type:ui
├── music-view.mapper.ts                      # 3 sites delegate; header (:105) keeps its order
└── music-view.mapper.spec.ts                 # NEW — AC-1, AC-2, AC-6

libs/domain/music/                            # type:domain
├── artist/src/lib/
│   ├── collection/component/table/artist-table.component.ts      # :62  A-site
│   ├── view/component/simple/artist-simple-view.component.{ts,html}  # :26  B-site
│   ├── detail/component/artist-detail-view.component.{ts,html}   # :8   B-site → header rule
│   └── form/component/artist-form.component.html                 # placeholder key
├── album/src/lib/
│   ├── collection/component/table/album-table.component.ts       # :78  A-site
│   ├── view/simple/album-simple-view.component.{ts,html}         # :1 B-site, :3 A-site
│   ├── view/item/album-item-view.component.{ts,html}             # :5   A-site
│   ├── view/detail/album-detail-view.component.{ts,html}         # :14  A-site
│   └── form/component/album-form.component.html                  # placeholder key
├── release/src/lib/collection/component/table/release-table.component.ts        # :81 A-site
├── collection-item/src/lib/collection/component/table/collection-item-table.component.ts  # :65
└── wishlist-item/src/lib/
    ├── collection/component/table/wishlist-item-table.component.ts             # :64 B-site
    └── view/component/simple/wishlist-item-simple-view.component.{ts,html}     # :12,:56 B-sites

libs/domain/music/music-collection/core/src/lib/music-collection.mapper.ts      # :36 A-site
libs/core/i18n/assets/i18n/{hu,en,de}.json                                      # 2 keys × 3 files

apps/music-collection/src/app/
├── shared/entity-view/pressing-row.ts                            # :45  A-site
├── shared/player/player.store.ts                                 # :289, :869 A-sites
├── page/wishlist/wishlist-page.store.ts                          # :109 B-site
├── page/wishlist-item/wishlist-item-page.store.ts                # :54  B-site
├── page/admin/dashboard/admin-dashboard.mapper.ts                # :70  LEFT AS IS — research D5
└── data/collector-profile/collector-profile.model.ts             # :442 B-site

apps/functions/src/                            # its own npm project, never imports libs/
├── catalog-image-url.ts                       # NEW — the mirrored rule (server side)
├── catalog-image-url.spec.ts                  # NEW — unit test for the mirror
├── music-collection-badge-facts.ts            # :74, :88 delegate
├── music-collection-badge-facts.spec.ts       # extend — AC-4
├── daily-question-compose.ts                  # :169, :183 delegate; stale comment replaced
└── daily-question-compose.spec.ts             # extend — AC-4
```

**Structure Decision**: the existing Nx layout is kept as is. The only structural addition is a
pure rule module in the already-existing `libs/common/engine` (joining `catalog-name.ts`,
`catalog-number.ts`, `catalog-value.ts`, `performance-log.ts`), plus its mandated mirror in
`apps/functions/src` (joining the same pattern set by `cover-color.ts` and `country-name.ts`). No
new Nx project, no new path alias, no new tag.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| The order is implemented twice: `libs/common/engine/src/lib/image-url.ts` and `apps/functions/src/catalog-image-url.ts` | Constitution XIII: `apps/functions` is its own npm project compiled with `rootDir: src` and is built by Cloud Build from that directory alone. An import from `libs/` type-checks locally and breaks the deploy. | Sharing one file would mean either a path alias into `libs/` (breaks the deploy — the exact failure XIII exists to prevent) or promoting the rule to a published package (a release cycle and a version bump for three `||` operators). Both cost more than one mirrored 30-line file whose own test pins the same table of cases. `cover-color.ts` and `country-name.ts` already set this precedent in the same directory. |
| The two copies can drift | Nothing in the build links them. | Mitigated, not solved: both files carry a comment naming the other as its twin, and `contracts/image-url-rule.md` is the single written table of cases that both test suites assert. A lint rule that compares two files does not exist in this toolchain, and a shared fixture would need the shared import that XIII forbids. |
