---

description: "Task list for the honest feedback on the image URL field (#80)"
---

# Tasks: Honest feedback on the image URL field

**Input**: Design documents from `/specs/80-image-url-field-feedback/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/image-url-preview.md](./contracts/image-url-preview.md), [quickstart.md](./quickstart.md)

**Tests**: Included. The spec's AC table names a test file for each criterion, and constitution III requires a test that fails before the change. Tests come first in each story.

**Organization**: Tasks are grouped by user story, so each story can be implemented and tested on its own.

## Format: `[ID] [P?] [Story] [Model] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: The user story the task belongs to (US1, US2)
- **[Model]**: `[opus]` or `[sonnet]`, the model that implements the task in `/speckit-implement` (`[sonnet]` tasks are delegated to a subagent and must be self-contained)
- Every path is relative to the repository root

## Corrections to the design documents

Found while checking the plan against the code at `21cbf9c6`. These tasks follow the code.

- **Keep the `Image` import in both forms.** `plan.md` says each form "swaps the import", but the artist form has two more `p-image` elements (`artist-form.component.html:196`, `:231`) and the album form one more (`album-form.component.html:291`) for the attached pictures. The spec leaves those unchanged, so each form adds an import and removes none.
- **`npm test` and `npm run lint` cover only the `music-collection` project.** The polish phase therefore also runs test and lint on the libraries this feature touches.
- **Do not read the form through `params$` in the new tests.** `firstValueFrom(fixture.componentInstance.params$)` subscribes again, and `init$` builds a new form group on every subscription (`artist-form.service.ts:392`, `album-form.service.ts:384`). The new tests read the rendered form through `FormGroupDirective`.
- **Manual results go to `manual-checks.md`.** `/speckit-issue-verify` writes `verification.md`, so T016 and T017 keep their records in a separate file that the verify run reads as evidence.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Record the starting state of the projects the issue sync did not baseline.

- [X] T001 [sonnet] From the repository root, run `npx nx run-many -t test -p ui,core-i18n,music-collection` without changing any file, and report each project's pass and fail counts. Done when the counts are reported; any failure is reported as already failing before this feature (`specs/80-image-url-field-feedback/issue-sync.md` holds the baseline of the other projects).

---

## Phase 2: Foundational (Blocking Prerequisites)

No foundational tasks. The two stories change separate code and share no prerequisite.

---

## Phase 3: User Story 1 - A picture that cannot load says so (Priority: P1) 🎯 MVP

**Goal**: The artist photo field and the album cover field show the picture when it loads, and a translated message instead of a broken glyph when it does not. The value stays and the form can still be saved.

**Independent Test**: On one artist and one album, enter a loading address, a non-loading address, and then a loading address again, and watch the preview area.

### Tests for User Story 1

> Write these first and confirm that each fails for the expected reason before T007. Record the failure reason in the task's report.

- [X] T002 [P] [US1] [opus] Create `libs/ui/src/lib/image-url-preview/image-url-preview.component.spec.ts` covering the behaviour table of `contracts/image-url-preview.md`, using `provideI18nTesting()` from `@music-collection/core/i18n/testing` and `fixture.componentRef.setInput()`. Cases: empty, `null` and `undefined` `url` give no `img` and no message; a set `url` gives `img[src]` and no message; `dispatchEvent(new Event('error'))` on the `img` removes it and shows the translated text inside `[role="status"]`; a new `url` clears the message and renders the new picture; going A (failed) → B → A renders A's picture again, so it is retried (R-1); the `[role="status"]` element exists in every state, including empty (R-6). Assert the text against `TranslocoService.translate('ui.imageUrlPreview.could-not-load')`, and also assert it differs from the key. Expected failure: the component file does not exist yet.
- [X] T003 [P] [US1] [opus] Add a `describe` block to `libs/domain/music/artist/src/lib/form/component/artist-form.component.spec.ts` for AC-1, AC-2 and AC-4. Scope every picture query to `mc-image-url-preview img`, because the form's attached pictures also render `img` elements. Enter addresses through the real field: set `value` on `input#imageUrl`, dispatch an `input` event, then call `fixture.detectChanges()`. A programmatic `setValue` does not refresh this OnPush view. AC-1: a set address renders the picture and no message. The artist fixture must fill every required control so the form starts valid: `formedIn`, `genre`, `name` and `styles` (`artist-util.service.impl.ts:191-205`; `artistType` has a default). Read the rendered form with `fixture.debugElement.query(By.directive(FormGroupDirective)).injector.get(FormGroupDirective).form`, never through `params$`, which would build a new form. AC-2: after the `error` event the message shows, the picture is gone, `input#imageUrl` and the form's `imageUrl` value still hold the entered address, the form is valid, and the Save `p-button` (found by its translated `ui.artistForm.save` label) is not disabled. Assert that the form was valid before the error too, so the check cannot pass on a form that was never savable. AC-4: a new address removes the message and renders the picture. Expected failure: no `mc-image-url-preview` is in the form yet.
- [X] T004 [P] [US1] [opus] Add a `describe` block to `libs/domain/music/album/src/lib/form/component/album-form.component.spec.ts` for AC-3 and AC-4, with the same structure as T003 on `input#coverImageUrl`, the form's `coverImageUrl` value and the Save button labelled `ui.albumForm.save`. The album fixture must fill every required control so the form starts valid: `artist`, `format`, `genre`, `name`, `styles` and `year` (`album-util.service.impl.ts:218-249`). Expected failure: no `mc-image-url-preview` is in the form yet.

### Implementation for User Story 1

- [X] T005 [P] [US1] [sonnet] Add the key `imageUrlPreview` under the top-level `ui` object in `libs/core/i18n/assets/i18n/hu.json`, `libs/core/i18n/assets/i18n/en.json` and `libs/core/i18n/assets/i18n/de.json`, directly before the `trackImages` object in each file, per `specs/80-image-url-field-feedback/research.md` §R-6. The value is an object with one key, `could-not-load`. Its text is exactly: hu `A kép nem tölthető be erről a címről.`, en `The picture cannot be loaded from this address.`, de `Das Bild kann von dieser Adresse nicht geladen werden.` Keep tab indentation. Done when `npx nx test core-i18n --testFile=libs/core/i18n/src/lib/dictionaries.spec.ts` passes.
- [X] T006 [P] [US1] [sonnet] In `tsconfig.base.json`, directly after the `@music-collection/ui/music-view` entry (line 154), add the path alias `"@music-collection/ui/image-url-preview": ["libs/ui/src/lib/image-url-preview/index.ts"]`, formatted like that entry, per `specs/80-image-url-field-feedback/research.md` §R-3. The target file is created by another task. Do not export it from `libs/ui/src/index.ts`. Done when `node -e "JSON.parse(require('fs').readFileSync('tsconfig.base.json','utf8'))"` succeeds and `git diff tsconfig.base.json` shows only the added entry.
- [X] T007 [US1] [opus] Create `image-url-preview.component.ts`, `.html` and `.scss` and `index.ts` in `libs/ui/src/lib/image-url-preview/` per `contracts/image-url-preview.md`, data-model "View state" and R-1, R-6 (depends on T005, T006). Selector `mc-image-url-preview`, `ChangeDetectionStrategy.OnPush`, `imports: [...I18N_IMPORTS, Image]` from `@music-collection/core/i18n` and `primeng/image`, required inputs `url` (`string | null | undefined`) and `alt` (`string`), and no outputs. Keep the outcome in `linkedSignal({ source: this.url, computation: () => false })`, set to `true` by `(onImageError)`. While `url` is set and not failed, render `<p-image class="mc-form-image" [src] [preview]="true" [alt] width="200">`, as the forms do today. Always render the `role="status"` container, and put the message inside it only while `url` is set and failed. Style the message with `color: var(--mc-status-bad)` and the same top spacing as `.mc-form-image img` (`0.5rem`). `index.ts` exports the component. Done when the T002 spec passes through `npx nx test ui --testFile=libs/ui/src/lib/image-url-preview/image-url-preview.component.spec.ts`.
- [X] T008 [P] [US1] [opus] In `libs/domain/music/artist/src/lib/form/component/artist-form.component.html:167-175`, replace the `@if (params.formGroup.value.imageUrl; as url) { <p-image … /> }` block with `<mc-image-url-preview [url]="params.formGroup.value.imageUrl" [alt]="'ui.artistForm.photo' | transloco" />`, and add `ImageUrlPreviewComponent` from `@music-collection/ui/image-url-preview` to the `imports` of `artist-form.component.ts`. Keep `Image`: lines 196 and 231 still use it (depends on T007). Done when the T003 tests and the rest of `artist-form.component.spec.ts` pass through `npx nx test domain-artist`.
- [X] T009 [P] [US1] [opus] In `libs/domain/music/album/src/lib/form/component/album-form.component.html:263-271`, replace the `@if (params.formGroup.value.coverImageUrl; as url) { <p-image … /> }` block with `<mc-image-url-preview [url]="params.formGroup.value.coverImageUrl" [alt]="'ui.albumForm.cover2' | transloco" />`, and add `ImageUrlPreviewComponent` from `@music-collection/ui/image-url-preview` to the `imports` of `album-form.component.ts`. Keep `Image`: line 291 still uses it (depends on T007). Done when the T004 tests and the rest of `album-form.component.spec.ts` pass through `npx nx test domain-album`.

**Checkpoint**: AC-1 (unit part), AC-2, AC-3 and AC-4 pass at unit level, and User Story 1 works without User Story 2.

---

## Phase 4: User Story 2 - Focus no longer looks like an error (Priority: P2)

**Goal**: Every focused form field takes the theme's cyan focus colour instead of red, in both colour modes. The primary colour and the focus of buttons, cards and links stay red.

**Independent Test**: Focus a field holding a valid value, on any form, in both colour modes.

### Tests for User Story 2

> Write this first and confirm that it fails for the expected reason before T011.

- [X] T010 [US2] [opus] Create `apps/music-collection/src/app/theme/music-preset.spec.ts` for the token part of AC-5 (FR-006, FR-007). Assert that `MusicPreset.semantic.formField.focusBorderColor` is `'{focus.ring.color}'`, that the focus ring colour is `light-dark(#0091b3, #00d4ff)` and that `semantic.primary.color` is still `light-dark(#e02d2d, #ff4444)`. Also assert that the override keeps the other `formField` values Aura provides, such as `paddingX`. Expected failure: `focusBorderColor` is Aura's `{primary.color}`. If `definePreset`'s return type hides these properties, read them through a narrow local interface, not `as any`.

### Implementation for User Story 2

- [X] T011 [US2] [sonnet] In `apps/music-collection/src/app/theme/music-preset.ts`, in the `semantic` object directly after the `focusRing` block, add `formField: { focusBorderColor: '{focus.ring.color}' },` per `specs/80-image-url-field-feedback/research.md` §R-4. Change nothing else; `primary` stays as it is. Done when `npx nx test music-collection --testFile=apps/music-collection/src/app/theme/music-preset.spec.ts` passes.
- [X] T012 [P] [US2] [sonnet] Replace `var(--mc-primary)` with `var(--mc-info)` on exactly these 11 lines, changing nothing else on them, per `specs/80-image-url-field-feedback/data-model.md` "Focus rules to change" rows 1-11. The numbers are the lines holding the `var(--mc-primary)` to replace. Paths are under `apps/music-collection/src/app/`: `page/album/album-page.component.scss` 288; `page/album/component/release-picker/release-picker.component.scss` 406; `page/album/component/wishlist-dialog/wishlist-dialog.component.scss` 144, 167; `page/collection-item/component/copy-details-form/copy-details-form.component.scss` 74; `page/collection/collection-page.component.scss` 103, 186; `shared/music-ui/copy-placement/copy-placement.component.scss` 170, 195; `shared/music-ui/copy-removal/copy-removal.component.scss` 164, 189. Other `--mc-primary` uses in these files stay. Done when `git diff --stat` on them shows 11 changed lines in 7 files and each changed line differs only in that token.
- [X] T013 [P] [US2] [sonnet] Replace `var(--mc-primary)` with `var(--mc-info)` on exactly these 5 lines of inline `styles`, changing nothing else on them, per `specs/80-image-url-field-feedback/data-model.md` "Focus rules to change" rows 12-16. Paths are under `apps/music-collection/src/app/`: `page/home/component/home-search/home-search.component.ts` 187; `page/admin/music-collection/component/discography-picker.component.ts` 220; `page/profile/component/profile-privacy/profile-privacy.component.ts` 239; `page/profile/component/profile-shelves/profile-shelves.component.ts` 714; `page/profile/component/profile-account/profile-account.component.ts` 145. Other `--mc-primary` uses in these files stay. Done when `git diff --stat` on them shows 5 changed lines in 5 files and each changed line differs only in that token.

**Checkpoint**: The token test passes, 16 rules are changed, and User Story 2 works without User Story 1. AC-5's manual part is in T016.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: The checks before review, and the recorded manual checks that AC-1 and AC-5 require.

- [X] T014 [sonnet] From the repository root, run `npx nx run-many -t test -p ui,core-i18n,domain-artist,domain-album,music-collection`, `npm run test:rules`, `npx nx run-many -t lint -p ui,domain-artist,domain-album,music-collection` and `npm run verify:csp`, per `specs/80-image-url-field-feedback/quickstart.md` "Automated checks" and constitution XII. Compare with T001 and the baseline in `specs/80-image-url-field-feedback/issue-sync.md`. Do not fix anything in this task. Done when each command's result and any new failure are reported.
- [X] T015 [opus] Run `npx nx build music-collection` and confirm that `primeng/image` has not entered the main bundle and that no `initial` budget warning is new (R-3, `quickstart.md` "Bundle check"). Inspect the build's stats, and do not judge from the chunk names alone. If it entered the main bundle, find the import that pulled it in and fix that import.
- [ ] T016 [opus] Run every check in `quickstart.md` "Manual checks on the local app" in both colour modes, and record the results in `specs/80-image-url-field-feedback/manual-checks.md` (AC-2, AC-3, AC-4, AC-5, FR-007, SC-002, SC-003). Tests run in a zone environment but the app is zoneless, so confirm here that the preview follows a typed address without blurring the field, and that it follows an address applied from the artist form's data suggestions. These checks are read-only: never press Save. "Can be saved" is proved by the Save button staying enabled with a failing address on a form that was valid before it, so dev data stays untouched (constitution XIX). The checks need an admin login; if none is available, leave them open in `manual-checks.md` and tell the maintainer.
- [ ] T017 [opus] Prepare, but do not run, the dev verification in `quickstart.md` "Manual check on dev" (AC-1, SC-001). List the needed hosting and client deploy for the maintainer and wait for their go-ahead (constitution VIII). After the deploy, check the screenshot's address on the Razor artist form and record the result in `specs/80-image-url-field-feedback/manual-checks.md`. If the picture still fails, the root cause is not found: stop and send #80 back to investigation (constitution II), because the new message must not stand in for it.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Run it before any change, or the baseline means nothing.
- **Foundational (Phase 2)**: Empty.
- **User Story 1 (Phase 3)** and **User Story 2 (Phase 4)**: Both depend only on Setup, so they can run in either order or together.
- **Polish (Phase 5)**: Depends on both stories. T017 also depends on the maintainer's go-ahead.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on User Story 2.
- **User Story 2 (P2)**: No dependency on User Story 1. The two touch different files.

### Within Each User Story

- **US1**: T002, T003, T004 (failing tests) → T005, T006 → T007 → T008, T009.
- **US2**: T010 (failing test) → T011. T012 and T013 can run alongside T011, because the token test does not cover them.

### Parallel Opportunities

- T002, T003 and T004 touch different spec files.
- T005 and T006 touch different files.
- T008 and T009 touch different libraries.
- T012 and T013 touch different files.
- Phases 3 and 4 share no files.

---

## Parallel Example: User Story 1

```bash
# The failing tests, together:
Task: "Create image-url-preview.component.spec.ts in libs/ui/src/lib/image-url-preview/"
Task: "Add the AC-1, AC-2, AC-4 tests to artist-form.component.spec.ts"
Task: "Add the AC-3, AC-4 tests to album-form.component.spec.ts"

# The two forms, once the component exists:
Task: "Delegate the photo preview in artist-form.component.html"
Task: "Delegate the cover preview in album-form.component.html"
```

## Parallel Example: User Story 2

```bash
# The hand-built rules, while T011 changes the token:
Task: "Change the 11 SCSS focus rules to var(--mc-info)"
Task: "Change the 5 inline-style focus rules to var(--mc-info)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001.
2. Complete Phase 3.
3. **Stop and validate**: run the three project test suites, then the independent test on the local app.

User Story 1 is the MVP because it is the behaviour the ticket reported and the only one that loses information today.

### Incremental Delivery

1. Setup → baseline recorded.
2. User Story 1 → the preview tells the truth.
3. User Story 2 → focus stops looking like an error, on every form.
4. Polish → checks and manual records, then the dev check once the maintainer has deployed.

---

## Notes

- Every commit message carries `(#80)` (constitution IV).
- Nothing here deploys or writes to a live project without the maintainer's go-ahead (constitution VIII).
- No validation, stored data, content policy or Cloud Function changes (FR-004, plan Summary).
- The label, musician and music-collection cover forms stay as they are (spec "Out of scope").
- The line numbers are from `21cbf9c6` and were re-checked when this file was written. T012 and T013 change one word per line, so the numbers stay valid throughout.
