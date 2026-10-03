/**
 * Amit egy lemezfotóról ki lehet olvasni: előadó, cím, kiadó, katalógusszám,
 * vonalkód, hordozó. A képet a Claude nézi meg az AI-gatewayen át
 * (`vision-client.ts`); a válasz alakját JSON-séma kényszeríti, így a hívónak
 * nem kell szöveget elemeznie.
 *
 * A vonalkódot a kliens dekódolja, ha látja — ide csak az a fotó jut el,
 * amelyiken nincs olvasható vonalkód (jellemzően 1980 előtti bakelit), vagy
 * amelyiknek a vonalkódjára a Discogs nem adott találatot.
 */

import { VisionClient, readImageJson } from './vision-client';

/** A hordozó, ahogy a katalógus `media` mezője érti. */
export type PhotoMedia = 'vinyl' | 'cd' | 'cassette' | 'dvd';

const MEDIA: PhotoMedia[] = ['vinyl', 'cd', 'cassette', 'dvd'];

export interface PhotoSignals {
	artist: string | null;
	albumTitle: string | null;
	label: string | null;
	/** A borítón/címkén nyomtatott katalógusszám, pl. "SRM-1-1035". */
	catalogNumber: string | null;
	/** A vonalkód számjegyei, ha a képen olvasható. */
	barcode: string | null;
	media: PhotoMedia | null;
	country: string | null;
	year: number | null;
	/** Mennyire olvasható a kép — a hívó ebből dönt a Discogs-keresésről. */
	confidence: 'high' | 'medium' | 'low';
}

/** A kép, ahogy a kliens küldi. */
export interface PhotoInput {
	/** A kép base64-ben, data-URL előtag nélkül. */
	data: string;
	mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export const PHOTO_MEDIA_TYPES: PhotoInput['mediaType'][] = [
	'image/jpeg',
	'image/png',
	'image/webp',
];

const MODEL = 'claude-opus-5';

/**
 * Egy kérés felső határa. Az újrapróbálással együtt (`vision-client.ts`) ez a
 * function 180 másodperces keretén belül marad, hogy a Discogs-keresésnek is
 * jusson idő.
 */
export const PHOTO_REQUEST_TIMEOUT_MS = 60_000;

const nullableString = { type: ['string', 'null'] };

const SIGNALS_SCHEMA = {
	type: 'object',
	properties: {
		artist: nullableString,
		albumTitle: nullableString,
		label: nullableString,
		catalogNumber: nullableString,
		barcode: nullableString,
		// A séma-ellenőrzés az `enum`-ot nem fogadja el unió-típus mellett;
		// a "valamelyik hordozó, vagy semmi" így írható le.
		media: { anyOf: [{ type: 'string', enum: MEDIA }, { type: 'null' }] },
		country: nullableString,
		year: { type: ['integer', 'null'] },
		confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
	},
	required: [
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
};

/**
 * A találgatás itt drágább, mint a hiány: egy kitalált katalógusszámra a
 * Discogs magabiztosan ad vissza egy rossz préselést, amit a gyűjtő nem vesz
 * észre. Egy üres mezőből viszont csak eggyel több kérdés lesz.
 */
const SYSTEM_PROMPT = `You read the identifiers off a photo of a music record (vinyl, CD, cassette) — the sleeve, the back cover, the label or the inlay.

Report only what you can actually read in the image. Leave a field null when it is absent, cut off, blurred or you are guessing — a null costs the collector one extra tap, a wrong value puts the wrong pressing in their collection.

Notes on the fields:
- catalogNumber: the number printed by the label on the spine, back cover or centre label (e.g. "SRM-1-1035", "LPX 17693"). Not the barcode, not the matrix code etched in the run-out groove.
- barcode: the digits under the EAN/UPC bars, digits only.
- label: the record company (e.g. "Mercury", "Hungaroton"), not the distributor and not the artist.
- country and year: only when printed on the item.
- confidence: "high" when the artist, the title and at least one identifier (catalog number or barcode) are clearly legible; "low" when you are mostly inferring from the cover art.`;

function parseSignals(payload: unknown): PhotoSignals {
	const value = (payload ?? {}) as Record<string, unknown>;
	const read = (key: string): string | null => {
		const text = value[key];

		return typeof text === 'string' && text.trim() ? text.trim() : null;
	};
	const media = read('media');
	const year = Number(value['year']);
	const confidence = read('confidence');

	return {
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

/**
 * A fotó jelei. Hibát nem nyel el: a hívó dönti el, mit mond a gyűjtőnek.
 */
export async function readPhotoSignals(
	photo: PhotoInput,
	client: VisionClient
): Promise<PhotoSignals> {
	return parseSignals(
		await readImageJson(client, {
			model: MODEL,
			systemPrompt: SYSTEM_PROMPT,
			prompt: 'Read the identifiers off this record.',
			photo,
			schema: { name: 'photo_signals', schema: SIGNALS_SCHEMA },
			maxTokens: 2000,
			failure: 'A kép olvasása nem sikerült.',
		})
	);
}
