import { AlbumEntity, ArtistEntity } from '@music-collection/api';

import { TrackStats } from '../../../data/track-stats';
import {
	CountDatum,
	ReleaseView,
	toAlbumView,
	toArtistView,
} from '../../../shared/music-ui';

/** One field checked for completeness, e.g. "Cover image" of the albums. */
export interface CompletenessCheck {
	/** Dictionary key of the field's name. */
	labelKey: string;
	missing: number;
}

/** Completeness of one entity type: how many records lack each field. */
export interface CompletenessGroup {
	/** Dictionary key of the entity type's name. */
	labelKey: string;
	/** Admin list route of the entity type, when it has a list. */
	route?: string;
	total: number;
	checks: CompletenessCheck[];
}

/** One period of the collection growth chart. */
export interface GrowthPoint {
	label: string;
	/** Releases added in the period. */
	added: number;
	/** Releases in the collection at the end of the period. */
	total: number;
}

/** One field the catalog would like filled, named by its dictionary key. */
type Check<T> = { labelKey: string; isFilled: (item: T) => boolean };

const ALBUM_CHECKS: Check<AlbumEntity>[] = [
	{
		labelKey: 'admin.field.coverImage',
		isFilled: (album) => !!toAlbumView(album).coverUrl,
	},
	{
		labelKey: 'admin.field.releaseYear',
		isFilled: (album) => toAlbumView(album).year !== null,
	},
	{
		labelKey: 'admin.field.styles',
		isFilled: (album) => !!album.styles?.length,
	},
	{
		labelKey: 'admin.field.spotifyLink',
		isFilled: (album) => !!album.spotifyAlbumId,
	},
	{
		labelKey: 'admin.field.youtubePlaylist',
		isFilled: (album) => !!album.youtubePlaylistId,
	},
];

const ARTIST_CHECKS: Check<ArtistEntity>[] = [
	{
		labelKey: 'admin.field.photo',
		isFilled: (artist) => !!toArtistView(artist).imageUrl,
	},
	{
		labelKey: 'admin.field.headerImage',
		isFilled: (artist) => !!artist.headerImage?.filePath,
	},
	{ labelKey: 'admin.field.country', isFilled: (artist) => !!artist.country },
	{
		labelKey: 'admin.field.formedYear',
		isFilled: (artist) => toArtistView(artist).formedYear !== null,
	},
	{
		labelKey: 'admin.field.description',
		isFilled: (artist) => !!artist.description?.trim(),
	},
	{
		labelKey: 'admin.field.styles',
		isFilled: (artist) => !!artist.styles?.length,
	},
];

function completenessGroup<T>(
	labelKey: string,
	route: string,
	items: T[],
	checks: Check<T>[]
): CompletenessGroup {
	return {
		labelKey,
		route,
		total: items.length,
		checks: checks.map((check) => ({
			labelKey: check.labelKey,
			missing: items.filter((item) => !check.isFilled(item)).length,
		})),
	};
}

/**
 * Missing fields of the catalog albums and artists. Whether an album has a
 * tracklist, or an artist a line-up, is only known once the tracks and the
 * memberships are loaded, so those rows are left out until
 * `albumUidsWithTracks` and `artistUidsWithLineup` arrive.
 */
export function catalogCompleteness(
	albums: AlbumEntity[],
	artists: ArtistEntity[],
	albumUidsWithTracks: ReadonlySet<string> | null,
	artistUidsWithLineup: ReadonlySet<string> | null = null
): CompletenessGroup[] {
	const albumChecks: Check<AlbumEntity>[] = albumUidsWithTracks
		? [
				...ALBUM_CHECKS,
				{
					labelKey: 'admin.field.tracklist',
					isFilled: (album) => albumUidsWithTracks.has(album.uid),
				},
			]
		: ALBUM_CHECKS;

	const artistChecks: Check<ArtistEntity>[] = artistUidsWithLineup
		? [
				...ARTIST_CHECKS,
				{
					labelKey: 'admin.field.lineUp',
					isFilled: (artist) => artistUidsWithLineup.has(artist.uid),
				},
			]
		: ARTIST_CHECKS;

	return [
		completenessGroup('admin.field.albums', 'album', albums, albumChecks),
		completenessGroup(
			'admin.field.artists',
			'artist',
			artists,
			artistChecks
		),
	];
}

/**
 * Lyrics and play links of the catalog tracks. The lyrics are counted rather
 * than read, so lyrics left behind by a deleted track could outnumber the
 * tracks; such a row stays at zero instead of going negative. Without a
 * lyrics count the row is left out, so nothing claims they are all missing.
 */
export function trackCompleteness(stats: TrackStats): CompletenessGroup {
	const missing = (filled: number) => Math.max(stats.total - filled, 0);

	return {
		labelKey: 'admin.field.tracks',
		total: stats.total,
		checks: [
			...(stats.withLyrics === null
				? []
				: [
						{
							labelKey: 'admin.field.lyrics',
							missing: missing(stats.withLyrics),
						},
					]),
			{
				labelKey: 'admin.field.spotifyLink',
				missing: missing(stats.withSpotify),
			},
			{
				labelKey: 'admin.field.youtubeVideo',
				missing: missing(stats.withYoutube),
			},
		],
	};
}

/** Collections spanning more years than this are shown per year, not month. */
const MONTHLY_MAX_YEARS = 3;

/**
 * Built per locale rather than once, because a formatter holds the locale it
 * was made with: the old one would go on writing "Mar" after the reader had
 * switched to German.
 */
const monthFormat = (locale: string) =>
	new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short' });

/**
 * Releases added to the collection over time, with the running total. Short
 * histories are bucketed per month, longer ones per year; empty periods in
 * between are kept, so the time axis stays even.
 */
export function collectionGrowth(
	releases: ReleaseView[],
	/** The reader's locale; the month names are written in it. */
	locale: string
): GrowthPoint[] {
	const dates = releases
		.filter((release) => release.addedAt > 0)
		.map((release) => new Date(release.addedAt));

	if (!dates.length) {
		return [];
	}

	const first = new Date(Math.min(...dates.map((date) => date.getTime())));
	const last = new Date(Math.max(...dates.map((date) => date.getTime())));
	const monthly =
		last.getFullYear() - first.getFullYear() < MONTHLY_MAX_YEARS;

	const index = (date: Date) =>
		monthly
			? (date.getFullYear() - first.getFullYear()) * 12 +
				date.getMonth() -
				first.getMonth()
			: date.getFullYear() - first.getFullYear();

	const added = new Array<number>(index(last) + 1).fill(0);
	for (const date of dates) {
		added[index(date)]++;
	}

	let total = 0;
	return added.map((count, i) => {
		total += count;
		const label = monthly
			? monthFormat(locale).format(
					new Date(first.getFullYear(), first.getMonth() + i, 1)
				)
			: String(first.getFullYear() + i);

		return { label, added: count, total };
	});
}

/** Catalog albums per album type (LP, EP, live, …), most frequent first. */
export function albumTypeDistribution(albums: AlbumEntity[]): CountDatum[] {
	const counts = new Map<string, number>();

	for (const album of albums) {
		const type = toAlbumView(album).albumType ?? 'Unknown';
		counts.set(type, (counts.get(type) ?? 0) + 1);
	}

	return Array.from(counts.entries())
		.sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
		.map(([label, count]) => ({ label, count }));
}
