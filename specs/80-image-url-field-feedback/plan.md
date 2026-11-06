# Implementation Plan: Honest feedback on the image URL field

**Branch**: `80-image-url-field-feedback` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/80-image-url-field-feedback/spec.md`

**Issue**: [#80](https://github.com/zs-soft-2/music-collection/issues/80) · **Pre-work**: [issue-sync.md](./issue-sync.md)

## Summary

Two independent changes to the client:

1. **Failed preview (P1).** A new `mc-image-url-preview` component wraps the existing `p-image`. It
   shows the picture while it loads, and a translated message once the load fails. The artist photo
   and album cover fields delegate to it. The outcome is reset whenever the address changes.
2. **Focus colour (P2).** One token override moves every PrimeNG form field to the theme's cyan
   focus colour. 16 hand-built rules that set a red focus on a field or choice card get the same
   cyan. The primary colour itself stays red.

No stored data, validation, content policy or Cloud Function changes.

## Technical Context

**Language/Version**: TypeScript 5.x, Angular 22 (standalone, zoneless, signals)

**Primary Dependencies**: Nx monorepo, PrimeNG 22 (`p-image`), `@primeuix/themes` (Aura preset),
Transloco

**Storage**: None. The `imageUrl` and `coverImageUrl` fields are read as they are and saved unchanged.

**Testing**: Jest per Nx project (`unit`) and recorded `manual` checks, as `.specify/project/verify.md` defines them

**Target Platform**: Browser (the `music-collection` app)

**Project Type**: Nx monorepo, Angular web app with shared libraries

**Performance Goals**: `primeng/image` stays out of the main bundle (R-3)

**Constraints**: Zoneless change detection. `nx serve` sends no CSP, so the content policy can only be checked on deployed hosting.

**Scale/Scope**: 1 new component, 2 form templates, 3 translation files, 1 theme token, 16 style rules in 12 files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | How this plan meets it |
|---|---|---|
| I Approved criteria | ✅ | AC-1 to AC-5 approved at the sync gate; no open decision |
| II Root cause | ✅ | The message does not replace the cause: AC-1 confirms the policy theory on the real form, and a failure there sends the ticket back to investigation. The focus fix changes the token that causes the red outline. |
| III Test proves the change | ✅ | Unit tests are written first and must fail before the change. AC-1 and AC-5 also get recorded manual checks. |
| IV Ticket | ✅ | Branch `80-…`; every commit carries `(#80)` |
| V, VI, VII Layers and store | ✅ n/a | The preview outcome is view state of one element. It has no data access, business rule or validation, so it needs no store (FR-004). |
| VIII No deploy | ⚠️ gate | SC-001 needs a dev hosting and client deploy, which waits for the maintainer's go-ahead |
| IX, X Library boundaries | ✅ | New code is in `libs/ui` (`type:ui`), used by `type:domain`, importing i18n (`type:api`). All are allowed. |
| XI Test levels | ✅ | Each AC names `unit` and/or `manual` |
| XII Checks before review | ✅ | `npm test`, `npm run test:rules`, `npm run lint`, `npm run verify:csp` |
| XV CSP | ✅ n/a | No new origin |
| XIII, XIV, XVI–XXI | ✅ n/a | No functions, rules, private data, Firestore writes, App Check, model calls or deletion involved |

**Post-design re-check**: unchanged, no violations.

## Project Structure

### Documentation (this feature)

```text
specs/80-image-url-field-feedback/
├── spec.md
├── issue-sync.md
├── plan.md                        # This file
├── research.md                    # Decisions R-1 to R-6
├── data-model.md                  # View state and the 16 focus rules
├── quickstart.md                  # How to validate
├── contracts/
│   └── image-url-preview.md       # The component's UI contract
└── tasks.md                       # Created by /speckit-tasks
```

### Source Code (repository root)

```text
libs/ui/src/lib/image-url-preview/             # NEW: component, template, styles, spec, index
tsconfig.base.json                             # NEW alias: @music-collection/ui/image-url-preview
libs/domain/music/artist/src/lib/form/component/
├── artist-form.component.html                 # delegates the photo preview
├── artist-form.component.ts                   # swaps the import
└── artist-form.component.spec.ts              # AC-1, AC-2, AC-4
libs/domain/music/album/src/lib/form/component/
├── album-form.component.html                  # delegates the cover preview
├── album-form.component.ts                    # swaps the import
└── album-form.component.spec.ts               # AC-3, AC-4
libs/core/i18n/assets/i18n/{hu,en,de}.json     # the message
apps/music-collection/src/app/theme/
├── music-preset.ts                            # the form field focus token
└── music-preset.spec.ts                       # NEW: AC-5 unit part
apps/music-collection/src/app/**               # the 16 rules listed in data-model.md
```

**Structure Decision**: the preview gets its own component in `libs/ui`, because it has its own
state and two domain libraries need it. Importing it through a subpath alias keeps `primeng/image`
out of the main bundle, as `@music-collection/ui/music-view` does for its code.

## Complexity Tracking

No constitution violations to justify.
