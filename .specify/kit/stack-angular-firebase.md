# Stack rules: Angular + Firebase

Synced by zs-kit (profile `angular-firebase`). The issue skills (`speckit-issue-sync`, `speckit-issue-analyze`, `speckit-issue-verify`, and `speckit-issue-check` of the `agent-ticket` profile) and
`docs-code-check` read this file as part of the governance sources.

## Architecture rules (report violations as `RULE` / constitution findings)

- Layer chain: Component → Store → Effect → Repository. Never skip a layer.
- A component or table store must never inject a repository directly.
- Business logic (confirmation dialogs, validation) belongs in the store layer, not in the component class.
- A new capability must be added to every layer: abstract class in models → implementation in effect → exposed in the store → used by the consumer.
- Dates are stored in Firestore as ISO strings, never as `Timestamp`.
- No `as any`, no `standalone: true` (it is the default), no inline templates.
- No workarounds: fix the root cause.

## Verification procedures (used by `speckit-issue-verify`)

- Unit tests run with `jest`; run a single spec with `npx jest <path>`.
- Behaviour is verified against the **Firebase emulators**, never a live project:

  ```bash
  firebase emulators:start --project=music-collection-16676
  ```

  The dev-server ports, the seed command and the emulator login credentials are project-specific: see `.specify/project/verify.md`.
- Never deploy, and never run against a live Firebase project.

## Model routing (read by the `speckit-tasks` patch)

Tag these tasks `[opus]`: Firestore/Storage rules, authorisation, Cloud Functions access checks, and
changes to shared libraries under `projects/`.
