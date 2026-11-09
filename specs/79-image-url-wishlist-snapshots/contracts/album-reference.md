# Contract: `toAlbumReference`

**Import**: `@music-collection/api` · **Source**: `libs/api/src/lib/domain/music/album/album-reference.ts`

Builds the narrow album copy a wish stores.

## Signature

```ts
toAlbumReference(
	album: Pick<Album, 'coverImage' | 'coverImageUrl' | 'name'> & Identifiable
): AlbumReference
```

## Guarantees

| # | Given | Returns |
|---|---|---|
| G1 | any album or reference | exactly the keys `uid`, `name`, `coverImage`, `coverImageUrl`, and nothing else (a whole `AlbumEntity` in, no extra fields out) |
| G2 | `coverImageUrl` missing or `undefined` | `coverImageUrl: null` |
| G3 | `coverImage` missing or `undefined` | `coverImage: null` |
| G4 | any value | `coverImageUrl` as given, not trimmed or validated: the readers decide what counts as an address |

## Callers

- `WishlistItemUtilServiceImpl.createEntity` and `.updateEntity`
- `album-wishlist.feature.ts` `addToWishlist`

Any future writer (e.g. the mobile wishlist, #107) uses it too.
