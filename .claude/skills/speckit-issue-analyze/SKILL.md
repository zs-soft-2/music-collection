---
name: speckit-issue-analyze
description: Run /speckit-analyze with an extra acceptance-criteria coverage pass for issue-driven features — every AC-n needs a task, a test task and a verification method (and, with the docs-first profile, a requirement id and a docs-first task) before implementation. Run after /speckit-tasks and again after /speckit-converge. Usage: /speckit-issue-analyze [extra focus]
---

## User Input

```text
$ARGUMENTS
```

## When to run

- After `/speckit-tasks`, **before the first** `/speckit-implement`.
- After `/speckit-converge` added tasks, **before** implementing them.

A CRITICAL finding blocks `/speckit-implement` until it is resolved and this skill is run again.

## Outline

1. **Run the analysis**: read `.claude/skills/speckit-analyze/SKILL.md` and follow it completely
   (hooks, strictly read-only, detection passes, severity, report, next actions, remediation
   offer), with the extra pass and report columns below.

2. **Load the acceptance criteria**: the `## Acceptance Criteria` section of the feature's
   `spec.md` and, if present, `issue-sync.md` in the same directory. If the spec has no
   AC section, report one CRITICAL finding ("no acceptance criteria: run /speckit-issue-sync") and
   skip pass G. Read the test levels from `.specify/project/verify.md` (if present).
   If `.specify/memory/constitution.md` is missing, or still the Spec Kit template (it has placeholders such as `[PROJECT_NAME]` or `[PRINCIPLE_1_NAME]`; `zs-kit status` prints its state), the constitution alignment pass of
   `speckit-analyze` has nothing to check: report one HIGH finding ("constitution check not run: the
   constitution is <missing | the Spec Kit template>; write it with `zs-kit init --constitution ask` or
   `/speckit-constitution`") and never count it as "no constitution issues".

3. **Pass G — acceptance-criteria coverage**:

   | Check | Severity |
   |---|---|
   | An AC has no task that references it (`[AC-n]` or `AC-n` in `tasks.md`) | CRITICAL |
   | An AC with an automated method (any test level of `verify.md`) has no task that writes its test | CRITICAL |
   | An AC is still `[NEEDS DECISION]` | CRITICAL |
   | The constitution requires a unit test per function, and a function the plan or the tasks add or change has no task that writes its unit test | CRITICAL |
   | A function that reaches an external service (auth, database, storage, mail, …) has no fake for its test, and no task builds one | CRITICAL |
   | An AC has no verification method | HIGH |
   | An AC proves server behaviour end-to-end or by hand against a shared environment, but the plan has no deploy step before it | HIGH |
   | The AC list differs from the approved one in `issue-sync.md` (added, dropped or reworded) | HIGH |
   | A task references neither an AC nor an FR (setup / foundational phases excepted) | MEDIUM — possible scope creep |

   With the docs-first profile (`.specify/kit/docs-first.md` exists), add the checks of its
   "issue-analyze" section.

4. **Report additions**: extend the Coverage Summary Table with `AC` and `Verification` columns
   (and `REQ` with docs-first), and add to the metrics:
   `AC coverage: <covered>/<total> (with test task: <n>)`.

5. **Next actions**: with any CRITICAL, recommend fixing it (`/speckit-tasks` again, or editing the
   spec / tasks with the user's approval) and running this skill again; do not suggest
   `/speckit-implement` yet. Without CRITICAL findings, `/speckit-implement` may go on.
   End the report with one line the dashboard and the user can read at a glance:
   `**Gate**: PASS` or `**Gate**: BLOCKED (<n> CRITICAL)`.
