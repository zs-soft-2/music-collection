# Verification: Honest feedback on the image URL field — issue #80 — 80-image-url-field-feedback @ 7c2f28a2 — 2026-11-06

**Result**: GAPS  (3 ✅ · 2 ⚠️ · 0 ❌)

Code and automated tests are complete, and the dev deploy is out. AC-1 and AC-5 still wait for their checks on the real forms, which need an admin login (T016, and the form row of T017).

## Acceptance criteria

| AC | Criterion | Verdict | Evidence |
|---|---|---|---|
| AC-1 | The artist form previews a loading address, with no message | ⚠️ partly met: needs admin login | Unit test `AC-1` in `libs/domain/music/artist/src/lib/form/component/artist-form.component.spec.ts:258` passes. Dev hosting was deployed on 2026-11-06 from `7c2f28a2`, with the maintainer's go-ahead. On the deployed page, under its own CSP, the screenshot's address loads (1280 px wide). A control address on the same page is blocked with an `img-src` violation, so the policy is in force (manual-checks.md, "Dev check"). This confirms the content-policy theory on the deployed page. The check on the Razor artist form itself is still open. |
| AC-2 | A failing address shows a hu/en/de message instead of a broken image; the value stays and the form can be saved | ✅ | `AC-2` in `artist-form.component.spec.ts:265` passes: the form is valid and Save is enabled before and after the error. `dictionaries.spec.ts` passes for the key in all three languages. Code: `libs/ui/src/lib/image-url-preview/image-url-preview.component.html:1-19`. |
| AC-3 | The same on the album `coverImageUrl` field | ✅ | `AC-3` in `libs/domain/music/album/src/lib/form/component/album-form.component.spec.ts:258` passes. Code: `libs/domain/music/album/src/lib/form/component/album-form.component.html:263`. |
| AC-4 | A new loading address removes the message and shows the picture | ✅ | `AC-4` passes in both form specs (`artist-form.component.spec.ts:287`, `album-form.component.spec.ts:284`). Code: the `linkedSignal` in `libs/ui/src/lib/image-url-preview/image-url-preview.component.ts:39`. |
| AC-5 | A focused field with a valid value is not outlined in red | ⚠️ partly met: needs admin login | `apps/music-collection/src/app/theme/music-preset.spec.ts` passes, 3/3 (its test names do not carry the `AC-5` tag). Code: `music-preset.ts:57-59` and the 16 rules in data-model.md. The home page search measured on 2026-11-04: `rgb(0, 212, 255)` dark, `rgb(0, 145, 179)` light (`verification/focus-home-search-*.png`). The agreed checks on the artist and copy details forms (SC-003) are open. |

## Regressions

| Test | Baseline | Now (2026-11-06, `--runInBand`) |
|---|---|---|
| `domain-artist` | 79/79 | 82/82 (+3 new) |
| `domain-album` | 57/57 | 59/59 (+2 new) |
| `domain-label` | 16/16 | 16/16 |
| `ui` | 105/105 | 114/114 (+9 new) |
| `core-i18n` | 50/50 | 50/50 |
| `music-collection` | 1551/1551 | 1554/1554 (+3 new) |
| `npx nx run-many -t test --exclude=firestore-rules,functions` | not recorded | Every test that ran passed. In two parallel runs, 1–2 suites per run did not start because a jest worker crashed with `SIGSEGV`, a different suite each time: `network-layout.service.spec.ts` and one suite each in `domain-wishlist-item` and `domain-document`. Run serially, those projects pass (17/17, 28/28, 1554/1554). |
| `npm run test:rules` | not recorded | 384/384 |
| `run-many -t lint` on `ui`, `domain-artist`, `domain-album`, `music-collection` | not recorded | Pass |
| `npm run verify:csp` | not recorded | Passes |

No regression. The worker crashes are not test failures; they appear only when many projects run in parallel.

## Constitution

The branch is already merged into the local `dev` (`382465db`), so `git diff dev...HEAD` is empty. The check therefore covered the branch's own commits, `git diff main...HEAD` (3 commits), against every principle and `.specify/kit/stack-angular-firebase.md`.

| Principle | Result |
|---|---|
| I Approved criteria | ✅ AC list identical to the one approved in `issue-sync.md` |
| II Root cause | ⚠️ nearly closed: the deployed page loads the address under the current CSP, and the earlier CSP failed it. Confirmation on the real form is still open. |
| III Test proves the change | ✅ for automated ACs: T002, T003, T004 and T010 failed first. AC-1 and AC-5 are waiting for their recorded manual checks. ⚠️ minor: the `music-preset.spec.ts` test names lack the `AC-5` tag. |
| IV Ticket | ✅ All 3 commit subjects end with `(#80)` |
| V, VI, VII Layers and store | ✅ n/a: view state of one element, with no data access or business rule |
| VIII No deploy | ✅ The dev hosting deploy ran after the maintainer's explicit go-ahead on 2026-11-06 |
| IX, X Library boundaries | ✅ Lint passes |
| XI Test levels, XII Checks | ✅ |
| XV CSP | ✅ No new origin; `verify:csp` passes |
| XIX Verification on dev | ✅ Read-only: no data was written |
| XIII, XIV, XVI–XVIII, XX, XXI | ✅ n/a: not touched |

## Code review

`code-review` on `main...HEAD`. No blocking finding after assessment.

| # | Finding | Location | Assessment |
|---|---|---|---|
| 1 | The cyan focus border would hide the red `p-invalid` border of a focused PrimeNG field (`.p-inputtext:enabled:focus` beats `.p-inputtext.p-invalid`) | `apps/music-collection/src/app/theme/music-preset.ts:58` | The CSS claim is true, but it does not happen today: no template sets `[invalid]`, so no PrimeNG field gets `p-invalid`. The hand-built fields mark errors with `[aria-invalid='true'] { border-color }`, which the cyan outline leaves visible. A latent trap if `[invalid]` is adopted later. |
| 2 | A queued error of the earlier address could mark the new one as failed | `libs/ui/src/lib/image-url-preview/image-url-preview.component.ts:39` | Plausible, not reproduced. The HTML "update the image data" algorithm drops tasks of a superseded run before firing `error`, as research R-1 states. No test covers it. |
| 3 | Each half-typed value is tried, and the live region can announce the message repeatedly | `image-url-preview.component.html:13` | Non-blocking. Debounce is out of scope in the spec; the repeated announcement is not discussed there. |
| 4 | No retry of the same address after a transient failure | `image-url-preview.component.ts:39` | Non-blocking, in line with the spec's edge cases (a reopened form retries). |
| 5 | The binding reads `params.formGroup.value.*` in the template, which goes stale under zoneless for a programmatic `setValue` without a `params$` emission | `album-form.component.html:264`, `artist-form.component.html:168` | Non-blocking, and pre-existing: the old `@if` read the same expression. The data-suggestion path re-emits `params$`. Covered by the open T016 check "apply an address from the data suggestions". |
| 6 | About 15 hand-swapped focus rules, instead of one token or removing them in favour of the global `:focus-visible` | `collection-page.component.scss:103` and the others | Optional. Research R-5 rejected removing them, because that changes the offsets. |
| 7 | Some fields show focus with a 1px border, others with a 2px outline | `profile-shelves.component.ts:714` | Pre-existing; only the colour changed here. |
| 8 | `failed` is a public writable signal | `image-url-preview.component.ts:39` | Minor; could be exposed read-only. |

## Open items

- **T016 (unticked):** the manual checks on the real forms need an admin login: the 8 rows in manual-checks.md. AC-5 depends on them, and AC-2, AC-3 and AC-4 gain confidence.
- **T017 (unticked):** the deploy and the deployed-page check are done. The paste on the Razor artist form on dev is open (admin login). AC-1 depends on it.
- **Jest worker crashes:** `SIGSEGV` in parallel `run-many`, a different suite each time, every suite green serially. Not linked to this change, but not explained.
- **Changed since the spec:** nothing. The issue was last updated on 2026-11-02 and has no comments.
- **Merged before verification:** the branch is already in the local `dev` (`382465db`), so the PR would only record what is there.
- **Known small documentation errors:** `plan.md` still says "swaps the import"; the `quickstart.md` command omits `core-i18n`; the data-model line numbers for rows 1–11 are one lower than in T012.

## PR summary

### Summary

Explains the two symptoms from #80 and removes what still misleads on the form.

- The red outline was the focus style, not a validation failure. Form fields now use the theme's cyan focus colour across the application, while red stays the primary colour.
- The broken preview came from the content policy of that day, since fixed: on the deployed dev page the screenshot's address now loads. The artist photo and album cover fields now show a translated message when a picture really cannot load. The value stays and the form can still be saved.

No stored data, validation, content policy or Cloud Function changes.

### Acceptance criteria

| AC | Status | Evidence |
|---|---|---|
| AC-1 | ⚠️ form check open | Unit test passes; address loads on the deployed dev page |
| AC-2 | ✅ | `artist-form.component.spec.ts`, `dictionaries.spec.ts` |
| AC-3 | ✅ | `album-form.component.spec.ts` |
| AC-4 | ✅ | Both form specs |
| AC-5 | ⚠️ form checks open | `music-preset.spec.ts`, home page measurement |

Closes #80
