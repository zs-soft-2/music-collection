# Verification: Honest feedback on the image URL field — issue #80 — 80-image-url-field-feedback @ d8ebddc0 — 2026-11-04

**Result**: GAPS  (3 ✅ · 2 ⚠️ · 0 ❌)

The code and automated tests are complete. Two acceptance criteria still need a manual check: AC-1 needs a dev deploy, and AC-5 needs an admin login.

## Acceptance criteria

| AC | Criterion | Verdict | Evidence |
|---|---|---|---|
| AC-1 | The artist form previews a loading address, with no message | ⚠️ not verified: needs deploy | Unit part passes: `AC-1` in `libs/domain/music/artist/src/lib/form/component/artist-form.component.spec.ts`. The agreed manual check on dev (T017, SC-001) has not run. It is the one that confirms the content-policy theory on the real form. |
| AC-2 | A failing address shows a hu/en/de message instead of a broken image; the value stays and the form can be saved | ✅ | `AC-2` in `artist-form.component.spec.ts` passes: the form is valid and Save is enabled before and after the error. `dictionaries.spec.ts` passes for the key in all three languages. Code: `libs/ui/src/lib/image-url-preview/image-url-preview.component.html:1`. |
| AC-3 | The same on the album `coverImageUrl` field | ✅ | `AC-3` in `libs/domain/music/album/src/lib/form/component/album-form.component.spec.ts` passes. Code: `libs/domain/music/album/src/lib/form/component/album-form.component.html:263`. |
| AC-4 | A new loading address removes the message and shows the picture | ✅ | `AC-4` passes in both form specs. Code: the `linkedSignal` at `libs/ui/src/lib/image-url-preview/image-url-preview.component.ts:37`. A throwaway spec with `provideZonelessChangeDetection()` on the artist form also passed. |
| AC-5 | A focused field with a valid value is not outlined in red | ⚠️ partly met: needs admin login | Unit part passes: `apps/music-collection/src/app/theme/music-preset.spec.ts` (its test names do not carry the `AC-5` tag). Measured on the local build, keyboard focus state, home page search: `rgb(0, 212, 255)` dark, `rgb(0, 145, 179)` light (`verification/focus-home-search-*.png`). The agreed checks on the artist and copy details forms (T016, SC-003) have not run. |

Measurements and the open checklists are in [manual-checks.md](./manual-checks.md).

## Regressions

| Test | Baseline | Now |
|---|---|---|
| `domain-artist` | 79/79 | 82/82 (+3 new) |
| `domain-album` | 57/57 | 59/59 (+2 new) |
| `domain-label` | 16/16 | 16/16 |
| `ui` | 105/105 | 114/114 (+9 new) |
| `core-i18n` | 50/50 | 50/50 |
| `music-collection` | 1551/1551 | 1554/1554 (+3 new) |
| `npx nx run-many -t test --exclude=firestore-rules,functions` | not recorded | Passes, 35 projects |
| `npm run test:rules` | not recorded | 384/384 (before the last template fix, which touches no rules) |
| `npm run lint` and `run-many -t lint` on `ui`, `domain-artist`, `domain-album` | not recorded | Pass |
| `npm run verify:csp` on a fresh dev build | not recorded | Passes |

No regression. Two runs produced a result that did not repeat, see Open items.

## Constitution

No violations. The check covered `git diff dev...HEAD` against every principle and `.specify/kit/stack-angular-firebase.md`.

| Principle | Result |
|---|---|
| I Approved criteria | ✅ AC list identical to the one approved in `issue-sync.md` |
| II Root cause | ⚠️ open until AC-1: the focus fix changes the token that caused the red outline, while the policy theory for the broken preview is still unconfirmed on the real form |
| III Test proves the change | ✅ for what has run: T002, T003, T004 and T010 failed for the expected reason first. AC-1 and AC-5 are waiting for their recorded manual checks. |
| IV Ticket | ✅ Both commit subjects end with `(#80)` |
| V, VI, VII Layers and store | ✅ n/a: view state of one element, with no data access or business rule |
| VIII No deploy | ✅ Nothing was deployed |
| IX, X Library boundaries | ✅ Lint passes |
| XI Test levels, XII Checks | ✅ |
| XV CSP | ✅ No new origin |
| XIII, XIV, XVI–XXI | ✅ n/a: not touched |

## Code review

The `code-review` skill reported no blocking finding. Reviewed by reading the code; the token claims in item 1 were also checked against the Aura preset.

| # | Finding | Location | Assessment |
|---|---|---|---|
| 1 | A checked, focused checkbox or radio keeps a red border (`checkedFocusBorderColor`) | `apps/music-collection/src/app/theme/music-preset.ts:57` | Non-blocking. Decided and recorded in research R-4, as the colour of the checked state. An unchecked one uses the grey field border. The wording of FR-007 is broad, so the maintainer may want another look. |
| 2 | Each half-typed value can repeat the message in the live region | `libs/ui/src/lib/image-url-preview/image-url-preview.component.html:1` | Non-blocking. The spec accepts the message while typing; the repeated announcement is not discussed there. |
| 3 | After a temporary network failure the same address is not retried until it changes or the form reopens | `libs/ui/src/lib/image-url-preview/image-url-preview.component.ts:37` | Non-blocking, in line with the spec's edge cases. |
| 4 | No automated test for an address applied from the data suggestions | `libs/domain/music/artist/src/lib/form/component/artist-form.component.spec.ts` | Non-blocking. Covered by the open T016 check. |
| 5 | The preset test compares the token's text, not its use by the fields | `apps/music-collection/src/app/theme/music-preset.spec.ts:19` | Non-blocking. The resolved value was measured once by hand (manual-checks.md); a later theme upgrade would not be caught. |
| 6 | The empty preview adds a 0.375rem gap under the field | `libs/domain/music/album/src/lib/form/component/album-form.component.html:263`, same on the artist form | Cosmetic. |
| 7 | Cleanups: the changed outline rules duplicate the global `:focus-visible` rule; `.message` duplicates the field error style; two nested `@if` could be one | `apps/music-collection/src/app/page/album/album-page.component.scss:288`, `libs/ui/src/lib/image-url-preview/image-url-preview.component.scss:6`, `.html:2` | Optional. Research R-5 rejected removing the rules, because that changes the offsets. |

## Open items

- **T016 (unticked):** the manual checks on real forms need an admin login. AC-5 depends on it, and AC-2, AC-3 and AC-4 get extra confidence from it.
- **T017 (unticked):** the dev check needs the maintainer's go-ahead for `npm run deploy:dev`. AC-1 depends on it. If the picture still fails there, #80 goes back to investigation.
- **Two results that did not repeat:** `artist-albums.service.spec.ts` once reported "Test suite failed to run", and `domain-label` once reported 15 tests instead of 16. Neither error text was kept, and every later run passed. The label code is unchanged on this branch. The cause is unknown, so a link to this change cannot be fully ruled out.
- **Changed since the spec:** nothing. The issue was last updated on 2026-11-02 and has no comments.
- **Known small documentation errors:** `plan.md:87` and `:91` still say "swaps the import"; the `quickstart.md:16` command omits `core-i18n`.

## PR summary

### Summary

Explains the two symptoms from #80 and removes what still misleads on the form.

- The red outline was the focus style, not a validation failure. Form fields now use the theme's cyan focus colour across the application, while red stays the primary colour.
- The broken preview very probably came from the content policy of that day, since fixed. The artist photo and album cover fields now show a translated message when a picture really cannot load. The value stays and the form can still be saved.

No stored data, validation, content policy or Cloud Function changes.

### Acceptance criteria

| AC | Status | Evidence |
|---|---|---|
| AC-1 | ⚠️ needs dev deploy | Unit test passes; manual check open |
| AC-2 | ✅ | `artist-form.component.spec.ts`, `dictionaries.spec.ts` |
| AC-3 | ✅ | `album-form.component.spec.ts` |
| AC-4 | ✅ | Both form specs |
| AC-5 | ⚠️ needs admin login | `music-preset.spec.ts`, home page measurement; form checks open |

Closes #80
