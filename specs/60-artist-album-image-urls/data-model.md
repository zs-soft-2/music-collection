# Phase 1 data model: Entered image URLs take precedence

**Feature**: `60-artist-album-image-urls` · **Issue**: #60 · **Date**: 2026-11-01

**No schema change.** Every field below already exists on the Firestore documents and in the
TypeScript entities. This feature changes only the order in which they are consulted. There is no
migration, no backfill script, no new index, and no rules change.

---

## Entities

### Artist (`artist/{uid}` → `ArtistEntity`, `libs/api/src/lib/domain/music/artist/artist.ts`)

| Field | Shape | Role | Touched? |
|---|---|---|---|
| `imageUrl` | `string \| null` | the **entered** photo address, typed by the admin into a free-text field (`artist-form.component.html:161`, control created at `artist-util.service.impl.ts:194`) | order only |
| `mainImage` | document reference `{ uid, name, filePath, … }` | the **attached** main picture, chosen from the document search | order only — still stored, still selectable (FR-007) |
| `headerImage` | document reference | the **attached** header picture, a role of its own | **not reordered** (FR-006) |
| `discogs.imageUrl` | `string \| null` | the **imported** external photo, written by the Discogs/MusicBrainz import | order only — stays last |

No validator exists on `imageUrl` and none is added: the field is free text by design
(`issue-sync.md` C1), and the screenshot's red outline is a separate ticket (gate decision 4).

### Album (`album/{uid}` → `AlbumEntity`, `libs/api/src/lib/domain/music/album/album.ts`)

| Field | Shape | Role | Touched? |
|---|---|---|---|
| `coverImageUrl` | `string \| null` | the **entered** cover address (`album-form.component.html:256`, control at `album-util.service.impl.ts:220`) | order only |
| `coverImage` | document reference | the **attached** cover picture | order only — still stored, still selectable (FR-007) |

`SimpleAlbum` is `Omit<AlbumEntity, 'year'>` (`album.ts:116`) and carries both fields, so the
`album-simple-view` surface needs no type change.

### Image document (`document/{uid}` → `DocumentEntity`, `libs/api/src/lib/domain/document/document.ts:27`)

`filePath` is a Cloud Storage download URL stored as a plain string. **Entirely unaffected**: this
feature never reads, writes, uploads or deletes a document, and the forms' autocomplete keeps
offering them (FR-007).

---

## The rule

One statement, applied in two implementations (browser + Cloud Functions — see
[research.md](./research.md) D2). Full case table and signatures:
[contracts/image-url-rule.md](./contracts/image-url-rule.md).

| Derived value | Order after this change | Order before |
|---|---|---|
| **artist picture** | `imageUrl` → `mainImage.filePath` → `discogs.imageUrl` → `null` | `mainImage.filePath` → `imageUrl` → `discogs.imageUrl` → `null` |
| **artist header** | `headerImage.filePath` → *artist picture* | `headerImage.filePath` → `imageUrl` |
| **album cover** | `coverImageUrl` → `coverImage.filePath` → `null` | `coverImage.filePath` → `coverImageUrl` → `null` |

Three properties hold for all three:

1. **An empty string counts as absent.** `''` falls through to the next candidate, as `||` already
   does at every current site. Firestore stores a cleared field as `null`, but the form control
   emits `''` on a cleared input, so both must behave the same.
2. **No fallback after a failed load.** The rule picks an address; whether the browser can fetch it
   is not the rule's business. Once an entered URL exists, the attachment is not offered as a
   backup — deliberately, see spec Edge Cases.
3. **No side effect.** Pure function, no logging, no throw, no `null` dereference on a partial
   object.

### Why the header is the exception (FR-006)

An artist has **two** attachment roles — `headerImage` and `mainImage` — but only **one** entered
address, `imageUrl`. Putting `imageUrl` in front of `headerImage` would let a replacement photo
silently become the page banner, which is a different picture at a different aspect ratio. So the
header keeps `headerImage` first and only then follows the artist-picture order, which means an
artist with no attached header and an entered URL now gets the entered URL as its banner — that is
AC-3's "their detail header", and it is an improvement over today's empty frame at
`artist-detail-view.component.html:8`.

---

## Surfaces

25 code sites consult one of the three derived values. Line numbers are as of `46ce1de4`.

### Group A — the attachment wins today, to be reversed (16 sites)

| # | Site | Value |
|---|---|---|
| A1 | `libs/ui/src/lib/music-view/music-view.mapper.ts:95` | artist picture |
| A2 | `libs/ui/src/lib/music-view/music-view.mapper.ts:73` | album cover (via `release.album`) |
| A3 | `libs/ui/src/lib/music-view/music-view.mapper.ts:118` | album cover |
| A4 | `libs/domain/music/artist/…/artist-table.component.ts:62` | artist picture |
| A5 | `libs/domain/music/album/…/album-table.component.ts:78` | album cover |
| A6 | `libs/domain/music/release/…/release-table.component.ts:81` | album cover |
| A7 | `libs/domain/music/collection-item/…/collection-item-table.component.ts:65` | album cover |
| A8 | `libs/domain/music/album/src/lib/view/simple/album-simple-view.component.html:3` | album cover |
| A9 | `libs/domain/music/album/src/lib/view/item/album-item-view.component.html:5` | album cover |
| A10 | `libs/domain/music/album/src/lib/view/detail/album-detail-view.component.html:14` | album cover |
| A11 | `libs/domain/music/music-collection/core/src/lib/music-collection.mapper.ts:36` | album cover |
| A12 | `apps/music-collection/src/app/shared/entity-view/pressing-row.ts:45` | album cover |
| A13 | `apps/music-collection/src/app/shared/player/player.store.ts:289` | album cover |
| A14 | `apps/music-collection/src/app/shared/player/player.store.ts:869` | album cover |
| A15 | `apps/functions/src/music-collection-badge-facts.ts:74,88` | album cover (server) |
| A16 | `apps/functions/src/daily-question-compose.ts:169,183` | album cover (server) |

### Group B — the entered URL has no role today, to be wired up (9 sites, 8 surfaces)

| # | Site | Value |
|---|---|---|
| B1 | `libs/domain/music/artist/…/simple/artist-simple-view.component.html:26` | artist picture |
| B2 | `libs/domain/music/artist/…/detail/artist-detail-view.component.html:8` | artist **header** |
| B3 | `libs/domain/music/album/…/simple/album-simple-view.component.html:1` (background) | album cover |
| B4 | `libs/domain/music/wishlist-item/…/wishlist-item-table.component.ts:64` | album cover |
| B5 | `libs/domain/music/wishlist-item/…/wishlist-item-simple-view.component.html:12` | album cover |
| B6 | `libs/domain/music/wishlist-item/…/wishlist-item-simple-view.component.html:56` | album cover |
| B7 | `apps/music-collection/src/app/page/wishlist-item/wishlist-item-page.store.ts:54` | album cover |
| B8 | `apps/music-collection/src/app/page/wishlist/wishlist-page.store.ts:109` | album cover |
| B9 | `apps/music-collection/src/app/data/collector-profile/collector-profile.model.ts:442` | album cover |

B5 and B6 are the horizontal and vertical layouts of one component, hence 9 sites / 8 surfaces.

### Group C — deliberately unchanged (2 sites)

| # | Site | Why |
|---|---|---|
| C1 | `libs/ui/src/lib/music-view/music-view.mapper.ts:105` | the artist header's attachment keeps precedence — FR-006, AC-6. It gains the new artist-picture order only through its fallback. |
| C2 | `apps/music-collection/src/app/page/admin/dashboard/admin-dashboard.mapper.ts:70` | the admin completeness row asks "is a header **attached**", not "does a header render" — [research.md](./research.md) D5. |

### Text

| Site | Change |
|---|---|
| `libs/core/i18n/assets/i18n/{hu,en,de}.json` → `ui.artistForm.used-when-no-main` | new text, key renamed to `url-wins-over-main` — [research.md](./research.md) D4 |
| `libs/core/i18n/assets/i18n/{hu,en,de}.json` → `ui.albumForm.used-when-no-cover` | new text, key renamed to `url-wins-over-cover` |
| `artist-form.component.html:164`, `album-form.component.html:260` | the renamed key (it is a `placeholder`, not a separate hint element — D4) |

---

## Traceability

| AC | FR | Rule | Sites |
|---|---|---|---|
| AC-1 | FR-001 | artist picture | A1, A4, B1, and every consumer of `toArtistView` |
| AC-2 | FR-002 | album cover | A2, A3, A5–A14 |
| AC-3 | FR-003 | artist picture / header / album cover | B1–B9 |
| AC-4 | FR-004 | album cover (server) | A15, A16 |
| AC-5 | FR-005 | — | the two i18n keys × 3 languages |
| AC-6 | FR-006 | artist header | C1, and B2 which now follows it |
| — | FR-007 | — | no site: the proof is that `coverImage` / `mainImage` are still read (the rule's spec) and still selectable (the form specs) — [research.md](./research.md) D6 |
