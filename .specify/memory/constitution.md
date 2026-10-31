<!--
Sync Impact Report
- Version change: template → 1.0.0
- Modified principles: none
- Added principles: Approved acceptance criteria before implementation (approved-criteria); Root cause over workaround (root-cause); A test proves the change (tests-prove); No change without a ticket (ticket-required); A new capability reaches every layer (capability-every-layer); Layer chain without skipping (layer-chain); Business logic in the store (logic-in-store); No deploy without the maintainer (no-live-changes); Library boundaries by `platform:` tags (nx-platform-boundaries); Library boundaries by `type:` tags (nx-type-boundaries); Every acceptance criterion names its test level (verify-test-levels); The checks pass before review (scripts-checks); The Cloud Functions in `apps/functions` are a project of their own (functions-isolated); Security rules change with a test (firebase-rules); New origins go through the Content-Security-Policy (hosting-csp); és a kliens sosem olvas más gyűjtő csillagát (readme-md-166); Firestore íráshoz mindig wrapperen át (readme-md-395); A debug mód csak a localhost-on kapcsol be (readme-md-456)
  Added by the maintainer: Verification runs on the dev project, carefully (dev-verification); Every model call goes through the AI gateway (ai-gateway); Deleting from the catalog: the client asks, the server decides (deletion-model)
- Left out of the kit catalog: emulators-only (conflicts with how this repo verifies; replaced by dev-verification), iso-dates (timestamps are epoch-ms numbers here), strict-typing (110 files use inline templates, 21 use `as any`) — #69
- Added sections: Core Principles, Governance (the template placeholders are replaced)
- Removed sections: none
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md: its Constitution Check reads this file at run time, no fixed gates to change
  - ✅ .specify/templates/spec-template.md, tasks-template.md: no principle-specific sections
- Follow-up TODOs: none
- Written by: zs-kit 2.1.0 init (kit catalog + the project's own files), refined by hand (#69)
-->
# music-collection Constitution

## Core Principles

### I. Approved acceptance criteria before implementation
<!-- zs-kit: approved-criteria -->

**SHOULD**: Implementation SHOULD start only after the maintainer approved the acceptance criteria (AC-n) of the issue; an open `[NEEDS DECISION]` blocks it.

**Rationale**: agreeing on what "done" means up front is cheaper than reworking a finished change.

Source: zs-kit catalog (core/approved-criteria)

### II. Root cause over workaround
<!-- zs-kit: root-cause -->

**MUST**: A defect MUST be fixed where it originates. A workaround (a guard, a retry, a special case) that hides the symptom is not a fix; when one is unavoidable, it is named as such, tracked in an issue and removed with the real fix.

**Rationale**: workarounds pile up, mask the real fault and make the next change harder to reason about.

Source: zs-kit catalog (core/root-cause)

### III. A test proves the change
<!-- zs-kit: tests-prove -->

**MUST**: A change is done when a test proves it: every acceptance criterion has a passing test (or a recorded manual check), and a bug fix comes with a test that failed before the fix. The test levels and how to run them are in `.specify/project/verify.md`.

**Rationale**: "it works on my machine" is not evidence; a failing-then-passing test is, and it keeps the behaviour from regressing.

Source: zs-kit catalog (core/tests-prove)

### IV. No change without a ticket
<!-- zs-kit: ticket-required -->

**MUST**: Every change to the repository's files (code, configuration, translations, documentation) MUST belong to an issue: open one before the work starts, name the branch after it and reference it in every commit message, e.g. `(#64)`. Answering questions, investigating and reading code need no ticket.

**Rationale**: the issue is where the acceptance criteria are agreed and the change can be traced back to; the issue-driven skills start from it.

Source: zs-kit catalog (core/ticket-required); `CLAUDE.md:5`; `CLAUDE.md:7`; `CLAUDE.md:8`; `CLAUDE.md:9`

### V. A new capability reaches every layer
<!-- zs-kit: capability-every-layer -->

**SHOULD**: A new capability SHOULD be added to every layer: abstract class in the models → implementation in the effect → exposed in the store → used by the consumer.

**Rationale**: a capability that exists in only some layers invites the next change to skip a layer.

Source: zs-kit catalog (angular-firebase/capability-every-layer); `~/.claude/CLAUDE.md:19`; `README.md:239`

### VI. Layer chain without skipping
<!-- zs-kit: layer-chain -->

**MUST**: Code follows the chain Component → Store → Effect → Repository and never skips a layer: a component or a table store never injects a repository; it goes through the store, the store through the effect, the effect through the repository.

**Rationale**: each layer has one responsibility (UI, state, orchestration, data access); skipping one spreads data access and business logic across the UI.

Source: zs-kit catalog (angular-firebase/layer-chain); `~/.claude/CLAUDE.md:5`; `~/.claude/CLAUDE.md:17`; `README.md:232`

### VII. Business logic in the store
<!-- zs-kit: logic-in-store -->

**MUST**: Components are UI only. Business logic (confirmation dialogs, validation) MUST live in the store layer, not in the component class.

**Rationale**: logic in the store is testable without rendering and reusable across components.

Source: zs-kit catalog (angular-firebase/logic-in-store); `~/.claude/CLAUDE.md:18`; `README.md:238`

### VIII. No deploy without the maintainer
<!-- zs-kit: no-live-changes -->

**MUST**: Nobody deploys or writes to a live Firebase project (deploy, infrastructure apply, data scripts) without the maintainer's explicit go-ahead.

**Rationale**: a live environment is shared; a mistake there reaches users and data that cannot be restored from git.

Source: zs-kit catalog (angular-firebase/no-live-changes); `.specify/project/verify.md:29`

### IX. Library boundaries by `platform:` tags
<!-- zs-kit: nx-platform-boundaries -->

**MUST**:

A library depends only on what its tag allows (`@nx/enforce-module-boundaries`, lint error otherwise):
- `platform:agnostic` → `platform:agnostic`
- `platform:agnostic` never imports `@angular/*`, `@ngrx/*`, `primeng`, `primeng/*`, `@primeuix/*`, `@primeicons/*`, `ng-flex-layout`, `ngx-permissions`, `firebase`

**Rationale**: `platform:agnostic` code (the shared contracts and the engine) has to run in the functions, the scripts and the web worker too; one Angular or Firebase import would tie it to the browser app.

Source: `eslint.config.cjs:18`

### X. Library boundaries by `type:` tags
<!-- zs-kit: nx-type-boundaries -->

**MUST**:

A library depends only on what its tag allows (`@nx/enforce-module-boundaries`, lint error otherwise):
- `type:api` → `type:api`
- `type:engine` → `type:api`, `type:engine`
- `type:ui` → `type:api`, `type:engine`, `type:ui`
- `type:core` → `type:api`, `type:engine`, `type:core`
- `type:domain` → `type:api`, `type:engine`, `type:ui`, `type:domain`
- `type:admin` → `type:api`, `type:engine`, `type:ui`, `type:domain`, `type:admin`
- `type:app` → any library

**Rationale**: the tags are the layer rule made executable: the lint fails the build when a lower layer reaches up, so the architecture does not depend on review alone.

Source: `eslint.config.cjs:18`

### XI. Every acceptance criterion names its test level
<!-- zs-kit: verify-test-levels -->

**MUST**:

An acceptance criterion is verified at one of the levels of `.specify/project/verify.md` (or `manual`), and that level's suite passes before the PR:
- `unit`: `npx nx run-many -t test --exclude=firestore-rules,functions`
- `functions`: `npx nx test functions`
- `rules`: `npm run test:rules`
- `e2e`: `npx nx e2e music-collection-e2e`

**Rationale**: a criterion without a level has no agreed proof; naming it up front says which suite has to pass and keeps verification repeatable.

Source: `.specify/project/verify.md:12`

### XII. The checks pass before review
<!-- zs-kit: scripts-checks -->

**SHOULD**: A change goes to review only when these pass: `npm test`, `npm run test:rules`, `npm run lint`, `npm run verify:csp`.

**Rationale**: each check catches what the others miss — the unit tests behaviour, the rules tests access, the lint the boundaries, `verify:csp` a CSP hash that the browser would otherwise drop silently.

Source: `package.json:5`

### XIII. The Cloud Functions in `apps/functions` are a project of their own
<!-- zs-kit: functions-isolated -->

**MUST**: `apps/functions` (codebase `security`) is its own npm project, compiled by its own `tsconfig.app.json` with `rootDir: src`: it never imports from the workspace libraries; shared server logic lives under `apps/functions`.

**Rationale**: the functions are built and deployed by Cloud Build from `apps/functions` alone; an import from `libs/` compiles locally and breaks the deploy.

Source: `firebase.json:8`; `apps/functions/tsconfig.app.json:7`; `.specify/project/verify.md:17`; `README.md:262`

### XIV. Security rules change with a test
<!-- zs-kit: firebase-rules -->

**MUST**: A change to `firestore.rules` or `storage.rules` comes with a rules test that passes (`npm run test:rules`).

**Rationale**: the rules are the only thing between the public client and the data; a rules change without a test is a security change nobody checked.

Source: `firebase.json:3`; `firebase.json:95`

### XV. New origins go through the Content-Security-Policy
<!-- zs-kit: hosting-csp -->

**SHOULD**: Hosting sends a Content-Security-Policy (`firebase.json`): a new external origin is added there and checked with `npm run verify:csp`.

**Rationale**: an origin missing from the CSP fails silently in the browser (no image, a failed request), and a guessed wildcard weakens the policy for everything else.

Source: `firebase.json:43`

### XVI. A collector's private data leaves their user document only as a sum
<!-- zs-kit: readme-md-166 -->

**MUST**: What one collector gave or keeps privately (a rating, a copy, a price) is readable only by
that collector. Anything shown to others — a community average, a count, a ranking — is computed on
the server (a trigger or a scheduled function, e.g. `album-rating/{albumId}`) and published as an
aggregate. The client never reads another collector's private documents, and the rules do not let
it.

**Rationale**: a client-side aggregate would need every collector's data, which the rules rightly
refuse; a server-written sum keeps who-gave-what private and stays correct when a trigger runs
twice.

Source: `README.md:166`; `firestore.rules:230`; `apps/functions/src/album-rating.ts`

### XVII. Firestore writes go through the wrappers
<!-- zs-kit: readme-md-395 -->

**MUST**: The client writes to Firestore only through `FirestoreSyncService` (libs/api), and the
`tools/` scripts only through `tools/sync/catalog-sync.mjs` (or `tools/discogs/catalog-write.mjs`,
which builds on it) — never with a bare `setDoc`/`batch.set`. The wrapper keeps `updatedAt` and the
`sync/catalog` marker in step with the write.

**Rationale**: the clients keep the catalog in a versioned local cache fed by bundles and deltas; a
write that skips the marker is invisible to them until the next full download.

Source: `README.md:395`; `libs/api/src/lib/core/firebase/firestore-sync.service.ts`

### XVIII. The App Check debug token is for localhost only
<!-- zs-kit: readme-md-456 -->

**MUST**: The App Check debug provider is switched on only when the app runs on a local host
(`localhost`, `127.0.0.1`, `[::1]`) and never in a production build. The debug token stays out of
git (`.app-check-debug-token`, generated `app-check-debug-token.ts`).

**Rationale**: whoever holds the token can call the dev callables and read dev Firestore past App
Check; a token that leaks into a deployed build turns the protection off for everyone.

Source: `README.md:456`; `apps/music-collection/src/app/app.config.ts:80`

### XIX. Verification runs on the dev project, carefully
<!-- project: dev-verification -->

**MUST**: Behaviour is verified against the **dev** Firebase project (`music-collection-16676`):
`nx serve` and the Cypress e2e read its data and call its deployed callables. The security rules are
the exception: their tests run on the Firestore emulator (`npm run test:rules`, project
`demo-music-collection`). Verification only reads dev data or writes what it cleans up again; seeding,
`tools/` scripts with `--confirm`, deploys and `tofu apply` need the maintainer's go-ahead (VIII).
Prod is never used for verification.

**Rationale**: the catalog, the bundles and the App Check setup that a change has to work with exist
only on the dev project; an emulator would test against empty, unrealistic data. The rules are the
one part an emulator checks better, because every allow/deny case can be set up there.

Source: `.specify/project/verify.md:15`; `.specify/project/verify.md:22`; `apps/firestore-rules/project.json:11`

### XX. Every model call goes through the AI gateway
<!-- project: ai-gateway -->

**MUST**: Every call to an AI model (text, vision, image, video) is made by a Cloud Function through
the AI gateway (`apps/functions/src/gateway-client.ts`, `@zssz-soft/zs-ai-sdk`), with the
`GATEWAY_API_KEY` secret. No provider SDK or provider key (Anthropic, Vertex, Gemini) is used in the
functions, and the client never calls a model. A paid call is bounded by a daily quota checked
before the model is called, and a prompt is built on the server from stored data, not taken from the
caller.

**Rationale**: the gateway holds the provider keys, the price list and the budget in one place;
a direct provider call escapes all three, and a client-built prompt lets anyone spend on our
account.

Source: `apps/functions/README.md` (Modellhívások); `apps/functions/src/gateway-client.ts:2`

### XXI. Deleting from the catalog: the client asks, the server decides
<!-- project: deletion-model -->

**MUST**: A catalog entity that collectors may hold (an album, a release) is deleted only through a
callable (`deleteAlbumEntity`, `deleteReleaseEntity`); the rules forbid the client to delete it. If
the deletion would touch another collector's copy or rating, the callable refuses with
`failed-precondition` and the client offers archiving (`active: false`) instead. A collector's own
copy is withdrawn, not deleted, so its history stays.

**Rationale**: only the server can see every collector's documents, so only it can tell whether a
deletion is safe; a client-side check would race and would need reads the rules do not allow.

Source: `apps/functions/src/catalog-deletion.ts`; `README.md` (Katalógus-karbantartás)

## Governance

This constitution supersedes other practices in this repository. Every specification, plan and
change is checked against it: `speckit-issue-sync`, `speckit-issue-analyze` and
`speckit-issue-verify` report a violation as a finding. Amendments go through
`/speckit-constitution` with a version bump (MAJOR: a principle removed or redefined, MINOR: a
principle added, PATCH: wording) and a Sync Impact Report at the top; `zs-kit init` only adds
principles. Every principle names its `Source:`; when a source changes after the Last Amended date,
`zs-kit status` reports the constitution as stale. Runtime guidance: `CLAUDE.md`.

**Version**: 1.0.0 | **Ratified**: 2026-10-31 | **Last Amended**: 2026-10-31
