---
name: speckit-issue-verify
description: Validate the finished work of an issue-driven feature against its acceptance criteria — finds evidence (passing tests, observed behaviour, code) for every AC-n (and, with the docs-first profile, every touched requirement), checks regressions against the baseline, the constitution and a code review, and writes verification.md with a PR-ready summary. Run after /speckit-implement. Usage: /speckit-issue-verify [--comment] [--skip-e2e]
---

## User Input

```text
$ARGUMENTS
```

## Purpose

`/speckit-implement` ends when the tasks are ticked. This skill decides whether the **issue is
done**: every acceptance criterion needs evidence. No evidence, no ✅.

It does not change code, docs, the issue or `tasks.md`. It writes `verification.md`, screenshots
under `verification/`, and an issue comment when `--comment` is given. Findings go into the report,
and the user decides what to change.

## Outline

1. **Locate the feature**: `.specify/feature.json` → the feature directory (fallback:
   `specs/<current branch>/`); load `spec.md` (its `## Acceptance Criteria` and its
   `**Source Issue**` line), `tasks.md`, `plan.md` and `issue-sync.md`. Read
   `.specify/project/verify.md` (test levels, commands, environments, seed and login) and every
   `.specify/kit/stack-*.md`, if present. No AC section → stop: "run /speckit-issue-sync first".
   - `--comment`: post the result comment of step 11. Without it, write nothing to GitHub.
   - `--skip-e2e`: do not run end-to-end suites or drive the app; those ACs end up ⚠️ "not verified".

2. **Re-read the issue**:

   ```bash
   gh issue view <number> --json title,body,comments,updatedAt,state
   ```

   Comments or edits newer than the spec may add or change criteria: list them as ⚠️ "changed since
   the spec" and ask whether they belong to this feature or to a follow-up.

3. **Task state**: list the unticked tasks in `tasks.md`. They do not fail an AC by themselves, but
   each is named in the report.

4. **Evidence per AC**:
   - **Tests**: find the tests tagged with the id (`AC-n` in the test name) in the test locations of
     `verify.md`, and run them with the command of their level. Run heavy commands one at a time:
     they share build output and ports.
   - **Code**: where the behaviour is implemented (`path:line`). For a broad search use an Explore
     agent and keep only the conclusion.
   - **Behaviour in the app** (`manual` ACs, and end-to-end ones without a test): drive it with the
     `run` skill or a browser-automation tool, and save screenshots under `specs/<feature>/verification/`.
   - **Ask first** before anything that touches a shared environment (`verify.md` says which levels
     do): never deploy without the user's go-ahead; when it is not given, the AC is ⚠️ "not verified:
     needs deploy".
   - **Verdict**: ✅ met — a passing test, or observed behaviour, plus the code that does it ·
     ⚠️ partly met, code without a test, or not verifiable now · ❌ not met, or its test fails.

5. **Code against the docs** (only if `.specify/kit/docs-first.md` exists): follow its
   "issue-verify" section and add a `## Docs` table to the report.

6. **Regressions**: rerun the baseline commands recorded in `issue-sync.md`, then the full fast
   suites named in `verify.md`. A test green in the baseline and red now is a ❌ regression; one red
   in the baseline too is reported as pre-existing.
   - **Release bump** (only if `.specify/kit/release.md` exists): follow its "issue-verify" section.

7. **Constitution on the diff**: review `git diff dev...HEAD` (the **local**
   `dev`) against every principle in `.specify/memory/constitution.md` and the rules in
   `.specify/kit/stack-*.md`. A violation is ❌, with the principle and `path:line`.
   - **Ticket number**: the branch is `<n>-<short-name>`. If the constitution asks every commit to
     end with `(#<n>)`, list each subject in `git log --format='%h %s' dev..HEAD` that
     does not as ⚠️ (a reword before the PR fixes it; do not rewrite history without the user's
     go-ahead).
   - **Unit test per function** (if the constitution requires one): list every function the diff
     adds or changes and the unit test that exercises it. A function without one is ❌, even when
     every AC is ✅. Put the list in `verification.md` (`| function | test | result |`).

8. **Code review**: run the `code-review` skill on the branch's changes and include its findings.

9. **Write `specs/<feature>/verification.md`**:

   ```markdown
   # Verification: <feature> — issue #<n> — <branch> @ <sha> — <date>
   **Result**: <READY FOR PR | GAPS>  (<x> ✅ · <y> ⚠️ · <z> ❌)
   ## Acceptance criteria   (| AC | criterion | verdict | evidence: test + result / screenshot / path:line |)
   ## Docs                  (docs-first only)
   ## Regressions           (| test | baseline | now |)
   ## Constitution
   ## Code review
   ## Open items            (unticked tasks, changed-since-spec items, unverified ACs)
   ## PR summary            (summary, AC table, `Closes #<n>`)
   ```

   Keep the `**Result**:` line exactly in this form: the `zs-kit ui` dashboard reads it. Re-running overwrites the file.

10. **Outcome**:
    - **READY FOR PR**: every AC ✅, no regression, no constitution ❌, no blocking review finding
      (plus the docs-first and release conditions, when those profiles are active).
      Offer to open the PR (target `dev`) from the PR summary; do not push or open it
      without the user's go-ahead.
    - **GAPS**: list them, and recommend `/speckit-converge` → `/speckit-issue-analyze` →
      `/speckit-implement` → `/speckit-issue-verify` again. Recommend only: the maintainer runs
      each step.

11. **Comment** (only with `--comment`): post the result line and the AC table on the issue with
    `gh issue comment <number> --body-file <file>`. Never edit the issue body or tick its
    checkboxes unless the user asks. Report the comment URL.

## Notes

- Chat with the user in English.
- `verification/` holds screenshots only, not command logs. Check their size before committing them.
