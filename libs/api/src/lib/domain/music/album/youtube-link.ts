/** A YouTube video id: 11 characters of [A-Za-z0-9_-]. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
/** A YouTube playlist id, e.g. "PL…" or a YouTube Music album's "OLAK5uy_…". */
const PLAYLIST_ID = /^(?:PL|OLAK5uy_|UU|LL|FL|RD|OL)[A-Za-z0-9_-]{10,}$/;

function toUrl(text: string): URL | null {
	try {
		return new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
	} catch {
		return null;
	}
}

function isYoutubeHost(host: string): boolean {
	return /^(?:(?:www|m|music)\.)?youtube(?:-nocookie)?\.com$/i.test(host);
}

/**
 * YouTube video id from a pasted link ("youtube.com/watch?v={id}",
 * "youtu.be/{id}", "/shorts/", "/embed/", "/live/", also music.youtube.com)
 * or a bare id. Null when it is none of these.
 */
export function parseYoutubeVideoId(
	value: string | null | undefined
): string | null {
	const text = value?.trim();
	if (!text) {
		return null;
	}
	if (VIDEO_ID.test(text)) {
		return text;
	}

	const url = toUrl(text);
	if (!url) {
		return null;
	}

	let id: string | null | undefined = null;
	if (/^(?:www\.)?youtu\.be$/i.test(url.hostname)) {
		id = url.pathname.split('/')[1];
	} else if (isYoutubeHost(url.hostname)) {
		id =
			url.searchParams.get('v') ??
			url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/)?.[1];
	}

	return id && VIDEO_ID.test(id) ? id : null;
}

/**
 * YouTube playlist id from a pasted link ("…/playlist?list={id}", a YouTube
 * Music album link "music.youtube.com/playlist?list=OLAK5uy_…") or a bare id.
 * Null when it is none of these.
 */
export function parseYoutubePlaylistId(
	value: string | null | undefined
): string | null {
	const text = value?.trim();
	if (!text) {
		return null;
	}
	if (PLAYLIST_ID.test(text)) {
		return text;
	}

	const url = toUrl(text);
	const id =
		url && isYoutubeHost(url.hostname)
			? url.searchParams.get('list')
			: null;

	return id && PLAYLIST_ID.test(id) ? id : null;
}

export function isYoutubeVideoId(
	value: string | null | undefined
): value is string {
	return !!value && VIDEO_ID.test(value);
}

export function isYoutubePlaylistId(
	value: string | null | undefined
): value is string {
	return !!value && PLAYLIST_ID.test(value);
}
