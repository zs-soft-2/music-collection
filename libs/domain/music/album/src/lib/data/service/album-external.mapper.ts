import {
	AlbumExternalTrack,
	FormatEnum,
	StyleEnum,
	StyleList,
} from '@music-collection/api';

export const COVER_ART_ARCHIVE_URL = 'https://coverartarchive.org';

export interface CoverArtArchive {
	images?: {
		front?: boolean;
		image: string;
		thumbnails?: Record<string, string | undefined>;
	}[];
}

/** The front cover, 500 px wide when there is such a thumbnail. */
export function toCoverUrl(archive: CoverArtArchive): string | null {
	const front = archive.images?.find((image) => image.front);
	const url =
		front?.thumbnails?.['500'] ??
		front?.thumbnails?.['large'] ??
		front?.image;

	return url?.replace(/^http:/, 'https:') ?? null;
}

export interface MusicBrainzReleaseGroup {
	id: string;
	title: string;
	score?: number;
	'primary-type'?: string | null;
	'secondary-types'?: string[];
	'first-release-date'?: string | null;
	'artist-credit'?: { name: string; artist?: { name: string } }[];
	genres?: { name: string; count: number }[];
	releases?: MusicBrainzRelease[];
}

export interface MusicBrainzReleaseGroupSearch {
	'release-groups': MusicBrainzReleaseGroup[];
}

export interface MusicBrainzRelease {
	id: string;
	date?: string | null;
	status?: string | null;
	media?: {
		tracks?: {
			position: number;
			/** Position as printed, e.g. "A1". */
			number?: string | null;
			title: string;
			/** Duration in milliseconds. */
			length?: number | null;
		}[];
	}[];
}

const normalize = (value: string): string =>
	value
		.toLowerCase()
		.replace(/\bmetal\b/g, '')
		.replace(/[^a-z0-9]/g, '');

const STYLE_BY_KEY = new Map<string, StyleEnum>(
	StyleList.map((style) => [normalize(style), style])
);

const titleKey = (value: string): string =>
	value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/**
 * The search hit of the artist with the same title, studio albums first;
 * the best scored hit when none has the same title.
 */
export function pickReleaseGroup(
	artistName: string,
	name: string,
	groups: MusicBrainzReleaseGroup[]
): MusicBrainzReleaseGroup | null {
	const artist = titleKey(artistName);
	const title = titleKey(name);
	const byArtist = groups.filter((group) =>
		group['artist-credit']?.some(
			(credit) => titleKey(credit.artist?.name ?? credit.name) === artist
		)
	);
	const sameTitle = byArtist.filter(
		(group) => titleKey(group.title) === title
	);
	const candidates = sameTitle.length ? sameTitle : byArtist.slice(0, 1);

	return (
		candidates.find(
			(group) =>
				group['primary-type'] === 'Album' &&
				!group['secondary-types']?.length
		) ??
		candidates[0] ??
		null
	);
}

/** The earliest official release, the one the tracklist is taken from. */
export function pickRelease(
	releases: MusicBrainzRelease[] = []
): MusicBrainzRelease | null {
	const official = releases.filter(
		(release) => release.status === 'Official'
	);

	return (
		[...(official.length ? official : releases)].sort((a, b) =>
			(a.date || '9999').localeCompare(b.date || '9999')
		)[0] ?? null
	);
}

export function toFormat(group: MusicBrainzReleaseGroup): FormatEnum | null {
	if (group['secondary-types']?.length) {
		return null;
	}

	return group['primary-type'] === 'Album'
		? FormatEnum.lp
		: group['primary-type'] === 'EP'
			? FormatEnum.ep
			: null;
}

/** `1981`, `1981-10` or `1981-10-28` to a local date. */
export function toDate(value?: string | null): Date | null {
	const match = value?.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
	if (!match) {
		return null;
	}

	return new Date(
		Number(match[1]),
		match[2] ? Number(match[2]) - 1 : 0,
		match[3] ? Number(match[3]) : 1
	);
}

/** The genres the catalog knows as styles, the most voted first. */
export function toStyles(
	genres: MusicBrainzReleaseGroup['genres'] = []
): StyleEnum[] {
	const styles = [...genres]
		.sort((a, b) => b.count - a.count)
		.map((genre) => STYLE_BY_KEY.get(normalize(genre.name)))
		.filter((style): style is StyleEnum => !!style);

	return [...new Set(styles)];
}

/** Track titles of every medium, in order. */
/** Tracks of all media in play order, positions as printed. */
export function toTracks(
	release: MusicBrainzRelease | null
): AlbumExternalTrack[] {
	const media = release?.media ?? [];

	return media.flatMap((medium, mediumIndex) =>
		[...(medium.tracks ?? [])]
			.sort((a, b) => a.position - b.position)
			.map((track) => {
				const number = track.number || String(track.position);
				const durationSec = track.length
					? Math.round(track.length / 1000)
					: null;

				return {
					name: track.title,
					position:
						media.length > 1
							? `${mediumIndex + 1}-${number}`
							: number,
					duration:
						durationSec === null
							? null
							: `${Math.floor(durationSec / 60)}:${String(
									durationSec % 60
								).padStart(2, '0')}`,
					durationSec,
				};
			})
	);
}

/**
 * A duration as it is printed on a sleeve — "4:04", "1:02:30" — in seconds.
 *
 * The printed form is what the collector types and what the page shows; the
 * seconds are what a total can be added up from, so both are kept and this
 * is the one place they are derived from each other.
 */
export function toDurationSec(duration: string | null): number | null {
	const parts = (duration ?? '').trim().split(':');

	if (parts.length < 2 || parts.length > 3) {
		return null;
	}
	const numbers = parts.map((part) => Number(part));

	if (numbers.some((number) => !Number.isInteger(number) || number < 0)) {
		return null;
	}
	return numbers.reduce((total, number) => total * 60 + number, 0);
}
