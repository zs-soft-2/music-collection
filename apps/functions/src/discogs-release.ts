/**
 * Egy Discogs release (préselés) a katalógus `release` dokumentumaként —
 * a release-kérés jóváhagyásakor ebből lesz a katalógus kiadása.
 * A dokumentum formája az app `ReleaseModel`-je (libs/api … release.ts).
 */

import {
	DiscogsRequestOptions,
	discogsGet,
	releasedYear,
	text,
} from './discogs-api';
import { searchParameters } from './catalog-sync';

/** A `/releases/{id}` válasz használt mezői. */
export interface DiscogsRelease {
	id: number;
	title?: string;
	country?: string;
	released?: string;
	year?: number;
	labels?: { name?: string; catno?: string }[];
	formats?: { name?: string; descriptions?: string[]; text?: string }[];
	/** A katalógusba importált albumhoz (release-kérés album nélkül). */
	artists?: { id?: number; name?: string }[];
	master_id?: number;
	styles?: string[];
	images?: { type?: string; uri?: string }[];
	tracklist?: { type_?: string; title?: string }[];
}

export interface CatalogLabel {
	uid: string;
	name: string;
}

export interface CatalogAlbum extends Record<string, unknown> {
	uid: string;
	name: string;
	artist?: { uid?: string; name?: string };
}

const MEDIA: Record<string, string> = {
	vinyl: 'vinyl',
	cd: 'cd',
	cassette: 'cassette',
	dvd: 'dvd',
};

/** Discogs formátum-leírás → az app `FormatDescriptionEnum` értékei. */
const DESCRIPTIONS: Record<string, string> = {
	'box set': 'box set',
	'deluxe edition': 'deluxe edition',
	'180 gram': '180g',
	'180g': '180g',
	'limited edition': 'limited edition',
	'picture disc': 'picture disc',
	reissue: 'reissue',
	remastered: 'remastered',
};

export function fetchDiscogsRelease(
	releaseId: number,
	options: DiscogsRequestOptions = {}
): Promise<DiscogsRelease> {
	return discogsGet<DiscogsRelease>(`/releases/${releaseId}`, options);
}

/** Az első ismert hordozó ("Vinyl" → vinyl); ismeretlennél kisbetűs név. */
export function discogsMedia(release: DiscogsRelease): string | null {
	const names = (release.formats ?? [])
		.map((format) => text(format.name)?.toLowerCase())
		.filter((name): name is string => !!name);

	return names.map((name) => MEDIA[name]).find(Boolean) ?? names[0] ?? null;
}

export function discogsFormatDescriptions(release: DiscogsRelease): string[] {
	const tags = (release.formats ?? []).flatMap((format) => [
		format.name ?? '',
		...(format.descriptions ?? []),
		...(format.text ?? '').split(','),
	]);

	return [
		...new Set(
			tags
				.map((tag) => DESCRIPTIONS[tag.trim().toLowerCase()])
				.filter((tag): tag is string => !!tag)
		),
	];
}

/** "2011-09-13" → annak a napnak az éjfele (UTC); csak év → január 1. */
export function discogsReleaseDate(release: DiscogsRelease): number | null {
	const released = text(release.released);
	const exact = released?.match(/^(\d{4})-(\d{2})-(\d{2})$/);

	if (exact && exact[2] !== '00' && exact[3] !== '00') {
		return Date.UTC(
			Number(exact[1]),
			Number(exact[2]) - 1,
			Number(exact[3])
		);
	}

	const year = releasedYear(released) ?? releasedYear(release.year);

	return year ? Date.UTC(year, 0, 1) : null;
}

export function discogsLabelName(release: DiscogsRelease): string | null {
	return text(release.labels?.[0]?.name);
}

/**
 * A katalógus-dokumentum. `album` a katalógus albuma (beágyazva, mint a többi
 * kiadásnál), `label` a katalógus kiadója.
 */
export function toCatalogRelease(
	release: DiscogsRelease,
	{
		uid,
		album,
		label,
	}: { uid: string; album: CatalogAlbum; label: CatalogLabel | null }
): Record<string, unknown> {
	const descriptions = discogsFormatDescriptions(release);

	return {
		uid,
		entityType: 'Release',
		name: album.name,
		album,
		artist: {
			uid: album.artist?.uid ?? null,
			entityType: 'Artist',
			name: album.artist?.name ?? null,
		},
		country: text(release.country),
		date: discogsReleaseDate(release),
		formatDescription: descriptions.length ? descriptions : null,
		label: label
			? { uid: label.uid, entityType: 'Label', name: label.name }
			: null,
		media: discogsMedia(release),
		discogsReleaseId: release.id,
		searchParameters: searchParameters(album.name),
	};
}
