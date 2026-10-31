---
name: commit
description: Create a git commit with the correct title and body for this project (Conventional Commits, spec-number scope, English, attribution trailer). Reads the staged/working diff, picks type and scope, writes the message and commits locally. Never pushes or amends. Usage: /commit [hint about the intent] [--dry-run]
---

## User Input

```text
$ARGUMENTS
```

The text is an optional hint about the intent of the change. `--dry-run` prints the proposed message and does not commit.

## Purpose

Every commit in this repo has a consistent title and a useful body, so that history, release notes and PR descriptions can be built from it. This skill only **commits locally**. It never pushes, never opens a PR, never amends, never rewrites history.

## Outline

1. **Inspect the state** (run in parallel): `git status --short`, `git diff HEAD --stat`, `git diff HEAD` (read the real diff, not only the file names), `git branch --show-current`, `git log --no-merges --format=%s -15`.
   - Nothing to commit: say so and stop.
   - Do not commit files that look like secrets (`.env*`, credentials, service-account JSON, `*.pem`). Leave them out and tell the user.

2. **Decide what goes in**. Default rule: commit **all** changed files by default (`git add -A`), including new untracked files. Exception: secrets (above), and changes that clearly belong to a different logical change. In that case split into several commits (each with its own message) or ask which to include when the split is unclear.

3. **Choose the type** from the diff, using the types already used in this repo's history:

   | Type | Use for |
   |---|---|
   | `feat` | new user-visible or API behaviour |
   | `fix` | bug fix, including security fixes |
   | `test` | tests only (also the "tests first" commit of a SpecKit feature) |
   | `docs` | documentation, specs, plans, tasks, evidence, runbooks |
   | `refactor` | restructuring with no behaviour change |
   | `perf` | performance |
   | `style` | formatting only |
   | `ci` | workflows / pipelines |
   | `chore` | tooling, skills, SpecKit setup, dependency/release housekeeping |

   If the diff mixes types, the type of the primary change wins (code beats docs); if no primary change is clear, split the commit.

4. **Choose the scope**:
   - On a SpecKit feature branch (`NNN-...`, e.g. `036-gh339-...`): scope = the spec number, `(036)`.
   - Otherwise a short area name from the paths touched, matching the scopes already used in `git log` (one word, lowercase), or no scope for cross-cutting changes.
   - Release/version bumps and merges follow the style already in `git log` (e.g. `chore: release X.Y.Z`).

5. **Write the title**: `type(scope): imperative summary`.
   - English, lowercase after the colon, no trailing period, at most 72 characters.
   - Describes what the change does, not how or which files. Add the issue number in parentheses when the change closes or implements a ticket, e.g. `(#339)`.
   - Use `!` after the type/scope only for a breaking change and explain it in the body.

6. **Write the body** (blank line after the title), wrapped at about 72 characters:
   - A short bullet list or paragraph of **what changed and why**, grouped by area when the commit touches several. Not a file list, and nothing the diff already shows line by line.
   - Mention rules a reviewer must know: tests-first commit expected to fail, pre-existing failures, follow-up tickets (`#NNN`), deliberate omissions.
   - Reference issues with `#NNN`. Do not write `Closes #N` in commit messages; closing keywords belong in the PR description.
   - A trivial change (typo, formatting) needs only the title.

7. **Trailer**: end the message with the attribution line that Claude Code's system reminder prescribes for commits (currently `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`), after a blank line. Use the exact line the reminder gives for the current session.

8. **Commit**: show the proposed message to the user first when `--dry-run` was given; otherwise commit directly with a HEREDOC so the formatting is preserved:

   ```bash
   git add -A && git commit -F - <<'EOF'
   <title>

   <body>

   <trailer>
   EOF
   ```

   - Never use `--no-verify`, `--amend`, `--no-gpg-sign`, or force options. If a pre-commit hook fails, fix the cause, re-stage and create a **new** commit.
   - If the branch is `dev` (or `main`/`master`), do not commit there. Tell the user and ask for a feature branch first.

9. **Report**: the short hash, the title, and the list of files committed. Do not push. Pushing, PRs and amending already pushed commits need an explicit request from the user.

## Examples

```text
fix(036): close self-service privilege escalation (#339)

- rules: owner can no longer update own user record
- createUser: require admin role for the ADMIN grant
- sendEmail: admin only

Co-Authored-By: ...
```

```text
test(036): add failing tests for #339 privilege escalation (tests first)

Expected FAIL: SEC-RULES-01/02, SEC-CHAIN-01.

Co-Authored-By: ...
```

```text
feat(income): show customer and generation time in list
```

## Notes

- Spec Kit's own `speckit-git-commit` hook (`auto_commit`) commits after Spec Kit phases. Set `commit_style: conventional` in `.specify/extensions/git/git-config.yml` there; this skill is for every other commit.
