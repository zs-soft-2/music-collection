---
name: speckit-from-issue
description: Start a new SpecKit feature from a GitHub issue — fetches the issue with gh, syncs it with the code (/speckit-issue-sync, approved acceptance criteria), and runs the speckit-specify flow with the issue as the feature description; the issue number names the branch and the spec directory. Usage: /speckit-from-issue [<issue-number|#number|issue-url>] [--comment] [extra notes] — without a number it lists the open tickets by type to choose from
---

## User Input

```text
$ARGUMENTS
```

## Outline

1. **Parse the input**:
   - The issue reference is normally given. Accept `308`, `#308`, or a full URL `https://github.com/<owner>/<repo>/issues/308`. Extract the issue number (and `owner/repo` if a URL was given).
   - `--comment` (optional flag): post a comment on the issue after the spec is created (step 8). Without the flag, do NOT write anything to GitHub.
   - Any remaining text is **extra notes** from the user. They take precedence over the issue content when the two conflict.
   - If no issue reference is present, let the user choose the ticket (never guess one):
     1. Ask the **type** with AskUserQuestion: Feature, Task, Bug (Other covers the rest).
     2. List the open tickets of that type, newest first:

        ```bash
        npx zs-kit issues --type <feature|task|bug|other>
        ```

        It classifies by the GitHub issue type, else by the labels (`issueTypes` in `.zs-kit.json`), and marks a
        ticket that already has a `specs/<n>-…` directory. If the command fails, show its error and stop.
     3. Show the list numbered (`#<n> <title> [labels]`, plus `→ specs/<dir>` when it exists) and ask which ticket to
        take: a short list fits AskUserQuestion (up to 4 options), a longer one is asked as text ("answer with the
        ticket number"). With no open ticket of that type, say so and offer the other types.
     4. Go on with the chosen number as if it had been given.

     In a headless run (`claude -p`, e.g. the zs-kit dashboard) AskUserQuestion is not available: print the type
     question or the list, end with "Answer with a ticket number (or a type) to continue", and stop until the answer
     comes back in the same session.

2. **Fetch the issue**:

   ```bash
   gh issue view <number> [--repo <owner/repo>] --json number,title,body,labels,state,url,comments
   ```

   - If the command fails (not authenticated, issue not found, no network), report the exact error and stop. Do NOT invent or guess the issue content.
   - If `state` is `CLOSED`, tell the user and ask whether to continue before doing anything else.
   - Read the comments too: they may contain decisions or clarifications that refine the issue body.
   - Images: follow step 2 "Images" of `speckit-issue-sync` (`npx zs-kit attachments <number>`) and hand the
     files over with the issue.

3. **Check the base branch**: the feature branch is created from the current `HEAD` (the git extension's `git checkout -b`).
   - New work starts from the **local `dev`** branch. If the current branch is not `dev`, tell the user and ask before going on.
   - Do NOT `git pull`, reset or rebase anything to "fix" the base: reconciling the local branch is the user's call.
   - Uncommitted changes are carried over to the new branch. Mention them in the report, but do not stash or commit them.

4. **Sync the issue with the code** (mandatory): read `.claude/skills/speckit-issue-sync/SKILL.md` and follow it with the issue fetched in step 2 (skip its own fetch; pass `--no-baseline` only if the user asked for it). Respect its gate: continue only once the user has answered its questions and **approved the acceptance criteria**. If the user stops there, stop this skill too: no branch, no spec.

5. **Build the feature description** from the issue and the sync:
   - Title, body, the relevant decisions from the comments, and the user's extra notes.
   - The sync's corrections replace the issue's stale facts (⚠️ items), and tasks found already done are left out (or kept, as the user decided at the gate).
   - The **approved AC list** is the acceptance contract. Open decisions still left feed `[NEEDS CLARIFICATION]` markers.

6. **Run the specify flow**: read `.claude/skills/speckit-specify/SKILL.md` and follow it completely (Pre-Execution Checks with the extension hooks, the Outline steps, quality validation, clarification questions, Mandatory Post-Execution Hooks), with the feature description from step 5. Apply these overrides:
   - **Short name**: derive it from the issue title. Drop conventional-commit prefixes such as `perf(web):` or `feat(core):`.
   - **The issue number is the feature number**: the branch and the spec directory are both `<number>-<short-name>` (e.g. `128-guest-night-stays`), never the next sequential `00n-`.
   - **Branch hook (`before_specify` → `/speckit-git-feature`)**: pass the name through `GIT_BRANCH_NAME`, and ONLY the issue title as the description, never the full body (its quotes and newlines break the script's argument handling):

     ```bash
     GIT_BRANCH_NAME="<number>-<short-name>" .specify/extensions/git/scripts/bash/create-new-feature-branch.sh --json "<issue title>"
     ```

     Note the returned `BRANCH_NAME` and `FEATURE_NUM` (the issue number).
   - **Spec directory**: set `SPECIFY_FEATURE_DIRECTORY` to `specs/<number>-<short-name>`, so speckit-specify does not compute a sequential number of its own.
   - **Spec header (writing `SPEC_FILE`)**: set the `**Input**` line to:

     ```markdown
     **Input**: GitHub issue [#<number>](<url>): "<issue title>"
     ```

     and add this line directly below it:

     ```markdown
     **Source Issue**: <url>
     ```

   - **Acceptance criteria**: add a `## Acceptance Criteria (issue #<number>)` section directly after `## User Scenarios & Testing`, with the approved list as a table: `| AC | Given / When / Then | FR / SC | Verification | Test file |` (one row per AC, the id in the first cell). Every AC links to at least one FR (or SC), and the user stories' acceptance scenarios name the AC ids they illustrate. The ids and wording stay exactly as approved.
   - **Sync record**: once the feature directory exists, save the sync report (with the approved ACs and the baseline results) as `<feature directory>/issue-sync.md`.

7. **Report** as the speckit-specify Completion Report describes, and also give the source issue link, the branch name and the next steps: `/speckit-clarify` (if markers are left) → `/speckit-plan` → `/speckit-tasks` → `/speckit-issue-analyze` → `/speckit-implement` → `/speckit-issue-verify`.

8. **Comment on the issue** (only if `--comment` was given):

   ```bash
   gh issue comment <number> [--repo <owner/repo>] --body "SpecKit feature started: branch \`<BRANCH_NAME>\`, spec: \`<SPEC_FILE relative path>\`, acceptance criteria: AC-1…AC-<n>"
   ```

   Report the comment URL that the command returns.

## Notes

- **Working files** (screenshots, drafts, command output to keep) go to `.specify/kit-ui/tmp/`, never `/tmp` or the project root. Git ignores the directory, and the dashboard empties it before a new run, so do not delete anything there yourself (a headless `rm` is refused).
- Written for Spec Kit 1.2.x with the bundled `git` extension (`specify extension add git`): branch creation is the `before_specify` hook, the spec directory and file are created by `speckit-specify` itself. If an upgrade renumbers the speckit-specify Outline, re-check the overrides in step 6.
- Run this skill only when the maintainer invokes it (directly, or with the Run button of the `zs-kit ui` dashboard): tickets are started manually, never by another skill, a plan or a suggestion.
- The issue flow's companions: `speckit-issue-sync` (before the spec), `speckit-issue-analyze` (after the tasks, and after a converge), `speckit-issue-verify` (after the implementation).
- This skill wraps `speckit-specify` and does not modify it, so it keeps working after SpecKit is upgraded (`specify init --here` regenerates the speckit-* files).
- If the constitution asks for it, every commit made for the issue ends its subject with `(#<number>)`, e.g. `feat(booking): per-night guest stays (#128)`.
- Mention `Closes #<number>` in the feature's later PR description so merging the PR closes the issue.
