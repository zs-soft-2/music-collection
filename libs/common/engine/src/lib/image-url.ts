/**
 * Which address a picture is drawn from.
 *
 * An artist or an album can name its picture twice over: an admin types an
 * address into a free-text field, or attaches an image document the catalog
 * already holds. The address typed in is the more deliberate of the two, so it
 * is the one that shows (#60). The photo the Discogs import found stays the
 * last resort, and the artist's attached *header* keeps its precedence,
 * because one typed-in address cannot serve both the banner and the picture.
 *
 * This module has a twin on the server side,
 * `apps/functions/src/catalog-image-url.ts`: the functions are their own npm
 * project and never import the workspace libraries (constitution XIII), so the
 * album half of the order is written out there a second time. Whoever changes
 * one changes the other, and the arbiter between them is
 * `specs/60-artist-album-image-urls/contracts/image-url-rule.md` — the one
 * written statement of the order, whose case table both test suites assert.
 *
 * The shapes below are structural on purpose. This library is
 * `platform:agnostic`, so it may not see `@music-collection/api`
 * (constitution IX) — and the narrow shapes also fit the partial objects the
 * call sites hold: a release's nested album, a wishlist item's album
 * reference, the player's album projection.
 */

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

/**
 * The first candidate that is an address. A value that trims to nothing is
 * absent — a cleared input emits `''`, and a field holding a space is not a
 * picture.
 */
function firstAddress(
	...candidates: (string | null | undefined)[]
): string | null {
	for (const candidate of candidates) {
		const address = candidate?.trim();

		if (address) {
			return address;
		}
	}

	return null;
}

/**
 * The artist's picture. The entered address wins over the attached main image;
 * the imported external photo is the last resort.
 */
export function toArtistImageUrl(
	artist: ArtistImageSource | null | undefined
): string | null {
	return firstAddress(
		artist?.imageUrl,
		artist?.mainImage?.filePath,
		artist?.discogs?.imageUrl
	);
}

/**
 * The artist's header picture. The attached header image keeps precedence over
 * the entered address, because one entered address cannot serve both the
 * banner and the main picture (FR-006). Without an attached header the banner
 * follows the artist-picture order, which is a picture where there used to be
 * an empty frame.
 */
export function toArtistHeaderUrl(
	artist: ArtistImageSource | null | undefined
): string | null {
	return firstAddress(artist?.headerImage?.filePath) ?? toArtistImageUrl(artist);
}

/** The album's cover. The entered address wins over the attached cover. */
export function toAlbumCoverUrl(
	album: AlbumImageSource | null | undefined
): string | null {
	return firstAddress(album?.coverImageUrl, album?.coverImage?.filePath);
}
