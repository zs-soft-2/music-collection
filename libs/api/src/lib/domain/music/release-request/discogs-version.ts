/**
 * One release (pressing) of a Discogs master, as the `discogsMasterVersions`
 * callable returns it.
 */
export interface DiscogsVersion {
	/** Discogs release id. */
	id: number;
	title: string;
	/** e.g. "Vinyl, LP, Album, Reissue". */
	format: string | null;
	/** e.g. ["Vinyl"]. */
	majorFormats: string[];
	label: string | null;
	catno: string | null;
	country: string | null;
	year: number | null;
	thumbUrl: string | null;
}

export interface DiscogsMasterVersionsRequest {
	masterId: number;
}

export interface DiscogsMasterVersionsResponse {
	masterId: number;
	versions: DiscogsVersion[];
}

/** Callable name of the Discogs master versions lookup. */
export const DISCOGS_MASTER_VERSIONS_FUNCTION = 'discogsMasterVersions';

/** The Discogs page of a release. */
export function discogsReleaseUrl(releaseId: number): string {
	return `https://www.discogs.com/release/${releaseId}`;
}

/**
 * The release id of a Discogs release link ("…/release/1234567-Title") or a
 * bare id; `null` when it is neither.
 */
export function parseDiscogsReleaseId(value: string): number | null {
	const text = value.trim();
	const match =
		text.match(/discogs\.com\/(?:[a-z-]+\/)?release\/(\d+)/i) ??
		text.match(/^\[?r?(\d+)\]?$/i);
	const id = match ? Number(match[1]) : NaN;

	return Number.isSafeInteger(id) && id > 0 ? id : null;
}
