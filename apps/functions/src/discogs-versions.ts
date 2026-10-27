/**
 * Egy Discogs master összes kiadása (préselése) — a gyűjtő ebből választja ki
 * a nála lévőt, ha a katalógusban nincs meg.
 *
 * A function az eredményt Firestore-ban cache-eli, így egy albumhoz ritkán
 * kell a Discogshoz fordulni. A formátum a kliens `DiscogsVersion` típusa
 * (libs/api … release-request/discogs-version.ts).
 */

import {
	DiscogsRequestOptions,
	discogsGet,
	releasedYear,
	text,
} from './discogs-api';

export { DiscogsError, releasedYear } from './discogs-api';

/** Egy lapon ennyi kiadás jön; ennyi lapnál többet nem kérünk le. */
const PER_PAGE = 100;
const MAX_PAGES = 5;

export interface DiscogsVersion {
	id: number;
	title: string;
	format: string | null;
	majorFormats: string[];
	label: string | null;
	catno: string | null;
	country: string | null;
	year: number | null;
	thumbUrl: string | null;
}

/** A `/masters/{id}/versions` válasz egy eleme (a használt mezők). */
export interface DiscogsApiVersion {
	id?: unknown;
	title?: unknown;
	format?: unknown;
	major_formats?: unknown;
	label?: unknown;
	catno?: unknown;
	country?: unknown;
	released?: unknown;
	thumb?: unknown;
}

interface DiscogsVersionsPage {
	pagination?: { pages?: number };
	versions?: DiscogsApiVersion[];
}

/**
 * A `format` csak a leírás ("Album, Reissue"); elé tesszük a hordozót
 * ("Vinyl"), és a már szereplő részeket nem ismételjük.
 */
export function formatText(
	majorFormats: string[],
	format: string | null
): string | null {
	const parts = [...majorFormats, ...(format?.split(',') ?? [])]
		.map((part) => part.trim())
		.filter(Boolean);

	return [...new Set(parts)].join(', ') || null;
}

export function toDiscogsVersion(
	version: DiscogsApiVersion
): DiscogsVersion | null {
	const id = Number(version.id);

	if (!Number.isSafeInteger(id) || id <= 0) return null;

	const majorFormats = Array.isArray(version.major_formats)
		? version.major_formats.filter(
				(format): format is string => typeof format === 'string'
			)
		: [];

	return {
		id,
		title: text(version.title) ?? '',
		format: formatText(majorFormats, text(version.format)),
		majorFormats,
		label: text(version.label),
		catno: text(version.catno),
		country: text(version.country),
		year: releasedYear(version.released),
		thumbUrl: text(version.thumb),
	};
}

/** Év, ország, formátum szerint rendezve. */
export function sortVersions(versions: DiscogsVersion[]): DiscogsVersion[] {
	return [...versions].sort(
		(a, b) =>
			(a.year ?? Infinity) - (b.year ?? Infinity) ||
			(a.country ?? '').localeCompare(b.country ?? '') ||
			(a.format ?? '').localeCompare(b.format ?? '')
	);
}

/** A master kiadásai, legfeljebb `MAX_PAGES` lapnyi. */
export async function fetchMasterVersions(
	masterId: number,
	options: DiscogsRequestOptions = {}
): Promise<DiscogsVersion[]> {
	const versions: DiscogsVersion[] = [];

	for (let page = 1; page <= MAX_PAGES; page++) {
		const body = await discogsGet<DiscogsVersionsPage>(
			`/masters/${masterId}/versions?per_page=${PER_PAGE}&page=${page}`,
			options
		);

		for (const version of body.versions ?? []) {
			const mapped = toDiscogsVersion(version);
			if (mapped) versions.push(mapped);
		}

		if (page >= (body.pagination?.pages ?? 1)) break;
	}

	return sortVersions(versions);
}
