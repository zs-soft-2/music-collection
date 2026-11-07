# Contract: `tools/sync/backfill-album-cover-url.mjs`

Copies each album's entered picture address onto the album copies stored with wishes, pressings
and collection copies.

## Usage

```bash
node tools/sync/backfill-album-cover-url.mjs [--env dev|prod] [--read-all] [--catch-up] [--confirm]
```

| Option | Meaning |
|---|---|
| `--env` | Target project, as in the other `tools/sync` scripts (default from `environment.mjs`) |
| `--read-all` | Read albums from Firestore when no usable bundle exists (costs one read per album) |
| `--catch-up` | Accept a bundle delta of any size |
| `--confirm` | Write. Without it, the run is a dry run. |

Needs Firebase Admin credentials, like the other scripts.

## Output

One line per stage:
- the albums read, and how many have an address;
- per target (`wishlist-item`, `release`, `collection-item`): documents read and documents to fill in;
- the documents whose album is missing;
- for a dry run, `DRY RUN, add --confirm to write`;
- with `--confirm`, write progress and the touched features.

## Guarantees

| # | Guarantee |
|---|---|
| B1 | Without `--confirm`, nothing is written |
| B2 | Writes go only through `stamp` and `touchCatalog` from `catalog-sync.mjs`, in batches of ≤ 400 |
| B3 | Only the one nested `coverImageUrl` field of each target is written |
| B4 | It never writes when the album has no address, so it never removes or blanks one |
| B5 | It is idempotent: a second run reports 0 to fill in |
| B6 | It refuses to run, with the message from `bundle-reader.mjs`, when the album bundle is unusable and `--read-all` is not given |

Running it with `--confirm` against any project needs the maintainer's go-ahead (constitution VIII, XIX).
