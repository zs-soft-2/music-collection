/**
 * Egy Discogs kiadó profilja a kiadó szerkesztőűrlapjához (Load gomb), és a
 * névre keresés, ami az azonosítót megtalálja. A katalógus kiadói a
 * kiadásokból, névre jönnek létre (release-request-approval), Discogs-azonosító
 * nélkül — ezért a betöltés első lépése jellemzően a keresés.
 *
 * A formátum a kliens `LabelExternalProfile` és `LabelExternalCandidate`
 * típusa (libs/api … label-external.ts).
 */

import { DiscogsRequestOptions, discogsGet, text } from './discogs-api';
import { stripDiscogsSuffix } from './discogs-artist';

export interface DiscogsLabelProfile {
	/** Discogs label id. */
	discogsId: number;
	name: string;
	/** A kiadó bemutatkozása, Discogs-jelölésekkel. */
	description: string | null;
	sites: string[];
	imageUrl: string | null;
	/**
	 * A Discogs anyakiadója. Csak a nevét tudjuk: a katalógus kiadójára
	 * hivatkozó `parent` mezőt az admin állítja be, mert az anyakiadó nem
	 * feltétlenül van meg nálunk.
	 */
	parentName: string | null;
}

/** Egy keresési találat, amennyi az azonosításához kell. */
export interface DiscogsLabelCandidate {
	discogsId: number;
	name: string;
	thumbUrl: string | null;
}

/** A `/labels/{id}` válasz használt mezői. */
export interface DiscogsApiLabel {
	id?: unknown;
	name?: unknown;
	profile?: unknown;
	urls?: unknown;
	images?: { type?: unknown; uri?: unknown }[];
	parent_label?: { name?: unknown } | null;
}

/** A `/database/search?type=label` válasz egy eleme. */
export interface DiscogsApiLabelResult {
	id?: unknown;
	title?: unknown;
	thumb?: unknown;
}

interface DiscogsLabelSearchPage {
	results?: DiscogsApiLabelResult[];
}

/** Egy lapon ennyi találatot kérünk; a választáshoz ennél több nem segít. */
const PER_PAGE = 20;

const texts = (value: unknown): string[] =>
	Array.isArray(value)
		? value.map(text).filter((item): item is string => !!item)
		: [];

export function toLabelProfile(
	label: DiscogsApiLabel
): DiscogsLabelProfile | null {
	const discogsId = Number(label.id);

	if (!Number.isSafeInteger(discogsId) || discogsId <= 0) return null;

	const images = label.images ?? [];
	const primary =
		images.find((image) => image.type === 'primary') ?? images[0];
	const parentName = text(label.parent_label?.name);

	return {
		discogsId,
		name: stripDiscogsSuffix(text(label.name) ?? ''),
		description: text(label.profile),
		sites: texts(label.urls).filter((url) => /^https?:\/\//i.test(url)),
		imageUrl: text(primary?.uri),
		parentName: parentName ? stripDiscogsSuffix(parentName) : null,
	};
}

export function toLabelCandidate(
	result: DiscogsApiLabelResult
): DiscogsLabelCandidate | null {
	const discogsId = Number(result.id);
	const name = text(result.title);

	if (!Number.isSafeInteger(discogsId) || discogsId <= 0) return null;
	if (!name) return null;

	return {
		discogsId,
		name: stripDiscogsSuffix(name),
		thumbUrl: text(result.thumb),
	};
}

export async function fetchLabelProfile(
	labelId: number,
	options: DiscogsRequestOptions = {}
): Promise<DiscogsLabelProfile | null> {
	return toLabelProfile(
		await discogsGet<DiscogsApiLabel>(`/labels/${labelId}`, options)
	);
}

/**
 * A névre illő kiadók, a Discogs sorrendjében. A `/database/search` tokent
 * IGÉNYEL; token nélkül a Discogs 401-et ad.
 */
export async function searchLabels(
	name: string,
	options: DiscogsRequestOptions = {}
): Promise<DiscogsLabelCandidate[]> {
	const query = new URLSearchParams({
		q: name,
		type: 'label',
		per_page: String(PER_PAGE),
	});
	const page = await discogsGet<DiscogsLabelSearchPage>(
		`/database/search?${query}`,
		options
	);

	return (page.results ?? [])
		.map(toLabelCandidate)
		.filter((hit): hit is DiscogsLabelCandidate => !!hit);
}
