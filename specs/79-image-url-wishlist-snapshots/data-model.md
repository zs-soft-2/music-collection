# Data model: The entered picture address reaches wishes and stored album copies

**Feature**: `79-image-url-wishlist-snapshots` · **Issue**: #79 · **Date**: 2026-11-07

## Album reference on a wish

`wishlist-item/{uid}.albumReference` (under the collector's user document).

| Field | Type | Before | After |
|---|---|---|---|
| `uid` | string | ✅ | unchanged |
| `name` | string | ✅ | unchanged |
| `coverImage` | `AlbumDocument \| null` | ✅ | unchanged |
| `coverImageUrl` | `string \| null`, optional | — | **new**: the album's entered address at the time of writing, `null` if none |

- Written by `toAlbumReference` only ([contracts/album-reference.md](./contracts/album-reference.md)).
- Wishes stored earlier have no field, which reads as no address. The backfill fills it where the album has one.
- Rules: `wishlist-item` rules do not validate the reference's fields, so no rules change is needed. The rules spec `wishlist-item.rules.spec.ts` stays green.

## Album copy on a pressing

`album/…/release/{uid}.album`: a whole `AlbumEntity` as it was when the pressing was saved.

- Since #60, a save copies `coverImageUrl` with the rest of the album. Older copies lack it.
- Backfill target: `album.coverImageUrl`.

## Album copy on a collection copy

`collection-item/{uid}.release.album`: the pressing copy above, stored again with the copy.

- Backfill target: `release.album.coverImageUrl`. It is independent of the pressing's own copy.

## Backfill rule

For each target document:

| Album's entered address (trimmed) | Copy's value | Action |
|---|---|---|
| blank or the album is missing | anything | none (a missing album is reported) |
| `A` | `A` | none |
| `A` | missing, `null`, blank or `B` | set to `A`, with `updatedAt` stamped |

A second run finds nothing to do. Features written are touched (`touchCatalog`) once at the end.

## Shared collector profile

No stored shape change. `toWishlist` already derives `coverUrl` with `toAlbumCoverUrl(albumReference)`.
The published page changes on the owner's next session after the wish carries the address (R-7).
