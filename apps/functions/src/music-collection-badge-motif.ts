/**
 * Az `ai` kontextusszint: a pin tárgyát egy szöveges modell írja meg.
 *
 * A táblázatos motívum stílusszintű — minden thrash collection ugyanabból a
 * három sorból választ. Ez a modul azt engedi meg, hogy a tárgy magáról a
 * lemezsorról szóljon: a modell megkapja a collection nevét, az előadóit, a
 * stílusait és a lemezeit évszámostul, és ad egy *egy* mondatnyi tárgyat,
 * amit az öntő ki tud emelni a fémből.
 *
 * Amit a modell nem tehet, és amit ezért nem is kérünk tőle: a zenekar neve
 * nem kerülhet a pinre. Két okból. A képmodell a nevet felirattá rajzolja, és
 * elgépeli — a negatív prompt pont emiatt tiltja a betűt. A másik ok
 * komolyabb: egy zenekar kabalája és logója védjegy, a borítója pedig valaki
 * más szerzői műve. Egy jelvény, ami ezeket másolja, nem a mi jelvényünk.
 * Ezért a brief tárgyakat kér, a válasz pedig átmegy egy szűrőn, ami a
 * neveket és a feliratra csábító szavakat kiszűri.
 *
 * Hibát nem nyelünk el. Ha az admin az `ai` szintet választotta, és a modell
 * nem ad használható tárgyat, a generálás álljon meg: a csendes visszaesés a
 * táblázatra pontosan az a látszat-kontextus, ami ellen ez az egész készült.
 */

import { ResponseSchema, ZsAiError } from '@zssz-soft/zs-ai-sdk';

import { GatewayClient } from './gateway-client';

/** A motívumírás baja. A hívó fordítja `HttpsError`-ra. */
export class MotifError extends Error {
	public constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = 'MotifError';
	}
}

/** Amit a modell megtud a collectionről. */
export interface MotifBrief {
	collectionName: string;
	artistNames: string[];
	styles: string[];
	albums: { name: string; year: number | null }[];
}

/** Ennyi lemezcím fér a briefbe; ennél többől sem lesz jobb a tárgy. */
const MAX_ALBUMS_IN_BRIEF = 24;
/** Ennyi próbálkozás: a második a szűrőn elbukott válasz után jár. */
const MAX_ATTEMPTS = 2;
/** Egy tárgy leírása ennél hosszabb nem lehet. */
const MAX_WORDS = 16;
const MIN_WORDS = 3;
const MAX_CHARACTERS = 140;
/** Egy mondatnyi tárgy ennél több tokent nem kér. */
const MAX_TOKENS = 300;

const RESPONSE_SCHEMA: ResponseSchema = {
	name: 'badge_motif',
	schema: {
		type: 'object',
		properties: {
			motif: {
				type: 'string',
				description:
					'One sculptable object, as a noun phrase beginning with ' +
					'"a", "an" or "two".',
			},
		},
		required: ['motif'],
		additionalProperties: false,
	},
};

const SYSTEM_PROMPT = [
	'You brief a sculptor who casts pewter enamel pin badges for a metal',
	'record collection. For each collection you name ONE object to strike',
	'into the metal.',
	'',
	'Answer with a single noun phrase, three to sixteen words, beginning',
	'with "a", "an" or "two". No sentence, no explanation, no quotes.',
	'',
	'The object must be physical and castable in relief: things with an',
	'outline a mould can hold — a skull, an axe, a bell, a gear, a wing, a',
	'cracked stone. Never an abstraction, a mood, a scene with a horizon, a',
	'landscape, or an action.',
	'',
	'Hard rules, because a badge is a product:',
	'- Never name a band, a person, an album or a song. Not even indirectly.',
	'- Never describe text, letters, numbers, a logo, a wordmark, an',
	'  inscription or a signature.',
	'- Never describe a band mascot or a figure from an album cover. Those',
	'  are other people’s trademarks and artwork.',
	'- Never describe a recognisable living person.',
	'',
	'What you may use: what the records are ABOUT. Their recurring imagery,',
	'their era, the objects their titles keep returning to. Prefer an object',
	'that only this run of records would suggest over one that would suit',
	'any band of the genre.',
].join('\n');

/** A brief, ahogy a modell elé kerül. */
export function describeBrief(brief: MotifBrief): string {
	const albums = brief.albums
		.slice(0, MAX_ALBUMS_IN_BRIEF)
		.map(
			(album) => `- ${album.name}${album.year ? ` (${album.year})` : ''}`
		)
		.join('\n');

	return [
		`Collection: ${brief.collectionName}`,
		brief.artistNames.length
			? `Artists: ${brief.artistNames.join(', ')}`
			: 'Artists: several, not named by the rule',
		brief.styles.length
			? `Styles: ${brief.styles.slice(0, 5).join(', ')}`
			: 'Styles: heavy metal, unspecified',
		albums ? `Records:\n${albums}` : 'Records: not listed',
		'',
		'Name the one object to strike into this badge.',
	].join('\n');
}

/**
 * Szavak, amiktől a tárgy már nem tárgy: felirat, védjegy, vagy ember.
 *
 * A modell a tiltást megkapta a rendszerüzenetben is; ez az a háló, ami
 * alatta van. Egy jelvény évekig néz vissza a polcról — olcsóbb egyszer
 * elbukni egy generálást, mint utólag levenni egy pint, amin egy idegen
 * logó van.
 */
const FORBIDDEN = [
	'album cover',
	'band',
	'emblem',
	'font',
	'inscription',
	'label',
	'letter',
	'lettering',
	'logo',
	'mascot',
	'name',
	'portrait',
	'signature',
	'slogan',
	'text',
	'title',
	'trademark',
	'typography',
	'watermark',
	'word',
	'wordmark',
];

/** Egy szó a szövegben, nem egy szó belsejében. */
function mentions(text: string, term: string): boolean {
	const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

	return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

/**
 * A modell válasza tárgyként — vagy `null`, ha nem az.
 *
 * Az előadók nevét külön nézzük. A rendszerüzenet tiltja ugyan, de egy
 * tiltás nem ellenőrzés: egy „Megadeth" a motívumban feliratot és kabalát
 * hívna a pinre, és azt itt kell megfogni, nem a képmodellnél.
 */
export function acceptMotif(
	value: unknown,
	artistNames: string[]
): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const motif = value.trim().replace(/\s+/g, ' ').replace(/[.]$/, '');
	const words = motif.split(' ');

	if (
		motif.length > MAX_CHARACTERS ||
		words.length < MIN_WORDS ||
		words.length > MAX_WORDS ||
		!/^(a|an|two) /i.test(motif) ||
		/[0-9"'`:;!?]/.test(motif)
	) {
		return null;
	}

	if (FORBIDDEN.some((term) => mentions(motif, term))) {
		return null;
	}

	return artistNames.some((name) => name.length > 2 && mentions(motif, name))
		? null
		: motif;
}

/** A gateway válaszából a motívum, ha értelmezhető. */
function parseMotif(text: string, artistNames: string[]): string | null {
	try {
		const parsed = JSON.parse(text) as { motif?: unknown };

		return acceptMotif(parsed.motif, artistNames);
	} catch {
		return null;
	}
}

/**
 * A pin tárgya, a collection tényeiből, modellel megíratva.
 *
 * Egy hívás, legfeljebb kétszer: a második akkor jár, ha az első válasz a
 * szűrőn elbukott. A kép-ársávot nem örökli, mert nem képet kér — a gateway
 * az alapsávban olyan modellt ad, ami egy mondatot olcsón megír.
 */
export async function writeBadgeMotif(
	client: GatewayClient,
	brief: MotifBrief
): Promise<{ motif: string; model: string }> {
	const prompt = describeBrief(brief);
	let last: string | null = null;

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
		let result;

		try {
			result = await client.execute({
				capability: 'text.complete',
				input: {
					systemPrompt: SYSTEM_PROMPT,
					prompt:
						attempt === 1
							? prompt
							: `${prompt}\n\nThe previous answer was rejected: ` +
								'it named something forbidden, or was not a ' +
								'plain noun phrase. Answer again, with an ' +
								'object only.',
					responseSchema: RESPONSE_SCHEMA,
					maxTokens: MAX_TOKENS,
				},
			});
		} catch (error) {
			throw new MotifError(
				error instanceof ZsAiError
					? `A gateway nem írt motívumot (${error.code}): ${error.message}`
					: `A gateway nem válaszolt: ${String(error)}`,
				{ cause: error }
			);
		}

		// A szövegírás a gateway szinkron képessége; egy `accepted` válasz azt
		// jelentené, hogy a szerződés megváltozott alattunk.
		if (result.kind !== 'result') {
			throw new MotifError(
				'A gateway a motívumot végrehajtásnak vette; szinkron választ várunk.'
			);
		}

		const text = result.output?.text ?? null;
		const motif = text ? parseMotif(text, brief.artistNames) : null;

		if (motif) {
			return { motif, model: result.model ?? 'ismeretlen' };
		}

		last = text ?? null;
	}

	throw new MotifError(
		'A modell nem adott megönthető motívumot' +
			(last ? `: ${last.slice(0, 200)}` : '.')
	);
}
