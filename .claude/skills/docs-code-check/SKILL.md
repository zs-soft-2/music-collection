---
name: docs-code-check
description: Compare the project documentation (docs/*.md, library READMEs) with the current code at any time and report every place where they disagree (stale docs, undocumented code, docs describing code that no longer exists). Read-only. Usage: /docs-code-check [area|doc path ...] [--since <git ref>] [--all]
---

## User Input

```text
$ARGUMENTS
```

## Purpose

Show where the documentation and the code have drifted apart, so the docs can be brought up to date (or a code regression found) before the next feature builds on them.

This skill is **read-only**. It writes only the report file. It never edits docs or code; fixing the findings is a separate request from the user.

## Outline

1. **Parse the input**:
   - **Areas or doc paths** (optional, several allowed): an area name from `.specify/docs-code-map.md` or a doc path listed there.
   - `--all`: check every row of the map. This is the default when no area, path or `--since` is given.
   - `--since <git ref>` (optional): only check areas whose code changed since that ref (`git diff --name-only <ref>...HEAD`). Combinable with areas.
   - An unknown area name: ERROR listing the valid names, and stop.

2. **Resolve the scope** from `.specify/docs-code-map.md`. This project-owned file holds the mapping table (area → docs → code it describes), the list of docs that are not checked (history or procedures, not current code), and any extra paths every area includes. If the file does not exist, stop and tell the user to create it (see the example in the zs-kit repo, `docs/examples/`).

   **Coverage check** (always, with `--all`): list every module/library directory named by the map's "coverage roots" that no doc row covers, and every row whose doc is missing.

3. **Gather context per area**:
   - `git log -1 --format='%h %ad' --date=short -- <doc>`: when the doc last changed.
   - `git log --oneline <doc's last commit>..HEAD -- <code paths>`: how many commits touched the code since. Report this number even when no drift is found.
   - `specs/*/spec.md` and `plan.md` merged after the doc's last change that touch the area. These are the most likely sources of drift; use them to know where to look, but the code is the truth.

4. **Compare**. For more than one area, run one `Explore` subagent per area in parallel (at most 8 at once). Give each the doc paths, code paths and the categories below, and require `path:line` evidence for both sides. For every concrete statement in the doc (entity fields and types, Firestore paths and collections, status values and transitions, store/effect/repository methods, permissions and roles, routes, Cloud Function triggers, library dependencies, diagrams), check it against the code:

   | ID prefix | Category | Meaning |
   |---|---|---|
   | `STALE` | Doc outdated | The doc states something the code does differently (renamed field, changed status set, different path, changed flow) |
   | `GONE` | Doc describes removed code | The doc names a file, class, method, field or function that no longer exists |
   | `UNDOC` | Code undocumented | Significant code in the area the doc covers is missing from it (new entity field, new status, new subcollection, new Cloud Function, new permission) |
   | `RULE` | Code breaks a documented rule | The doc, `CLAUDE.md`, `.claude/CLAUDE.md`, the user's `~/.claude/CLAUDE.md`, the constitution or a `.specify/kit/stack-*.md` file states a rule the code violates. Pass these rule sources to every subagent explicitly. Group repo-wide violations into one finding each instead of repeating them per area |
   | `COVER` | No documentation | A library or module that no doc covers |

   Rules for findings:
   - Every finding needs evidence on both sides: a quote or `path:line` from the doc, and `path:line` from the code. No evidence → not a finding.
   - `RULE` findings may be code bugs rather than doc problems. Report them; do not decide which side is right unless the doc, constitution or CLAUDE.md states the rule explicitly.
   - Statements that could not be checked statically go under **Not verified** with the reason.
   - Ignore wording, style and formatting; only factual disagreements count.

5. **Assign severity**:
   - **HIGH**: someone relying on the doc would build something wrong: wrong data shape, storage path, status flow, permission or architecture rule; or a `RULE` violation in the code.
   - **MEDIUM**: missing or outdated but not misleading: `UNDOC` of a significant feature, `GONE` references, `COVER` gaps.
   - **LOW**: minor naming or detail differences.

6. **Write the report** to `.specify/doc-checks/docs-code-check-<YYYY-MM-DD>.md` (gitignored; overwrite the file of the same day). Format:

   ```markdown
   # Docs ↔ Code Check

   **Checked**: <YYYY-MM-DD>, commit `<short sha>` on `<branch>`
   **Scope**: <areas> (<--all | --since ref | explicit>)
   **Result**: <n> high, <n> medium, <n> low

   ## Summary by area

   | Area | Doc last updated | Code commits since | High | Medium | Low |
   |------|------------------|--------------------|------|--------|-----|

   ## Findings

   | ID | Severity | Category | Doc says | Code does | Suggested fix |
   |----|----------|----------|----------|-----------|---------------|
   | STALE-1 | HIGH | Doc outdated | `docs/<area>.md:42` "…" | `src/…:17` … | Update the status list in the doc |

   ## Coverage gaps

   ## Not verified
   ```

7. **Report to the user**: the summary table, the HIGH findings, and the report path. Then stop and ask which findings to fix. Do not edit docs or code in this skill.

## Notes

- Useful moments to run it: before `/speckit-plan` on a feature in a given area (`/docs-code-check <area>`), after merging a feature (`/docs-code-check --since dev~1`), or periodically (`/docs-code-check --all`).
- `/speckit-issue-sync` (and `/speckit-issue-check` of the `agent-ticket` profile) look at the docs only for the area a ticket touches; this skill checks whole areas.
- When a doc or module is added or renamed, update `.specify/docs-code-map.md`.
