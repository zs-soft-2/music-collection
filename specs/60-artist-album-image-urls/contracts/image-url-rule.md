# Contract: the image-URL precedence rule

**Feature**: `60-artist-album-image-urls` · **Issue**: #60 · **Date**: 2026-11-01

This is the one written statement of the order. Two implementations exist — one for the browser, one
for the Cloud Functions — because `apps/functions` may not import workspace libraries (constitution
XIII, [research.md](./research.md) D2). **Both test suites assert the case table in §3.** When the
rule changes, this file changes first.

---

## 1. Browser side — `libs/common/engine/src/lib/image-url.ts`

Nx project `common-engine`, tags `type:engine`, `platform:agnostic`. Exported from
`libs/common/engine/src/index.ts`, imported as `@music-collection/common/engine`.

### Types

Structural, not imported from `@music-collection/api` — a `platform:agnostic` library may not see
`platform:angular` code (constitution IX), and the narrow shapes also fit the partial objects at the
call sites (`release.album`, `wishlistItem.albumReference`, the player's album projection).

```ts
/** What the rule needs to see of an attached image document. */
export interface AttachedImage {
	filePath?: string | null;
}

/** What the rule needs to see of an artist. */
export interface ArtistImageSource {
	imageUrl?: string | null;
	mainImage?: AttachedImage | null;
	headerImage?: AttachedImage | null;
	discogs?: { imageUrl?: string | null } | null;
}

/** What the rule needs to see of an album. */
export interface AlbumImageSource {
	coverImageUrl?: string | null;
	coverImage?: AttachedImage | null;
}
```

### Functions

```ts
/**
 * The artist's picture. The entered address wins over the attached main
 * image; the imported external photo is the last resort.
 */
export function toArtistImageUrl(
	artist: ArtistImageSource | null | undefined
): string | null;

/**
 * The artist's header picture. The attached header image keeps precedence
 * over the entered address, because one entered address cannot serve both
 * the banner and the main picture (FR-006).
 */
export function toArtistHeaderUrl(
	artist: ArtistImageSource | null | undefined
): string | null;

/** The album's cover. The entered address wins over the attached cover. */
export function toAlbumCoverUrl(
	album: AlbumImageSource | null | undefined
): string | null;
```

### Guarantees

| # | Guarantee |
|---|---|
| G1 | Pure: no I/O, no logging, no mutation of the argument. |
| G2 | Total: never throws, for any input — including `null`, `undefined`, and objects with missing or wrongly typed members. |
| G3 | An empty string is absent: `''` falls through to the next candidate and is never returned. |
| G4 | The return value is either a non-empty `string` or `null`. Never `undefined`, never `''`. |
| G5 | Whitespace-only is absent: a value that trims to nothing falls through. (New compared with today's bare `\|\|`; a URL field holding a space is not a picture.) |
| G6 | No fallback on load failure: the rule picks an address; it has no knowledge of whether it loads. |

---

## 2. Server side — `apps/functions/src/catalog-image-url.ts`

Its own npm project. Imports nothing from `libs/`.

Only the album cover is needed on the server (both call sites are album cover). The signature takes
the two raw values because the two callers read their documents differently —
`music-collection-badge-facts.ts` from a `Record<string, unknown>` field map,
`daily-question-compose.ts` from `FirebaseFirestore.DocumentSnapshot.get()`.

```ts
/**
 * A lemez borítója. A beírt cím előbbre való a csatolt borítónál.
 *
 * Ennek a modulnak van egy párja a böngésző oldalon
 * (`libs/common/engine/src/lib/image-url.ts`); a functions nem látja a
 * libeket (alkotmány XIII), ezért él itt külön. Aki az egyiket módosítja,
 * a másikat is módosítja — a szabály leírása:
 * `specs/60-artist-album-image-urls/contracts/image-url-rule.md`.
 */
export function toAlbumCoverUrl(
	coverImageUrl: unknown,
	coverImage: unknown
): string | null;
```

Same guarantees G1–G6. `coverImage` is accepted as `unknown` and inspected defensively (`typeof`
checks on the object and on `filePath`), which is what both call sites do inline today.

The browser module carries the mirror-image comment, naming this file.

---

## 3. Case table — asserted by both suites

### Album cover

| # | `coverImageUrl` | `coverImage.filePath` | → | Covers |
|---|---|---|---|---|
| 1 | `'https://a/url.jpg'` | `'https://storage/doc.jpg'` | `'https://a/url.jpg'` | **AC-2, AC-4** — the reversal |
| 2 | `null` | `'https://storage/doc.jpg'` | `'https://storage/doc.jpg'` | **FR-007** — the attachment is still consulted |
| 3 | `'https://a/url.jpg'` | *(no `coverImage`)* | `'https://a/url.jpg'` | **AC-3** — the surfaces that ignored it |
| 4 | `null` | *(no `coverImage`)* | `null` | spec edge case "neither" |
| 5 | `''` | `'https://storage/doc.jpg'` | `'https://storage/doc.jpg'` | G3 — cleared field |
| 6 | `'   '` | `'https://storage/doc.jpg'` | `'https://storage/doc.jpg'` | G5 |
| 7 | `'https://a/url.jpg'` | `''` | `'https://a/url.jpg'` | G3 on the attachment |
| 8 | *(album is `null`)* | — | `null` | G2 |
| 9 | `42` *(server only)* | `'https://storage/doc.jpg'` | `'https://storage/doc.jpg'` | G2 — a wrongly typed Firestore value |

### Artist picture

| # | `imageUrl` | `mainImage.filePath` | `discogs.imageUrl` | → | Covers |
|---|---|---|---|---|---|
| 10 | `'https://a/url.jpg'` | `'https://storage/main.jpg'` | `'https://discogs/x.jpg'` | `'https://a/url.jpg'` | **AC-1** — the reversal |
| 11 | `null` | `'https://storage/main.jpg'` | `'https://discogs/x.jpg'` | `'https://storage/main.jpg'` | **FR-007** |
| 12 | `null` | *(none)* | `'https://discogs/x.jpg'` | `'https://discogs/x.jpg'` | spec edge case "imported only" — stays last |
| 13 | `'https://a/url.jpg'` | *(none)* | *(none)* | `'https://a/url.jpg'` | **AC-3** |
| 14 | `null` | *(none)* | *(none)* | `null` | "neither" |
| 15 | *(artist is `null`)* | — | — | `null` | G2 |

### Artist header

| # | `headerImage.filePath` | `imageUrl` | `mainImage.filePath` | → | Covers |
|---|---|---|---|---|---|
| 16 | `'https://storage/header.jpg'` | `'https://a/url.jpg'` | `'https://storage/main.jpg'` | `'https://storage/header.jpg'` | **AC-6** — the attached header wins |
| 17 | *(none)* | `'https://a/url.jpg'` | `'https://storage/main.jpg'` | `'https://a/url.jpg'` | **AC-3** — the detail header follows the picture order |
| 18 | *(none)* | `null` | `'https://storage/main.jpg'` | `'https://storage/main.jpg'` | the header's fallback chain |
| 19 | `''` | `'https://a/url.jpg'` | *(none)* | `'https://a/url.jpg'` | G3 |

Cases 9 is server-only (the browser types forbid it); cases 10–19 are browser-only (the server needs
no artist rule). Cases 1–8 are asserted in **both** suites — that overlap is the drift guard.

---

## 4. Consumers

Every site in [data-model.md](./data-model.md) §Surfaces groups A and B calls one of these three
functions. Templates reach them through a `protected readonly` component member
([research.md](./research.md) D3). Two sites deliberately do not call them (group C).

No other contract changes: no callable signature, no Firestore shape, no HTTP endpoint, no security
rule.
