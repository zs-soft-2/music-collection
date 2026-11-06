---
name: speckit-feature-define
description: Define a brand-new feature that has no ticket yet — reads what the maintainer entered with the dashboard's New feature button, writes the docs draft first (with the docs-first profile: requirements, screens, architecture), asks numbered questions until the requirements are clear, and proposes the ticket with acceptance-criteria drafts in ticket.md. Never creates the ticket, never commits. Usage: /speckit-feature-define <draft-slug>
---

## User Input

```text
$ARGUMENTS
```

## Purpose

A new idea has no ticket to sync against. This skill turns the maintainer's description into
**docs first**, then into a ticket proposal that the rest of the flow can trace: the dashboard's
**Create ticket** gate creates the GitHub issue from it, and `/speckit-issue-sync` then checks the
AC drafts against the code like for any other ticket.

It writes only the docs draft and its own files. It **never** creates or edits a GitHub issue, never
commits, pushes or switches branches, and never touches source or tests.

## Project files this skill reads

- `.specify/kit-ui/drafts/<slug>/input.md` — what the maintainer entered: title, description and the
  paths of the images (under `.specify/kit-ui/drafts/<slug>/images/`). **Read every image**: a
  screenshot or a sketch is part of the request.
- `.specify/memory/constitution.md` — the principles a requirement must not break.
- `.specify/kit/docs-first.md` — present only with the `docs-first` profile; its `## feature-define`
  section and `.specify/project/docs.md` say where the requirements, screens and architecture live
  and how a new requirement id is numbered.
- The code, only to understand what exists today. Do not change it.

## Files this skill writes

All in the draft's directory `.specify/kit-ui/drafts/<slug>/` (ignored by git), plus the docs:

- the **docs draft**: with `docs-first`, in the project's docs (requirements, screens, architecture,
  open questions) as `.specify/project/docs.md` describes them; without it, `brief.md` in the draft's
  directory (goal, users, requirements, screens, open questions).
- `ticket.md` — the ticket proposal, exactly in this shape (the dashboard parses it):

  ```markdown
  # Ticket: <title, in the project's ticket style>

  **Labels**: <comma-separated labels, e.g. enhancement>
  **Result**: READY FOR TICKET | OPEN QUESTIONS

  ## Body

  <the ticket's body in markdown: the request, the requirement ids, the plan if one is clear,
  then "## Acceptance criteria" with one "- AC-n: …" line each (naming the requirement ids it
  realises), and "## Not part of it">
  ```

Working files go to `.specify/kit-ui/tmp/`, never `/tmp` or the project root.

## Outline

1. **Parse the input**: the draft slug is required (`/speckit-feature-define <slug>`). Read
   `.specify/kit-ui/drafts/<slug>/input.md`; without it, report that the draft is missing and stop.
   Record `git branch --show-current`: it should be `draft-<slug>`. If not, say so (do not switch).

2. **Understand the request**: the description, every image, and what already exists — the docs
   (with `docs-first`) and the code areas the feature touches. Note what the request takes for
   granted that the code does not do today.

3. **Write the docs draft first**:
   - With `docs-first`: follow its `## feature-define` section — new requirement ids numbered as
     `.specify/project/docs.md` says, the screens and states, the architecture sections or a new
     decision record, and the open questions in the docs' own format.
   - Without it: write `brief.md`.
   - Mark what is still unclear in place (as an open question), never as a decided requirement.

4. **Ask** about what is unclear, as one **numbered** list:
   - Only about **the given topic**. An adjacent idea goes to "Not part of it" in the proposal, not
     into a question.
   - Each question names the options when there are some, and your recommendation.
   - Ask with AskUserQuestion when it is available. In a headless run (the `zs-kit ui` dashboard)
     print the questions and **end the turn**: the maintainer answers by continuing the session.
     Never assume an answer.

5. **Take the answers**: write each answer back into the docs draft (the open question becomes a
   requirement, a decision or a "Not part of it" line). Ask again (step 4) until nothing is open.

6. **Propose the ticket**: write `ticket.md` in the shape above.
   - The AC lines are **drafts**: testable, numbered `AC-1…`, each naming its requirement ids.
     Issue sync checks them against the code and AC approval approves them later.
   - `**Result**: READY FOR TICKET` only when no question is open; else `OPEN QUESTIONS`, and the
     run ends with the questions (step 4).

7. **Report** in English: the docs files changed, the requirement ids, the AC drafts and
   the result line. End with `**Result**: READY FOR TICKET` or the numbered questions.
   - Never create the ticket yourself (no `gh issue create`): the maintainer does it with
     **Create ticket** on the dashboard, after reading the proposal.
   - Never commit: the docs draft is committed once the ticket exists, in the ticket's own flow.
