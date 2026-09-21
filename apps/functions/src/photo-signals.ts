/**
 * Amit egy lemezfotóról ki lehet olvasni: előadó, cím, kiadó, katalógusszám,
 * vonalkód, hordozó. A képet a Claude nézi meg; a válasz alakját JSON-séma
 * kényszeríti, így a hívónak nem kell szöveget elemeznie.
 *
 * A vonalkódot a kliens dekódolja, ha látja — ide csak az a fotó jut el,
 * amelyiken nincs olvasható vonalkód (jellemzően 1980 előtti bakelit), vagy
 * amelyiknek a vonalkódjára a Discogs nem adott találatot.
 */

import Anthropic from '@anthropic-ai/sdk';

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
 * A modell időnként túlterhelt (529) vagy épp nem elérhető. Ez múló hiba: a
 * következő próbálkozás jellemzően átmegy, és a gyűjtőnek egy kis várakozás
 * sokkal jobb, mint egy hibaüzenet. A kettő szorzata a function 180 másodperces
 * keretén belül marad, hogy a Discogs-keresésnek is jusson idő.
 */
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 30_000;

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

/**
 * Az Anthropic-kliens — egyetlen helyen, mert ez a csatlakozási pont: egy
 * saját AI-gateway mögé állva csak a `baseURL` (és a token) változik.
 *
 * Egy munkaterülethez kötött API-kulcs magától tudja, hova tartozik. A
 * szervezeti szintű kulcs nem, és header nélkül 400-zal elszáll — annak az
 * `ANTHROPIC_WORKSPACE_ID` környezeti változó mondja meg.
 */
export function createVisionClient(apiKey: string): Anthropic {
	const baseURL = process.env['AI_GATEWAY_URL'] || undefined;
	const workspaceId = process.env['ANTHROPIC_WORKSPACE_ID'] || undefined;

	return new Anthropic({
		apiKey,
		maxRetries: MAX_RETRIES,
		timeout: REQUEST_TIMEOUT_MS,
		...(baseURL ? { baseURL } : {}),
		...(workspaceId
			? { defaultHeaders: { 'anthropic-workspace-id': workspaceId } }
			: {}),
	});
}

/**
 * A képolvasás hibája. A hívónak el kell tudnia választani a Discogsétól,
 * különben rossz okot mond a gyűjtőnek — a modell túlterheltsége nem az,
 * hogy a Discogs elérhetetlen. `retryable`: ugyanez a fotó egy újraküldéstől
 * még sikerülhet.
 */
export class VisionError extends Error {
	public constructor(
		message: string,
		public readonly retryable: boolean,
		options?: { cause?: unknown }
	) {
		super(message, options);
		this.name = 'VisionError';
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
	client: Anthropic
): Promise<PhotoSignals> {
	const response = await create(client, photo).catch((error) => {
		throw new VisionError(
			'A kép olvasása nem sikerült.',
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
		return parseSignals(JSON.parse(block.text));
	} catch (error) {
		throw new VisionError('A modell válasza nem értelmezhető.', false, {
			cause: error,
		});
	}
}

/** Maga a hívás; a hibáit a `readPhotoSignals` fordítja `VisionError`-ra. */
function create(client: Anthropic, photo: PhotoInput) {
	return client.beta.messages.create({
		model: MODEL,
		max_tokens: 2000,
		// Rutin kiolvasás: a mély gondolkodás itt csak késleltetés és költség.
		output_config: {
			effort: 'low',
			format: { type: 'json_schema', schema: SIGNALS_SCHEMA },
		},
		// Ha a modell mégis elzárkózna, a kérés ugyanebben a hívásban átmegy
		// egy másik modellre, a gyűjtő hibaüzenet helyett eredményt kap.
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
						text: 'Read the identifiers off this record.',
					},
				],
			},
		],
	});
}
