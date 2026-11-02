# Quickstart: proving the entered image URL wins

**Feature**: `60-artist-album-image-urls` · **Issue**: #60 · **Date**: 2026-11-01

How to validate this feature end to end. Levels and commands follow
`.specify/project/verify.md`; the rule itself is in
[contracts/image-url-rule.md](./contracts/image-url-rule.md), the site list in
[data-model.md](./data-model.md).

> This is the run/validate guide. Implementation detail belongs in `tasks.md`.

---

## Prerequisites

```bash
npm ci                                 # or npm install
```

Nothing else for the automated checks: no emulator, no Firebase login, no deploy. The rules
emulator is only needed for the unrelated regression check in step 5.

For the optional manual pass (step 7) you additionally need the dev App Check debug token and a
Google login — see `.specify/project/verify.md` → Environments.

---

## 1. Watch the tests fail first (constitution III)

Write the two new spec files before the source change and run them. They must fail, naming the old
order:

```bash
npx nx test common-engine --testFile=libs/common/engine/src/lib/image-url.spec.ts
npx nx test functions     --testFile=apps/functions/src/catalog-image-url.spec.ts
```

**Expected before the change**: both fail to resolve the module (the rule does not exist yet). After
the rule is added but before the call sites are migrated, these pass while step 2's suites still
fail — that split is the proof the order really moved.

---

## 2. The acceptance criteria, per level

### `unit` — AC-1, AC-2, AC-3, AC-5, AC-6

```bash
# the rule itself — the case table in contracts/image-url-rule.md §3
npx nx test common-engine --testFile=libs/common/engine/src/lib/image-url.spec.ts

# AC-1, AC-2, AC-6 — the shared view mapper (new file)
npx nx test ui --testFile=libs/ui/src/lib/music-view/music-view.mapper.spec.ts

# AC-1, AC-2 — the catalog tables
npx nx test domain-artist --testFile=libs/domain/music/artist/src/lib/collection/component/table/artist-table.component.spec.ts
npx nx test domain-album  --testFile=libs/domain/music/album/src/lib/collection/component/table/album-table.component.spec.ts

# AC-3 — the surfaces that ignored the field
npx nx test domain-artist        --testFile=libs/domain/music/artist/src/lib/view/component/simple/artist-simple-view.component.spec.ts
npx nx test domain-wishlist-item --testFile=libs/domain/music/wishlist-item/src/lib/collection/component/table/wishlist-item-table.component.spec.ts
npx nx test music-collection     --testFile=apps/music-collection/src/app/data/collector-profile/collector-profile.model.spec.ts

# AC-5 (+ the FR-007 assertions, research.md D6) — the form placeholders in hu/en/de
npx nx test domain-artist --testFile=libs/domain/music/artist/src/lib/form/component/artist-form.component.spec.ts
npx nx test domain-album  --testFile=libs/domain/music/album/src/lib/form/component/album-form.component.spec.ts
```

Whole level:

```bash
npx nx run-many -t test --exclude=firestore-rules,functions
```

### `functions` — AC-4

```bash
npx nx test functions --testFile=apps/functions/src/catalog-image-url.spec.ts
npx nx test functions --testFile=apps/functions/src/music-collection-badge-facts.spec.ts
npx nx test functions --testFile=apps/functions/src/daily-question-compose.spec.ts
```

Whole level:

```bash
npx nx test functions
npx tsc -p apps/functions/tsconfig.app.json --noEmit    # the functions' own type-check
```

**Expected**: an album fixture carrying both `coverImage.filePath` and `coverImageUrl` yields the
`coverImageUrl` in the badge facts and in the composed daily question.

> AC-4 is only *observable* in the product after a functions deploy, which is the maintainer's call
> (constitution VIII). These suites prove it without one — see [research.md](./research.md) D7.

---

## 3. The boundary rules actually hold (constitution IX, X)

The rule module is `platform:agnostic`; a stray Angular or Firebase import would be a lint error,
and so would a library reaching up a layer. `npm run lint` only lints the app, so lint the workspace:

```bash
npx nx run-many -t lint
```

**Expected**: no `@nx/enforce-module-boundaries` error. In particular no
`platform:agnostic → platform:angular` violation from `libs/common/engine`, and no complaint from
`domain-wishlist-item` or `domain-collection-item`, the only two projects that gain a *new*
dependency on `common-engine` (`type:domain → type:engine` is allowed). The other consumers — `ui`,
`domain-artist`, `domain-album`, `domain-release`, `music-collection-core` and the app — already
import `@music-collection/common/engine` today, so for them nothing about the graph changes.

---

## 4. The four pre-review checks (constitution XII)

```bash
npm test             # nx test music-collection   — the app project only
npm run test:rules   # nx test firestore-rules    — Firestore emulator
npm run lint         # nx lint music-collection   — the app project only
npm run build:dev    # → verify:csp
```

Two notes:

- `npm test` and `npm run lint` are scoped to the `music-collection` app. Most of this change is in
  libraries, so the `run-many` commands in steps 2 and 3 are the ones that matter here; these four
  are the constitution's gate, not the full coverage.
- `npm run verify:csp` must run against a **fresh** build. `issue-sync.md` records it failing once
  against a stale `dist/`; `npm run build:dev` runs the build and the check together, which avoids
  that. No new origin is introduced by this feature (`issue-sync.md` C4), so this is purely a
  regression check.

**Expected** from `verify:csp`: *"The hosting CSP matches the built page…"*.

---

## 5. Regression guards

| Guard | Check | Why |
|---|---|---|
| **AC-6 / SC-003** — the artist header | `music-view.mapper.spec.ts` case 16, plus opening an artist with an attached header in step 7 | the one site that must **not** flip (`music-view.mapper.ts:105`) |
| **FR-007** — attachments stay | the form specs' assertion that the document autocomplete controls are still present, plus the rule's cases 2 and 11 | the feature reorders, it never removes |
| **Baseline** | `npx nx run-many -t test -p domain-artist domain-album --skip-nx-cache` | the green baseline recorded in `issue-sync.md` (18.8 s) — compare against it |
| **Rules untouched** | `npm run test:rules` | nothing in `firestore.rules` / `storage.rules` changes; this proves it |

---

## 6. The drift guard between the two implementations

The browser rule and the server rule are separate files by constitution XIII
([research.md](./research.md) D2). Cases 1–8 of
[contracts/image-url-rule.md](./contracts/image-url-rule.md) §3 are asserted in **both** suites.

```bash
npx nx test common-engine --testFile=libs/common/engine/src/lib/image-url.spec.ts
npx nx test functions     --testFile=apps/functions/src/catalog-image-url.spec.ts
```

**Expected**: identical verdicts for the eight shared cases. If one suite is edited and the other is
not, the two files have drifted and the contract file is the arbiter.

---

## 7. Optional manual pass (read-only, dev project)

Only reads dev data and writes nothing, per constitution XIX. Needs the maintainer's go-ahead for
nothing — but also proves nothing the suites do not, so it is optional.

```bash
npm start      # serves on http://127.0.0.1:4200 — use 127.0.0.1, not localhost
```

Pick, in the dev catalog, one artist and one album that already have **both** an attachment and an
entered URL, and one of each whose **only** picture is an entered URL. Then:

| Surface | Expect |
|---|---|
| Artists / Albums table | the entered picture (AC-1, AC-2) |
| Album card, item and detail views | the entered cover (AC-2) |
| Artist simple view | the entered photo, not an empty frame (AC-3) |
| Artist detail header, artist **with** an attached header | the **attached** header (AC-6, SC-003) |
| Artist detail header, artist **without** one | the entered photo (AC-3) |
| Wishlist and a wishlist item page | the entered cover (AC-3) |
| A shared collector profile | the entered cover in the wishlist block (AC-3) |
| The player | the entered cover (AC-2) |
| Artist form / album form, in hu, en and de | the placeholder states that the entered URL wins (AC-5) |
| Admin dashboard, artist completeness | the "header image" row still reflects the **attachment** — [research.md](./research.md) D5 |

Also confirm the forms still offer the document search and still hold the existing attachment
(FR-007), and that nothing was saved during the pass.

---

## Definition of done

- [ ] Both new spec files failed before the change and pass after (step 1)
- [ ] `npx nx run-many -t test --exclude=firestore-rules,functions` green
- [ ] `npx nx test functions` green and `tsc -p apps/functions/tsconfig.app.json --noEmit` clean
- [ ] `npx nx run-many -t lint` green — no boundary violation
- [ ] `npm run test:rules` green
- [ ] `npm run build:dev` green, including `verify:csp`
- [ ] Every AC-1…AC-6 traced to a named passing test (the table in `spec.md`)
- [ ] The PR says the functions deploy is pending the maintainer (constitution VIII) and that AC-4 is
      not observable in the product until then
- [ ] The PR carries [research.md](./research.md) D5's narrowing of SC-002 and D8's two follow-up
      findings, for the maintainer to accept or overrule
