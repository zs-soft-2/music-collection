/** A Spotify id: 22 base-62 characters. */
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

/**
 * Spotify album id from a pasted share link
 * ("https://open.spotify.com/album/{id}?si=…", also with an "intl-xx/" prefix),
 * a URI ("spotify:album:{id}") or a bare id. Null when it is none of these.
 */
export function parseSpotifyAlbumId(
	value: string | null | undefined
): string | null {
	const text = value?.trim();
	if (!text) {
		return null;
	}
	if (SPOTIFY_ID.test(text)) {
		return text;
	}

	const id =
		text.match(/^spotify:album:([A-Za-z0-9]+)$/)?.[1] ??
		text.match(
			/^https?:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?album\/([A-Za-z0-9]+)(?:[/?#].*)?$/i
		)?.[1];

	return id && SPOTIFY_ID.test(id) ? id : null;
}

export function isSpotifyAlbumId(
	value: string | null | undefined
): value is string {
	return !!value && SPOTIFY_ID.test(value);
}
