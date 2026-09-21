/**
 * A fotós azonosítás láncolata: vonalkód → katalógusszám → előadó és cím.
 * A lánc addig megy, amíg biztos találatot nem ad, és minden lépésnél
 * megáll, ha már van.
 *
 * A katalógussal NEM itt vetjük össze a találatokat: a gyűjtő kliensén a
 * teljes katalógus ott van (bundle-ök), így az egyeztetés olcsóbb és
 * offline is működik. Ez a modul csak azt mondja meg, mi van a fotón és
 * melyik Discogs-kiadás az.
 */

import Anthropic from '@anthropic-ai/sdk';

import { DiscogsRequestOptions } from './discogs-api';
import {
	DiscogsSearchHit,
	MatchSignals,
	RankedHit,
	rankHits,
	searchByAlbum,
	searchByBarcode,
	searchByCatalogNumber,
} from './discogs-search';
import { PhotoInput, PhotoSignals, readPhotoSignals } from './photo-signals';

/** Egy jelölt: a Discogs kiadása (vagy mastere), a találat erősségével. */
export interface ScanCandidate {
	/** A préselés Discogs-azonosítója; master-találatnál `null`. */
	discogsReleaseId: number | null;
	discogsMasterId: number | null;
	title: string;
	artistName: string | null;
	albumName: string | null;
	/** e.g. ["Vinyl", "LP", "Album"]. */
	formats: string[];
	label: string | null;
	catno: string | null;
	country: string | null;
	year: number | null;
	thumbUrl: string | null;
	/**
	 * `exact`: a vonalkód vagy a katalógusszám egyezik — ez az a préselés.
	 * `likely`: az előadó és a cím is egyezik, a példány viszont nem dőlt el.
	 * `possible`: csak részleges egyezés, a gyűjtőnek kell választania.
	 */
	match: 'exact' | 'likely' | 'possible';
}

/**
 * Az album, amiről a fotó biztosan szól — az album oldaláról indított
 * azonosításnál csak a préselés a kérdés. Szűkíti a keresést, és erősebb
 * jel, mint amit a modell egy elmosódott borítóról kiolvas.
 */
export interface ScanAlbumContext {
	name: string;
	artistName: string | null;
}

export interface ScanPhotoInput {
	photo: PhotoInput | null;
	/** Amit a kliens dekódolt a képről; ezzel a modell futása elmaradhat. */
	barcode: string | null;
	/** Ismert album, ha a gyűjtő az album oldaláról fotóz. */
	album?: ScanAlbumContext | null;
}

export interface ScanPhotoResult {
	/** Amit a modell olvasott; `null`, ha a vonalkód elintézte a keresést. */
	signals: PhotoSignals | null;
	candidates: ScanCandidate[];
	/** Futott-e a modell — a hívó ebből látja a kérés költségét. */
	usedVision: boolean;
}

/** A vonalkódos keresés Firestore-cache-e (a hívó adja). */
export interface BarcodeCache {
	read(barcode: string): Promise<DiscogsSearchHit[] | null>;
	write(barcode: string, hits: DiscogsSearchHit[]): Promise<void>;
}

export interface ScanDependencies {
	client: Anthropic;
	discogs: DiscogsRequestOptions;
	barcodeCache?: BarcodeCache;
}

/** Ennél több jelöltet egy dialogban úgysem néz végig a gyűjtő. */
const MAX_CANDIDATES = 6;
/** Az előadó- és cím-egyezés pontszáma; ennyitől nevezzük valószínűnek. */
const LIKELY_SCORE = 4;

function toCandidate(hit: RankedHit): ScanCandidate {
	return {
		discogsReleaseId: hit.type === 'release' ? hit.id : null,
		discogsMasterId: hit.type === 'master' ? hit.id : hit.masterId,
		title: hit.title,
		artistName: hit.artist,
		albumName: hit.album,
		formats: hit.formats,
		label: hit.label,
		catno: hit.catno,
		country: hit.country,
		year: hit.year,
		thumbUrl: hit.thumbUrl,
		match: hit.exact
			? 'exact'
			: hit.score >= LIKELY_SCORE
				? 'likely'
				: 'possible',
	};
}

function toCandidates(
	hits: DiscogsSearchHit[],
	signals: MatchSignals
): ScanCandidate[] {
	return rankHits(hits, signals).slice(0, MAX_CANDIDATES).map(toCandidate);
}

/**
 * A keresés jelei: a fotóról olvasottak, de az album nevét és előadóját az
 * ismert albumé írja felül — azt tudjuk, a fotót csak olvassuk.
 */
function matchSignals(
	signals: MatchSignals,
	album: ScanAlbumContext | null | undefined
): MatchSignals {
	return album
		? {
				...signals,
				albumTitle: album.name,
				artist: album.artistName ?? signals.artist,
			}
		: signals;
}

const hasExact = (candidates: ScanCandidate[]): boolean =>
	candidates.some((candidate) => candidate.match === 'exact');

const RANK: Record<ScanCandidate['match'], number> = {
	exact: 3,
	likely: 2,
	possible: 1,
};

/** A lánc erősebb lépésének eredménye; azonos erősségnél a bővebb lista. */
function better(
	candidates: ScanCandidate[],
	previous: ScanCandidate[]
): ScanCandidate[] {
	const strength = (list: ScanCandidate[]) =>
		Math.max(0, ...list.map((candidate) => RANK[candidate.match]));

	return strength(candidates) > strength(previous) ||
		(strength(candidates) === strength(previous) &&
			candidates.length > previous.length)
		? candidates
		: previous;
}

async function barcodeHits(
	barcode: string,
	{ discogs, barcodeCache }: ScanDependencies
): Promise<DiscogsSearchHit[]> {
	const cached = await barcodeCache?.read(barcode);

	if (cached) return cached;

	const hits = await searchByBarcode(barcode, discogs);

	await barcodeCache?.write(barcode, hits);

	return hits;
}

/**
 * A fotó (és ha a kliens dekódolta, a vonalkód) alapján jelölteket ad.
 * Mindig ad választ, ha a Discogs elérhető: a legrosszabb eset egy üres
 * jelöltlista a kiolvasott jelekkel, amiből a gyűjtő kézzel indulhat.
 */
export async function scanPhoto(
	input: ScanPhotoInput,
	dependencies: ScanDependencies
): Promise<ScanPhotoResult> {
	const scanned = (input.barcode ?? '').replace(/\D+/g, '');
	let best: ScanCandidate[] = [];

	// 1. A kliens vonalkódja: a legerősebb jel, és a modell futása nélkül.
	if (scanned) {
		const candidates = toCandidates(
			await barcodeHits(scanned, dependencies),
			matchSignals({ barcode: scanned }, input.album)
		);

		if (hasExact(candidates)) {
			return { signals: null, candidates, usedVision: false };
		}

		// Nem döntött, de amit talált, azt a kép sem feltétlenül übereli.
		best = better(candidates, best);
	}

	if (!input.photo) {
		return { signals: null, candidates: best, usedVision: false };
	}

	// 2. A kép: innentől a modell jelei viszik a keresést.
	const signals = await readPhotoSignals(input.photo, dependencies.client);
	const result = (candidates: ScanCandidate[]): ScanPhotoResult => ({
		signals,
		candidates,
		usedVision: true,
	});

	if (signals.barcode && signals.barcode !== scanned) {
		const candidates = toCandidates(
			await barcodeHits(signals.barcode, dependencies),
			matchSignals(signals, input.album)
		);

		if (hasExact(candidates)) return result(candidates);

		best = better(candidates, best);
	}

	// 3. Katalógusszám a kiadóval: a vonalkód nélküli bakelitek útja.
	if (signals.catalogNumber) {
		const candidates = toCandidates(
			await searchByCatalogNumber(
				signals.catalogNumber,
				signals.label,
				dependencies.discogs
			),
			matchSignals(signals, input.album)
		);

		if (hasExact(candidates)) return result(candidates);

		best = better(candidates, best);
	}

	// 4. Előadó és cím: a préselést már nem, de az albumot megtalálja — a
	//    gyűjtő onnan a megszokott kiadásválasztóval megy tovább. Ismert
	//    albumnál ez a lépés adja a préseléseit, amikor a fotón nem volt
	//    olvasható azonosító.
	const artist = input.album?.artistName ?? signals.artist;
	const albumTitle = input.album?.name ?? signals.albumTitle;

	if (artist && albumTitle) {
		for (const type of ['master', 'release'] as const) {
			const candidates = toCandidates(
				await searchByAlbum(
					artist,
					albumTitle,
					type,
					dependencies.discogs
				),
				matchSignals(signals, input.album)
			);

			if (hasExact(candidates)) return result(candidates);

			best = better(candidates, best);
			if (best.length) break;
		}
	}

	return result(best);
}
