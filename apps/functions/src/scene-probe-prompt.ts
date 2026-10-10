/**
 * Jelenet-próba: stíluszár-jelöltek a kollekciók háttérképéhez.
 *
 * Ez egy **kísérlet**, nem kész funkció. A badge-ek stíluszára
 * (`music-collection-badge-prompt.ts`) azért tartja egy készletben a
 * pineket, mert betűre ugyanaz minden generáláson — egy ilyen zárat viszont
 * nem lehet elsőre megírni. Ez a fájl az a pad, amin kiderül, melyik
 * fogalmazás adja azt a képet, amit a mockup ígér; ami nyer, abból lesz a
 * `SCENE_STYLE_PREFIX`/`SUFFIX` és a `SCENE_STYLE_VERSION`, és ez a fájl
 * akkor elmegy.
 *
 * Ezért nincs itt se verziószám, se Storage-írás, se galéria: a próbaképek
 * `data:` URL-ként élnek a válaszban, megnézi őket valaki, és eltűnnek. Egy
 * dokumentum nélküli Storage-objektum nem keletkezhet, egy eldobásra
 * született kép pedig nem érdemel dokumentumot.
 *
 * Tisztán tartva (se `firebase-functions`, se `firebase-admin`), hogy a jest
 * be tudja tölteni — ugyanaz a szétválasztás, mint a `badge-settings.ts`-nél.
 */

/** Melyik fogalmazás szerint szól a zár; a `none` a zár nélküli, nyers próba. */
export type SceneStyleDraft = 'nocturne' | 'weathered' | 'interior' | 'none';

export const SCENE_STYLE_DRAFTS: readonly SceneStyleDraft[] = [
	'nocturne',
	'weathered',
	'interior',
	'none',
];

/**
 * Amit egy zár mond a képről, a tárgyon kívül.
 *
 * Mindegyik ugyanazt a három dolgot kéri, más szavakkal: filmszerű felvétel,
 * egyetlen fényforrás, és egy **üres, sötét sáv** a képkockában. Az utolsó
 * nem ízlés kérdése: a kép mögé cím kerül, és egy mindenhol zsúfolt háttéren
 * nincs hova tenni. A CSS-gradiens ezt elfedni tudja, kitalálni nem.
 */
interface StyleLock {
	prefix: string;
	suffix: string;
}

const LOCKS: Record<Exclude<SceneStyleDraft, 'none'>, StyleLock> = {
	/** Éjszaka, egy messzi meleg fénnyel — a hídé a mockupon. */
	nocturne: {
		prefix: 'Cinematic wide establishing shot at night of ',
		suffix:
			', photographed on anamorphic lenses: deep blue-black shadows, ' +
			'a single warm amber practical light glowing in the far ' +
			'distance, low-lying haze, muted desaturated palette broken by ' +
			'that one warm accent, fine 35mm film grain, the left third of ' +
			'the frame falling away into near-black empty space with ' +
			'nothing of interest in it, wide 16:9 cinematic framing.',
	},
	/** Hideg, ködös, napfény nélküli — az északi tájé. */
	weathered: {
		prefix: 'Cinematic wide landscape photograph at blue hour of ',
		suffix:
			', shot on a long lens through layers of mist: cold desaturated ' +
			'blue-grey palette, soft overcast light with no visible sun, ' +
			'receding planes of fog separating the depth, crushed matte ' +
			'black shadows, fine film grain, the lower third of the frame ' +
			'fading into flat darkness, wide 16:9 cinematic framing.',
	},
	/** Belső tér, egyetlen lámpával — a lap mögötti háttéré. */
	interior: {
		prefix: 'Cinematic interior photograph, shallow depth of field, of ',
		suffix:
			', lit by a single warm tungsten lamp just outside the frame: ' +
			'everything behind the foreground dissolving into soft bokeh, ' +
			'deep amber and brown palette, dust motes hanging in the light, ' +
			'heavy vignetting, crushed black shadows filling the edges of ' +
			'the frame, fine film grain, wide 16:9 cinematic framing.',
	},
};

/**
 * Ami egyik jeleneten sem lehet rajta.
 *
 * A felirat és a logó azért, amiért a badge-nél: a modell rosszul szedi a
 * betűt, egy kitalált zenekari logó pedig védjegyet rajzol. Az albumborító
 * külön tiltva — a kép egy *hely*, nem egy lemez fényképe —, az emberalak
 * pedig azért, mert a kártya fölé arcok kerülnek, és két arc egy képen
 * egymást üti.
 */
export const SCENE_NEGATIVE_PROMPT =
	'text, letters, words, numbers, logos, watermark, signature, album ' +
	'cover art, record sleeve, band logo, poster, people, faces, human ' +
	'figures, crowd, musicians, cartoon, illustration, 3d render, cgi, ' +
	'video game screenshot, oversaturated colours, hdr, high key lighting, ' +
	'busy cluttered composition, collage, split screen, border frame';

/**
 * Méretek, amik közül a próba választhat.
 *
 * Zárt lista, mert a `size` a gatewayen át a szolgáltatóhoz megy, és egy
 * szabad string ott vagy hibát ad, vagy — rosszabb — kifizetünk egy olyan
 * képet, amit senki nem kért. Hogy a mai képmodell melyiket fogadja el, az
 * nincs leírva sehol: pont ezért van több közülük a lapon.
 */
export const SCENE_SIZES = [
	'1024x1024',
	'1344x768',
	'1536x864',
	'1920x1080',
] as const;

export type SceneSize = (typeof SCENE_SIZES)[number];

/** Hány kép készüljön egy próbán. Négynél több egy kísérlethez pazarlás. */
export const MAX_PROBE_IMAGES = 4;

/**
 * A tárgy felső hossza.
 *
 * Bőven a használható prompt fölött, szándékosan: a `none` záron a tárgy az
 * **egész** prompt, és egy kézzel csiszolt jelenet-leírás több bekezdés is
 * lehet. Ez a szám nem ízlést fejez ki, hanem azt, hogy egy elszabadult
 * kliens ne küldhessen regényt a mi számlánkra — a próba padja pont attól
 * pad, hogy szabadon lehet rajta írni.
 */
export const MAX_SUBJECT_LENGTH = 4000;

/**
 * A modellnév felső hossza. Szabad szöveg, mint a tárgy, és ugyanazért: a
 * próbapad arra való, hogy kiderüljön, melyik modell rajzol úgy, ahogy kell.
 * Egy rossz név hibát ad vissza, nem pénzt visz.
 */
const MAX_MODEL_LENGTH = 100;

/** Amit a kliens küld, miután a szerver megnézte. */
export interface SceneProbeRequest {
	/** Mi legyen a képen — a kollekció „helye”, egy mondatban. */
	subject: string;
	draft: SceneStyleDraft;
	size: SceneSize;
	count: number;
	/**
	 * Melyik modell rajzoljon. Üresen hagyva a gateway választ az ársáv
	 * alapján — és az ma a leggyengébb képmodellre megy, ami pont az a baj,
	 * amiért ez a mező létezik.
	 */
	model: string | null;
}

/** A kész prompt, és amiből lett. */
export interface SceneProbePrompt {
	prompt: string;
	negativePrompt: string;
	draft: SceneStyleDraft;
	size: SceneSize;
	count: number;
	model: string | null;
}

/** Hibás bemenet. A hívó fordítja `HttpsError`-ra; ez a fájl tiszta marad. */
export class SceneProbeInputError extends Error {}

function text(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

/**
 * A kliens bemenete, megtisztítva.
 *
 * A szabad szöveg itt **szándékos**, és csak azért engedhető meg, mert a
 * hívás admin-jogosultságot kér és a napi képkeret számlálója alatt fut: a
 * kísérlet tárgya épp az, hogy mi legyen a promptban. A kész funkcióban ez
 * nem marad így — ott a szerver írja a promptot a tárolt definícióból, mint
 * a badge-nél, és a kliens csak a collection uid-jét küldi.
 */
export function readProbeRequest(data: unknown): SceneProbeRequest {
	const input = (data ?? {}) as Record<string, unknown>;
	// A soremelés a prompt szövegében semmit nem jelent, viszont a naplóban
	// szétesik tőle a sor: egy szóköz lesz mindegyikből.
	const subject = text(input['subject']).replace(/\s+/g, ' ').trim();

	if (!subject) {
		throw new SceneProbeInputError('A jelenet tárgya üres.');
	}

	if (subject.length > MAX_SUBJECT_LENGTH) {
		throw new SceneProbeInputError(
			`A jelenet tárgya túl hosszú (${MAX_SUBJECT_LENGTH} karakter a határ).`
		);
	}

	const draft = text(input['draft']) as SceneStyleDraft;

	if (!SCENE_STYLE_DRAFTS.includes(draft)) {
		throw new SceneProbeInputError('Ismeretlen stíluszár.');
	}

	const size = text(input['size']) as SceneSize;

	if (!SCENE_SIZES.includes(size)) {
		throw new SceneProbeInputError('Ismeretlen képméret.');
	}

	const requested = Number(input['count']);
	const count = Number.isFinite(requested)
		? Math.min(Math.max(Math.floor(requested), 1), MAX_PROBE_IMAGES)
		: 1;
	const model = text(input['model']).trim();

	if (model.length > MAX_MODEL_LENGTH) {
		throw new SceneProbeInputError('A modell neve túl hosszú.');
	}

	return { subject, draft, size, count, model: model || null };
}

/**
 * A kész prompt a tárgyból és a zárból.
 *
 * A negatív prompt a szövegbe olvad, ahogy a badge-nél: a gateway képes
 * bemenete nem ismeri külön. A `none` zár az egyetlen, ami tiltólistát sem
 * kap — az a nyers próba, ahol a tárgy maga az egész prompt, és pont az a
 * kérdés, mit csinál a modell magától.
 */
export function buildProbePrompt(request: SceneProbeRequest): SceneProbePrompt {
	const { subject, draft, size, count, model } = request;

	if (draft === 'none') {
		return {
			prompt: subject,
			negativePrompt: '',
			draft,
			size,
			count,
			model,
		};
	}

	const lock = LOCKS[draft];
	const prompt = `${lock.prefix}${subject}${lock.suffix}`;

	return {
		prompt: `${prompt} Do not include: ${SCENE_NEGATIVE_PROMPT}.`,
		negativePrompt: SCENE_NEGATIVE_PROMPT,
		draft,
		size,
		count,
		model,
	};
}
