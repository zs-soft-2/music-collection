---
name: speckit-issue-sync
description: Check a GitHub issue against the current code before development starts — verifies the issue's current-state claims, tasks, testing plan, constitution fit and (with the docs-first profile) the docs it touches, records a baseline test run, and drafts numbered acceptance criteria (AC-n) for the user to approve. Runs standalone or as a step of /speckit-from-issue. Usage: /speckit-issue-sync <issue-number|#number|issue-url> [--comment] [--no-baseline]
---

## User Input

```text
$ARGUMENTS
```

## Purpose

Issues go stale: line references drift, "today the code does X" stops being true, a task gets done
by another feature. This skill finds that out **before** a spec is written on top of it, and turns
the issue into an approved, numbered list of acceptance criteria (`AC-1`, `AC-2`, …) that the rest
of the flow (`/speckit-tasks`, `/speckit-issue-analyze`, `/speckit-issue-verify`) traces.

It is **read-only** on the code and on the issue: it never edits source, tests, specs or the issue
body. The only GitHub write is the optional summary comment (`--comment`).

## Project files this skill reads

- `.specify/memory/constitution.md` — the principles every task and decision is checked against.
- `.specify/project/verify.md` (project-owned) — the **test levels** of the project (name, file
  pattern, command to run one file, whether it touches a shared environment). The level names are
  the verification methods an AC can use, plus `manual`. Without the file, use the test setup you
  find in the repo and say so in the report.
- `.specify/kit/stack-*.md` — stack rules and verification procedures, if present.
- `.specify/kit/docs-first.md` — present only with the `docs-first` profile; it adds the docs step.

## Outline

1. **Parse the input**:
   - The issue reference is required: `124`, `#124`, or `https://github.com/<owner>/<repo>/issues/124`.
   - `--comment`: post the summary comment of step 13. Without it, write nothing to GitHub.
   - `--no-baseline`: skip the baseline test run (step 8).
   - When `/speckit-from-issue` runs this skill, it hands over the already-fetched issue: skip step 2.

2. **Fetch the issue**:

   ```bash
   gh issue view <number> [--repo <owner/repo>] --json number,title,body,labels,state,url,comments,updatedAt
   ```

   On failure report the exact error and stop; never guess the content. A `CLOSED` issue: ask first.

3. **Pin the code base**: record `git branch --show-current` and `git rev-parse --short HEAD`.
   New work starts from the **local `dev`**; if HEAD is elsewhere, say so in the report
   (do not switch, pull or reset). Links in the issue that point to `blob/<ref>/<path>#L<n>` are
   checked against the **working tree**, not against `<ref>`.

4. **Extract the checkable items** from the body and the comments (later comments override the body):
   - **C — current-state claims**: statements about the code as it is (files, symbols, fields,
     line references, behaviour).
   - **T — tasks**: the checklist items (`- [ ]`) or, if there are none, the concrete changes asked for.
   - **D — decisions**: decided points, and open questions still waiting for the user.
   - **Q — testing plan**: the tests or test levels the issue asks for.
   - **A — acceptance criteria**, if the issue states any.

5. **Verify against the code**. Delegate the sweep to an **Explore** agent ("very thorough") with
   the extracted C / T / Q items, so file dumps stay out of the main context. Ask it to return, per
   item, a status with `path:line` evidence and, for a drifted item, the correct current fact:
   - **C**: ✅ accurate · ⚠️ drifted (moved, renamed, partly true; give the correct fact) · ❌ false.
   - **T**: ⬜ not started · 🟨 partly done · ✅ already done · ❌ conflicts — with existing code, a
     later decision, or other in-flight work (check `git branch` for feature branches and `specs/`
     for overlapping features).
   - **Q**: whether the test infrastructure exists (the test levels of `verify.md`), and which
     existing tests already cover the touched code.

   If the constitution requires a unit test per function, also list the **functions without a unit
   test** among those the tasks will add or change: each of them needs one, and a missing fake
   (auth, database, storage, mail, …) becomes a task of its own.

   Re-check every ❌ yourself before reporting it.

6. **Docs** (only if `.specify/kit/docs-first.md` exists): follow its "issue-sync" section — find the
   requirements, screens and architecture sections the issue touches, the deviation lines that name
   this issue, and the open questions it settles. A C item that contradicts the docs is reported as
   such: the docs win unless the user decides otherwise.

7. **Constitution fit**: read `.specify/memory/constitution.md`. For every T and D item that would
   break a principle mark ❌ (name the principle); for one that needs care to stay within it mark ⚠️.
   If the file is missing, or still the Spec Kit template (it has placeholders such as `[PROJECT_NAME]` or `[PRINCIPLE_1_NAME]`; `zs-kit status` prints its state), there is nothing to check against: write
   "Constitution check not run: the constitution is <missing | the Spec Kit template>" under
   `### Constitution`, mark it ⚠️, add "write the constitution (`zs-kit init --constitution ask` or
   `/speckit-constitution`)" to the open decisions, and never report the check as passed.

8. **Baseline test run** (unless `--no-baseline`): run only the suites that touch the affected area,
   with the commands `verify.md` gives per test level, so a later failure can be told apart from one
   that was already there. A level that `verify.md` marks as touching a shared environment (deployed
   backend, shared data) is **never** run here. No coverage for the area → say so.

   Record each command, the pass/fail counts and the failing test names. A red baseline is not a
   blocker, but it is reported as pre-existing.

9. **Draft the acceptance criteria**:
   - Keep the issue's own ACs; otherwise derive them from the goal and the tasks.
   - Each AC: an id `AC-n`; one **Given / When / Then** stating observable behaviour (not the
     implementation); with the docs-first profile, the requirement ids it realises (new ones get a
     proposed id); its source (issue section, comment, or "derived"); the **verification method** —
     a test level of `verify.md` or `manual` — and the planned test file.
   - Prefer the lowest level that proves the behaviour. Server-side behaviour is proven with a
     server-side test level: proving it end-to-end or by hand against a shared environment needs a
     deploy first.
   - An AC that hangs on an open decision is marked `[NEEDS DECISION: …]`.
   - Every T maps to at least one AC, every AC to at least one T; list the orphans.

10. **Report** in English:

    ```markdown
    ## Issue sync: #<n> "<title>" — <branch> @ <sha>
    **Summary**: <x> ✅ · <y> ⚠️ · <z> ❌ · baseline <green|red|skipped>
    ### Current-state claims   (| # | claim | status | evidence / correction |)
    ### Tasks                  (| # | task | status | evidence |)
    ### Docs                   (docs-first only: | requirement / screen / architecture | change | file |)
    ### Testing plan
    ### Constitution
    ### Baseline tests         (| command | result | failing |)
    ### Proposed acceptance criteria (| AC | Given / When / Then | REQ | source | tasks | verification |)
    ### Open decisions
    ```

11. **Gate** — ask with AskUserQuestion, and stop until answered:
    - If there is any ❌, any task already ✅ done, or an open decision: how to go on — adjust the
      scope, decide now, continue anyway, or stop.
    - **Approval of the AC list** (the user may edit it). Without approval nothing goes on: no spec
      is written. The approved list is final input for `/speckit-specify`.
    - When AskUserQuestion is not available (a headless run, e.g. from the `zs-kit ui`
      dashboard), print the questions as a numbered list and **end the turn**: the user answers by
      continuing the session. Never assume an approval.
    - Run standalone, the skill ends here: it may name `/speckit-from-issue <n>` as the next step,
      but never starts it. The maintainer starts every ticket.

12. **Persist**: when run from `/speckit-from-issue`, that skill saves this report, with the
    approved ACs, as `specs/<feature>/issue-sync.md` once the feature directory exists. Run
    standalone, print the report and offer to save it; do not create files under `specs/` on your own.

13. **Comment** (only with `--comment`):

    ```bash
    gh issue comment <number> --body-file <file>
    ```

    with the summary line, the ⚠️ / ❌ items and the approved AC table. Never edit the issue body or
    tick its checkboxes. Report the comment URL.
