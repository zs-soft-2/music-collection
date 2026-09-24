/**
 * Egy polcrekesz gerinceinek kiolvasása fotóról. Amit a `photo-signals.ts`
 * egy lemezre csinál, ez egy egész rekeszre — annyi sorral, ahány gerinc
 * látszik.
 *
 * A rekeszről két fotó készül, két szögből, és **külön kérésben** megy be
 * mindkettő. Egy kérésben a modell összefésülné a kettőt, és egyetlen
 * magabiztos választ adna; pont az veszne el, amiért a második kép készült.
 * Két független olvasatból viszont a `mergeShelfReads` meg tudja mondani,
 * melyik mezőben nem értenek egyet — és a gyűjtőnek csak azokat kell
 * átnéznie.
 */

import Anthropic from '@anthropic-ai/sdk';

import { normalize, normalizeBarcode, normalizeCatno } from './discogs-match';
import {
	PhotoInput,
	PhotoMedia,
	PhotoSignals,
	VisionError,
} from './photo-signals';

const MEDIA: PhotoMedia[] = ['vinyl', 'cd', 'cassette', 'dvd'];

/** Egy gerinc a rekeszben, a fotó tetejétől számozva. */
export interface ShelfSpine extends PhotoSignals {
	/** 1-től, a rekesz tetejétől (fektetett kupacnál) vagy balról. */
	position: number;
	/** Látszik, de semmit nem lehet kiolvasni róla. */
	unreadable: boolean;
}

/** Egy fotó olvasata. */
export interface ShelfRead {
	/**
	 * Hány gerincet lát a modell — a szövegtől függetlenül megszámolva. A
	 * számolás robusztus, a kiolvasás törékeny: ha ez több, mint a `spines`
	 * hossza, egy sor kimaradt.
	 */
	spineCount: number;
	spines: ShelfSpine[];
}

/** A gerinc mezői, amiken a két olvasat eltérhet. */
export type SpineField =
	'artist' | 'albumTitle' | 'label' | 'catalogNumber' | 'barcode' | 'year';

const FIELDS: SpineField[] = [
	'artist',
	'albumTitle',
	'label',
	'catalogNumber',
	'barcode',
	'year',
];

/** Egy gerinc a két olvasat összefésülése után. */
export interface MergedSpine extends ShelfSpine {
	/** Mezők, amiken a két fotó mást olvasott — ezek kérnek átnézést. */
	conflicts: SpineField[];
	/** A másik fotó olvasata ott, ahol eltér; egy kattintással átvehető. */
	alternatives: Partial<Record<SpineField, string | number | null>>;
	/** Hány fotón szerepelt ez a gerinc: 1 vagy 2. */
	seenOn: number;
}

export interface MergedShelf {
	spines: MergedSpine[];
	/** Fotónkénti gerincszám; eltérés = hiányzó sor gyanúja. */
	spineCounts: number[];
}

/**
 * Legfeljebb ennyi fotó egy rekeszről: a harmadik kép már költséget ad, nem
 * bizonyosságot. A kliensoldali párja a `MAX_SHELF_PHOTOS` a
 * `libs/api/.../photo-scan/shelf-scan.ts`-ben — a functions külön npm-projekt,
 * onnan nem tud importálni, ezért a kettőt együtt kell tartani.
 */
export const MAX_SHELF_PHOTOS = 2;

const MODEL = 'claude-opus-5';

/**
 * Egy tele rekesz húsz gerinc is lehet, soronként kilenc mezővel — ennek
 * bőven bele kell férnie, mert a levágott JSON az egész olvasatot elviszi.
 */
const MAX_TOKENS = 8000;
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 60_000;

const nullableString = { type: ['string', 'null'] };

const SHELF_SCHEMA = {
	type: 'object',
	properties: {
		spineCount: { type: 'integer' },
		spines: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					position: { type: 'integer' },
					unreadable: { type: 'boolean' },
					artist: nullableString,
					albumTitle: nullableString,
					label: nullableString,
					catalogNumber: nullableString,
					barcode: nullableString,
					media: {
						anyOf: [
							{ type: 'string', enum: MEDIA },
							{ type: 'null' },
						],
					},
					country: nullableString,
					year: { type: ['integer', 'null'] },
					confidence: {
						type: 'string',
						enum: ['high', 'medium', 'low'],
					},
				},
				required: [
					'position',
					'unreadable',
					'artist',
					'albumTitle',
					'label',
					'catalogNumber',
					'barcode',
					'media',
					'country',
					'year',
					'confidence',
				],
				additionalProperties: false,
			},
		},
	},
	required: ['spineCount', 'spines'],
	additionalProperties: false,
};

/**
 * Két szabály viszi ezt a promptot, és mindkettő a review-ról szól.
 *
 * Kihagyni egy gerincet tilos: egy hiányzó sort a gyűjtő nem vesz észre a
 * táblázatban, egy üreset igen. Ezért van `unreadable`, és ezért kell a
 * `spineCount` a szövegtől függetlenül — abból derül ki, ha mégis kimaradt
 * valami.
 *
 * Találgatni szintén tilos, ugyanazért, amiért az egylemezes olvasásnál: egy
 * kitalált katalógusszámra a Discogs magabiztosan ad vissza rossz préselést.
 */
const SYSTEM_PROMPT = `You read the spines of music records stacked or filed in one shelf compartment.

First count every spine you can see, including the ones you cannot read, and report that as spineCount. Then return one entry in "spines" for each of them, in the order they sit in the compartment: position 1 is the topmost record of a flat stack, or the leftmost of records standing upright.

Never leave a spine out. A spine whose text you cannot read still gets an entry, with unreadable true and every field null — a visible gap the collector can fill in is fine, a silently missing record is not. spines must have exactly spineCount entries.

Report only what you can actually read. Leave a field null when it is absent, hidden behind another record, blurred, or you would be inferring it from the cover art — a null costs the collector one tap, a wrong value puts the wrong pressing in their collection.

Notes on the fields:
- artist and albumTitle: as printed on the spine. Many spines print only one of the two.
- catalogNumber: the number the label prints at the end of the spine (e.g. "VILELP566", "MOVLP2620", "27361 43091"). Not a barcode, not a price.
- label: the record company, when the spine names it.
- year and country: only when printed on the spine.
- confidence: "high" when you can read the text plainly; "low" when the spine is dark, glossy, angled or largely covered.`;

/** A hordozó, amit a gyűjtő megadhat, ha az egész rekesz egyforma. */
export interface ShelfPhotoContext {
	media: PhotoMedia | null;
}

function parseSpine(payload: unknown, fallbackPosition: number): ShelfSpine {
	const value = (payload ?? {}) as Record<string, unknown>;
	const read = (key: string): string | null => {
		const text = value[key];

		return typeof text === 'string' && text.trim() ? text.trim() : null;
	};
	const media = read('media');
	const year = Number(value['year']);
	const confidence = read('confidence');
	const position = Number(value['position']);

	return {
		position:
			Number.isSafeInteger(position) && position > 0
				? position
				: fallbackPosition,
		unreadable: value['unreadable'] === true,
		artist: read('artist'),
		albumTitle: read('albumTitle'),
		label: read('label'),
		catalogNumber: read('catalogNumber'),
		barcode: read('barcode')?.replace(/\D+/g, '') || null,
		media: MEDIA.find((known) => known === media) ?? null,
		country: read('country'),
		year: Number.isSafeInteger(year) && year > 1000 ? year : null,
		confidence:
			confidence === 'high' || confidence === 'medium'
				? confidence
				: 'low',
	};
}

export function parseShelfRead(payload: unknown): ShelfRead {
	const value = (payload ?? {}) as Record<string, unknown>;
	const list = Array.isArray(value['spines']) ? value['spines'] : [];
	const spines = list
		.map((spine, index) => parseSpine(spine, index + 1))
		.sort((a, b) => a.position - b.position)
		// A modell adhat két gerincnek ugyanazt a pozíciót; a sorrend az, ami
		// számít, a szám csak a kettő közti hivatkozás.
		.map((spine, index) => ({ ...spine, position: index + 1 }));
	const counted = Number(value['spineCount']);

	return {
		spineCount:
			Number.isSafeInteger(counted) && counted >= 0
				? counted
				: spines.length,
		spines,
	};
}

/** Egy fotó gerincei. Hibát nem nyel el: a hívó dönti el, mit mond. */
export async function readShelfSignals(
	photo: PhotoInput,
	client: Anthropic,
	context: ShelfPhotoContext = { media: null }
): Promise<ShelfRead> {
	const response = await create(client, photo, context).catch((error) => {
		throw new VisionError(
			'A polc olvasása nem sikerült.',
			isRetryable(error),
			{ cause: error }
		);
	});

	if (response.stop_reason === 'refusal') {
		throw new VisionError(
			`A modell elzárkózott: ${response.stop_details?.category ?? 'ismeretlen'}`,
			false
		);
	}

	const block = response.content.find((item) => item.type === 'text');

	if (!block || block.type !== 'text') {
		throw new VisionError('A modell nem adott szöveges választ.', false);
	}

	try {
		return parseShelfRead(JSON.parse(block.text));
	} catch (error) {
		throw new VisionError('A modell válasza nem értelmezhető.', false, {
			cause: error,
		});
	}
}

/** Múló hiba-e: a kapcsolat, a 429 és az 5xx az, a 4xx többi része nem. */
function isRetryable(error: unknown): boolean {
	if (error instanceof Anthropic.APIConnectionError) {
		return true;
	}

	const status =
		error instanceof Anthropic.APIError ? (error.status ?? 0) : 0;

	return status === 429 || status >= 500;
}

function create(
	client: Anthropic,
	photo: PhotoInput,
	context: ShelfPhotoContext
) {
	return client.beta.messages.create({
		model: MODEL,
		max_tokens: MAX_TOKENS,
		// Az egy lemez borítójánál ez nehezebb olvasás: apró, gyakran fekete
		// alapon fekete gerincszöveg, ferde szögben, egymást takarva. A
		// nagyobb ráfordítás itt kevesebb üres mezőt jelent, és az üres mező
		// a gyűjtő munkája.
		output_config: {
			effort: 'medium',
			format: { type: 'json_schema', schema: SHELF_SCHEMA },
		},
		betas: ['server-side-fallback-2026-07-01'],
		fallbacks: 'default',
		system: SYSTEM_PROMPT,
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'image',
						source: {
							type: 'base64',
							media_type: photo.mediaType,
							data: photo.data,
						},
					},
					{
						type: 'text',
						text: context.media
							? `Read the spines in this shelf compartment. Every record in it is ${context.media}.`
							: 'Read the spines in this shelf compartment.',
					},
				],
			},
		],
	});
}

/**
 * Két mező akkor mond ugyanazt, ha az összevetéshez normalizált alakjuk
 * egyezik — a Discogs-illesztés ugyanezt a három szabályt használja, így a
 * "VILE LP 566" és a "VILELP566" itt sem két különböző szám.
 */
function same(field: SpineField, a: ShelfSpine, b: ShelfSpine): boolean {
	if (field === 'year') return a.year === b.year;
	if (field === 'catalogNumber') {
		return (
			normalizeCatno(a.catalogNumber) === normalizeCatno(b.catalogNumber)
		);
	}
	if (field === 'barcode') {
		return normalizeBarcode(a.barcode) === normalizeBarcode(b.barcode);
	}

	return normalize(a[field]) === normalize(b[field]);
}

/** Mennyire ugyanaz a lemez a két gerinc: 2 = biztos, 0 = semmi közös. */
function similarity(a: ShelfSpine, b: ShelfSpine): number {
	if (a.unreadable && b.unreadable) return 1;

	let score = 0;

	if (normalize(a.albumTitle) && same('albumTitle', a, b)) score += 1;
	if (normalize(a.artist) && same('artist', a, b)) score += 1;
	if (normalizeCatno(a.catalogNumber) && same('catalogNumber', a, b)) {
		score += 2;
	}

	return score;
}

type Pairing = [ShelfSpine | null, ShelfSpine | null];

/**
 * A két olvasat párosítása. Pozíció szerint párosítani törik, amint az egyik
 * fotó eggyel többet vagy kevesebbet lát: onnantól minden sor elcsúszik. Ez
 * sorrendtartó illesztés (Needleman–Wunsch), így egy kimaradt gerinc csak
 * saját magát rontja el.
 */
export function pairSpines(left: ShelfSpine[], right: ShelfSpine[]): Pairing[] {
	const GAP = -0.5;
	const rows = left.length;
	const columns = right.length;
	const score: number[][] = Array.from({ length: rows + 1 }, () =>
		new Array(columns + 1).fill(0)
	);

	for (let row = 1; row <= rows; row++) score[row][0] = row * GAP;
	for (let column = 1; column <= columns; column++) {
		score[0][column] = column * GAP;
	}

	for (let row = 1; row <= rows; row++) {
		for (let column = 1; column <= columns; column++) {
			score[row][column] = Math.max(
				score[row - 1][column - 1] +
					similarity(left[row - 1], right[column - 1]),
				score[row - 1][column] + GAP,
				score[row][column - 1] + GAP
			);
		}
	}

	const pairs: Pairing[] = [];
	let row = rows;
	let column = columns;

	while (row > 0 || column > 0) {
		const diagonal =
			row > 0 && column > 0
				? score[row - 1][column - 1] +
					similarity(left[row - 1], right[column - 1])
				: -Infinity;

		if (row > 0 && column > 0 && score[row][column] === diagonal) {
			pairs.push([left[row - 1], right[column - 1]]);
			row--;
			column--;
		} else if (
			row > 0 &&
			score[row][column] === score[row - 1][column] + GAP
		) {
			pairs.push([left[row - 1], null]);
			row--;
		} else {
			pairs.push([null, right[column - 1]]);
			column--;
		}
	}

	return pairs.reverse();
}

const valueOf = (spine: ShelfSpine, field: SpineField) => spine[field];

/** A mező átvétele a másik olvasatból, a mezőhöz tartozó típussal. */
function assign(
	target: ShelfSpine,
	field: SpineField,
	value: string | number | null
): void {
	switch (field) {
		case 'year':
			target.year = typeof value === 'number' ? value : null;
			break;
		default:
			target[field] = typeof value === 'string' ? value : null;
	}
}

/**
 * Egy pár összefésülése. Az elsődleges olvasat viszi, de üres mezőjét a
 * másik kitölti — a csillogás szögfüggő, amit az egyik fotó nem lát, azt a
 * másik gyakran igen. Ahol mindkettő mond valamit, de mást, ott konfliktus:
 * ezt a gyűjtőnek kell eldöntenie.
 */
function mergeSpine(
	primary: ShelfSpine,
	secondary: ShelfSpine | null,
	position: number
): MergedSpine {
	const conflicts: SpineField[] = [];
	const alternatives: MergedSpine['alternatives'] = {};
	const merged: ShelfSpine = { ...primary, position };

	if (secondary) {
		for (const field of FIELDS) {
			const mine = valueOf(primary, field);
			const theirs = valueOf(secondary, field);

			if (mine === null && theirs !== null) {
				assign(merged, field, theirs);

				continue;
			}

			if (
				mine !== null &&
				theirs !== null &&
				!same(field, primary, secondary)
			) {
				conflicts.push(field);
				alternatives[field] = theirs;
			}
		}

		merged.media = merged.media ?? secondary.media;
		merged.country = merged.country ?? secondary.country;
		merged.unreadable = primary.unreadable && secondary.unreadable;
	}

	return {
		...merged,
		// Amiben a két fotó egyetért, az többet ér, mint amit egy fotó
		// magabiztosan állít; amiben nem, az kevesebbet.
		confidence: !secondary
			? merged.confidence
			: conflicts.length
				? 'low'
				: merged.confidence === 'low'
					? 'medium'
					: 'high',
		conflicts,
		alternatives,
		seenOn: secondary ? 2 : 1,
	};
}

/**
 * A két fotó olvasatából egy lista. Egy fotóval is működik: akkor minden sor
 * `seenOn: 1`, konfliktus nélkül — a kereszt-ellenőrzés hiányzik, nem a
 * felismerés.
 */
export function mergeShelfReads(reads: ShelfRead[]): MergedShelf {
	const [first, second] = reads;

	if (!first) return { spines: [], spineCounts: [] };

	const spineCounts = reads.map((read) => read.spineCount);

	if (!second) {
		return {
			spines: first.spines.map((spine, index) =>
				mergeSpine(spine, null, index + 1)
			),
			spineCounts,
		};
	}

	const spines = pairSpines(first.spines, second.spines).map(
		([left, right], index) =>
			left
				? mergeSpine(left, right, index + 1)
				: mergeSpine(right as ShelfSpine, null, index + 1)
	);

	return { spines, spineCounts };
}
