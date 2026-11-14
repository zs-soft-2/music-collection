# Quickstart: validating #79

**Feature**: `79-image-url-wishlist-snapshots` · **Issue**: #79 · **Date**: 2026-11-07

Test levels and commands follow `.specify/project/verify.md`. Shapes and rules are in
[data-model.md](./data-model.md); interfaces are in [contracts/](./contracts/).

## Automated checks

No login, emulator or deploy is needed. Run the projects serially: parallel runs have crashed
jest workers on this machine.

```bash
for p in api domain-wishlist-item domain-release domain-collection-item ui music-collection; do
  npx nx test $p --runInBand
done
npm run test:rules
npx nx run-many -t lint -p api,domain-wishlist-item,ui,music-collection
npm run verify:csp
node --check tools/sync/backfill-album-cover-url.mjs
node --check tools/sync/seed-mock-collectors.mjs
```

| AC | Proven by |
|---|---|
| AC-1 | `wishlist-item-util.service.impl.spec.ts` (create, update, update with a whole album), `album-page.store.spec.ts` (`addToWishlist`), `album-reference.spec.ts` (G1–G4). They fail before the change. |
| AC-2 | The table, simple-view, wishlist-page, wishlist-item-page and collector-profile specs, with real `AlbumReference` fixtures carrying an address |
| AC-4 (unit) | `music-view.mapper.spec.ts`, `release-table.component.spec.ts`, `collection-item-table.component.spec.ts`, `pressing-row.spec.ts`: a snapshot's address wins over its attachment |
| AC-5 | `collector-profile.model.spec.ts`: the fingerprint differs when the wish gains an address |
| AC-6 | `music-view.mapper.spec.ts`: case 16 still holds; a blank banner path falls through |

## Manual checks

| AC | Check | Expected |
|---|---|---|
| AC-7 | `grep -rni -e 'used when no' -e 'without an uploaded image' libs/api/src/lib/domain/music/` | Only `artist.ts:32` |
| AC-8 | Read the seeded `albumReference` | It has `coverImageUrl: wish.coverUrl`. The seed is not run. |

## Backfill on dev (needs the maintainer's go-ahead for step 2)

1. Dry run: `node tools/sync/backfill-album-cover-url.mjs --env dev`. Record the counts per target and the missing albums in `manual-checks.md`.
2. With the go-ahead: the same command with `--confirm`. Record the written counts.
3. Run step 1 again. Expected: 0 to fill in for every target (SC-002).
4. Logged in on `http://127.0.0.1:4200` (dev data), open a wish created before the change, and a pressing and a copy of an album with an entered address. Expected: the entered cover on the wishlist page, the release view, the release table, the copy table and the pressing row (AC-3, AC-4, SC-003). This step needs an admin login.

Results go to `manual-checks.md`.
