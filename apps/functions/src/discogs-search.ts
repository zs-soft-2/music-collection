/**
 * Discogs-keresés a fotós azonosításhoz: vonalkódra, katalógusszám + kiadóra,
 * végül előadó + címre. A `/database/search` — a `/masters/{id}/versions`-szel
 * ellentétben — tokent IGÉNYEL; token nélkül a Discogs 401-et ad.
 */

import {
	DiscogsRequestOptions,
	discogsGet,
	releasedYear,
	text,
} from './discogs-api';
import { normalize, normalizeCatno, splitSearchTitle } from './discogs-match';

/** Egy keresési találat, a fotós azonosításhoz használt mezőkre szűkítve. */
export interface DiscogsSearchHit {
	id: number;
	/** A `release` konkrét préselés, a `master` az album minden préselése. */
	type: 'release' | 'master';
	/** A Discogs teljes címe: "Előadó - Album". */
	title: string;
	artist: string | null;
	album: string | null;
	/** e.g. ["Vinyl", "LP", "Album", "Reissue"]. */
	formats: string[];
	label: string | null;
	catno: string | null;
	country: string | null;
	barcodes: string[];
	year: number | null;
	thumbUrl: string | null;
	/** A préselés mastere, ha a Discogs ismeri. */
	masterId: number | null;
}

/** A `/database/search` válasz egy eleme (a használt mezők). */
interface DiscogsSearchResult {
	id?: unknown;
	type?: unknown;
	title?: unknown;
	format?: unknown;
	label?: unknown;
	catno?: unknown;
	country?: unknown;
	barcode?: unknown;
	year?: unknown;
	thumb?: unknown;
	master_id?: unknown;
}

interface DiscogsSearchPage {
	results?: DiscogsSearchResult[];
}

/** Egy lapon ennyi találatot kérünk; többre a fotós útnál nincs szükség. */
const PER_PAGE = 25;

const strings = (value: unknown): string[] =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string')
		: [];

export function toSearchHit(
	result: DiscogsSearchResult
): DiscogsSearchHit | null {
	const id = Number(result.id);
	const type = text(result.type);

	if (!Number.isSafeInteger(id) || id <= 0) return null;
	if (type !== 'release' && type !== 'master') return null;

	const title = text(result.title) ?? '';
	const { artist, album } = splitSearchTitle(title);
	const masterId = Number(result.master_id);

	return {
		id,
		type,
		title,
		artist,
		album,
		formats: strings(result.format),
		label: strings(result.label)[0] ?? null,
		catno: text(result.catno),
		country: text(result.country),
		barcodes: strings(result.barcode),
		year: releasedYear(result.year),
		thumbUrl: text(result.thumb),
		masterId:
			Number.isSafeInteger(masterId) && masterId > 0 ? masterId : null,
	};
}

async function search(
	parameters: Record<string, string | number>,
	options: DiscogsRequestOptions
): Promise<DiscogsSearchHit[]> {
	const query = new URLSearchParams({
		...Object.fromEntries(
			Object.entries(parameters).map(([key, value]) => [
				key,
				String(value),
			])
		),
		per_page: String(PER_PAGE),
	});
	const page = await discogsGet<DiscogsSearchPage>(
		`/database/search?${query}`,
		options
	);

	return (page.results ?? [])
		.map(toSearchHit)
		.filter((hit): hit is DiscogsSearchHit => !!hit);
}

/**
 * Vonalkódra: ez a legerősebb jel, egy EAN/UPC jellemzően egy préselést
 * azonosít. A Discogs a vonalkódot több alakban tárolja ("7 2064-24425-2 4"),
 * ezért csak a számjegyekre keresünk.
 */
export function searchByBarcode(
	barcode: string,
	options: DiscogsRequestOptions = {}
): Promise<DiscogsSearchHit[]> {
	return search({ barcode, type: 'release' }, options);
}

/**
 * Katalógusszámra, a kiadóval szűkítve — a vonalkód nélküli (jellemzően 1980
 * előtti) bakelitek útja. A kiadó nélkül a rövid katalógusszámok sok kiadónál
 * ütköznek.
 */
export function searchByCatalogNumber(
	catno: string,
	label: string | null,
	options: DiscogsRequestOptions = {}
): Promise<DiscogsSearchHit[]> {
	return search(
		{ catno, type: 'release', ...(label ? { label } : {}) },
		options
	);
}

/** Előadó + cím: nem a préselést, hanem az albumot találja meg. */
export function searchByAlbum(
	artist: string,
	albumTitle: string,
	type: 'master' | 'release',
	options: DiscogsRequestOptions = {}
): Promise<DiscogsSearchHit[]> {
	return search({ artist, release_title: albumTitle, type }, options);
}

/**
 * A fotóról olvasott jelekhez mérve rangsorol. A pontszám nem abszolút: a
 * találatok egymáshoz képesti sorrendjét adja, és a hívó dönti el, elég
 * magabiztos-e a legjobb. Az `exact` az, amit egyetlen jel önmagában eldönt
 * (vonalkód- vagy katalógusszám-egyezés).
 */
export interface RankedHit extends DiscogsSearchHit {
	score: number;
	exact: boolean;
}

export interface MatchSignals {
	artist?: string | null;
	albumTitle?: string | null;
	label?: string | null;
	catalogNumber?: string | null;
	barcode?: string | null;
	year?: number | null;
}

/**
 * Két név ellentmond-e egymásnak. A részleges eltérés nem az: a Discogs
 * hol "Melissa", hol "Melissa (Reissue)" néven hozza ugyanazt. Az üres név
 * sem mond ellent semminek.
 */
function contradicts(one: string, other: string): boolean {
	const a = normalize(one);
	const b = normalize(other);

	if (!a || !b) return false;

	return !a.includes(b) && !b.includes(a);
}

export function rankHits(
	hits: DiscogsSearchHit[],
	signals: MatchSignals
): RankedHit[] {
	const artist = normalize(signals.artist);
	const album = normalize(signals.albumTitle);
	const catno = normalizeCatno(signals.catalogNumber);
	const label = normalize(signals.label);
	const barcode = (signals.barcode ?? '').replace(/\D+/g, '');

	return hits
		.map((hit) => {
			const barcodeMatch =
				!!barcode &&
				hit.barcodes.some(
					(value) => value.replace(/\D+/g, '') === barcode
				);
			const catnoMatch = !!catno && normalizeCatno(hit.catno) === catno;
			let score = 0;

			// Egy katalógusszám nem egyedi: a kiadók újrahasznosítják, és a
			// Discogs adatai sem hibátlanok. Ha az előadó vagy a cím mást
			// mond, akkor a szám egyezése ellenére sem ez a lemez — ez az a
			// tévedés, ami rossz préselést tenne a gyűjteménybe.
			const contradicted =
				contradicts(signals.artist ?? '', hit.artist ?? '') ||
				contradicts(signals.albumTitle ?? '', hit.album ?? '');

			if (barcodeMatch) score += 6;
			if (catnoMatch) score += 4;
			if (contradicted) score -= 5;
			if (label && normalize(hit.label) === label) score += 1;
			if (artist && normalize(hit.artist) === artist) score += 2;
			if (album && normalize(hit.album) === album) score += 2;
			if (signals.year && hit.year) {
				const difference = Math.abs(signals.year - hit.year);

				if (difference === 0) score += 1;
				else if (difference === 1) score += 0.5;
			}
			if (hit.formats.includes('Unofficial Release')) score -= 3;

			return {
				...hit,
				score,
				exact: (barcodeMatch || catnoMatch) && !contradicted,
			};
		})
		.sort(
			(a, b) => b.score - a.score || (a.year ?? 9999) - (b.year ?? 9999)
		);
}
