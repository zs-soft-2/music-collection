# Docs first

Synced by zs-kit (profile `docs-first`). The docs are the source of truth: a change is written
into the docs **before** the code, and the code is checked against them at the end. The issue skills
(`speckit-feature-define`, `speckit-issue-sync`, `speckit-issue-analyze`, `speckit-issue-verify`) read this file; the
project's own layout is in `.specify/project/docs.md` (project-owned, not synced; example:
`docs/examples/dunaweekend-docs.md` in the zs-kit package). It names:

- the **requirements** files and the id format (e.g. `REQ-BOOK-005`), and how a new id is numbered;
- the **deviation marker**: the line that records where the code does not meet a requirement yet,
  with the issue that will close it (e.g. `**Eltérés:** … — #172`);
- the **screens** (prototype states) and the command that captures them from the running app;
- the **architecture** docs and decision records (ADRs);
- the **open questions** (e.g. `Q-…`) the docs keep.

## feature-define

A new feature written up before it has a ticket (`/speckit-feature-define`, the dashboard's New
feature): the docs come first, so the draft goes straight into them.

- add the new requirements to the requirements file they belong to, each with the next free id of
  that file; a requirement still unclear is an open question, not an id;
- name the screens and states the feature shows on; new states are derived from a real capture
  later, never invented now;
- add to the architecture docs the sections the feature changes, and propose a decision record when
  it makes one;
- record each open question in the docs' own format, and turn it into a requirement or a decision
  when the maintainer answers it.

The ticket proposal names the requirement ids, and every AC draft names the ids it realises.

## issue-sync

Find what the issue touches in the docs:

- the requirement ids whose behaviour changes, the new ones needed (proposed id: the next free
  number of their file), and every deviation line that names this issue (each is a target: the code
  must reach the requirement, and the line goes);
- the screens and states the change shows on, and the new states to derive from a real capture;
- the architecture sections it changes, and whether it needs a new decision record;
- the open questions it settles.

Every AC names the requirement ids it realises. Report them in the `### Docs` table.

## issue-analyze

| Check | Severity |
|---|---|
| A requirement, screen state or architecture section the feature changes (`issue-sync.md` → Docs) has no task that updates the docs | CRITICAL |
| A docs task comes after the implementation tasks it describes (docs first) | HIGH |
| An AC names no requirement id | HIGH |
| A deviation line naming this issue has no AC that closes it | HIGH |

Add a `REQ` column to the coverage table and the metric
`Docs: <changes with a task>/<total>`.

## issue-verify

- Every requirement the ACs name, and every requirement the feature added or changed, has evidence
  like an AC (a test or observed behaviour, plus the code); a requirement without it is ❌.
- No deviation line of this issue is left, and no new one was added without the user's decision.
- The docs changes are on the branch (`git diff dev...HEAD -- docs/`).
- The changed screens are captured again from the implemented app (with the command of
  `.specify/project/docs.md`; a deploy first if the server changed — ask), and every hand-derived
  state of the ticket now matches the capture; a difference is ❌ unless the user accepts it.
- Behaviour the diff adds that no requirement describes is ⚠️ "undocumented": add the requirement or
  drop the behaviour.

READY FOR PR additionally needs: every touched requirement ✅, no deviation line of the issue left,
the screens captured again.
