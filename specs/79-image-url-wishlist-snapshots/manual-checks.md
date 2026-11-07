# Manual checks: The entered picture address reaches wishes and stored album copies

**Feature**: `79-image-url-wishlist-snapshots` · **Issue**: #79

Written by T015, T016 and T021. `/speckit-issue-verify` reads this file as evidence.

## AC-7: field comments (2026-11-07)

```text
$ grep -rni -e 'used when no' -e 'without an uploaded image' libs/api/src/lib/domain/music/
libs/api/src/lib/domain/music/artist/artist.ts:32:	/** Photo on Discogs, for artists without an uploaded image. */
```

Only the Discogs line is left, as intended. `album.ts:30` and `artist.ts:44` state that the entered address takes precedence.

## AC-8: mock seed (2026-11-07)

`git diff tools/sync/seed-mock-collectors.mjs` adds one line to the seeded `albumReference`:
`coverImageUrl: wish.coverUrl,`. `node --check` passes. The seed was not run.

## Backfill dry run on dev (T015, 2026-11-07)

`node tools/sync/backfill-album-cover-url.mjs --env dev`, read-only:

```text
music-collection-16676: 3787 albums (bundle bundles/album/1792914064.bundle), 1522 of them have an entered cover address
  wishlist-item: 24 read, 15 to fill in
  release: 712 read, 18 to fill in
  collection-item: 721 read, 20 to fill in
  1751 document read(s), 53 to be written

DRY RUN — add --confirm to write
```

No target names an album the catalog lacks. Node printed two `MaxListenersExceededWarning` lines from the Storage download stream; they do not affect the result.

## Backfill run on dev (T016, 2026-11-07)

Run after the maintainer's explicit go-ahead in the session (constitution VIII, XIX).

```text
$ node tools/sync/backfill-album-cover-url.mjs --env dev --confirm
music-collection-16676: 3787 albums (bundle bundles/album/1792914064.bundle), 1522 of them have an entered cover address
  wishlist-item: 24 read, 15 to fill in
  release: 712 read, 18 to fill in
  collection-item: 721 read, 20 to fill in
  1751 document read(s), 53 to be written
  written 53/53
wishlist-item, release, collection-item touched

$ node tools/sync/backfill-album-cover-url.mjs --env dev
  wishlist-item: 24 read, 0 to fill in
  release: 712 read, 0 to fill in
  collection-item: 721 read, 0 to fill in
  1751 document read(s), 0 to be written
```

| Step | Expected | Result |
|---|---|---|
| `--confirm` run | 53 written; `wishlist-item`, `release` and `collection-item` touched | ✅ 53/53, all three touched |
| Dry run again | 0 to fill in for every target (SC-002) | ✅ 0 / 0 / 0 |

## Logged-in checks on dev data (T021)

Needs an admin login on `http://127.0.0.1:4200` after T016. Do not press Save.

| Check | Expected | Result |
|---|---|---|
| A wish stored before #79 whose album has an entered address, on the wishlist page and its own page | The entered cover (AC-3) | open |
| A pressing of such an album: release view, release table, pressing row | The entered cover (AC-4) | open |
| A copy of such an album in the copy table | The entered cover (AC-4) | open |
