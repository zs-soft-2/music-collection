/**
 * A collection szavakká fordítása, hogy egy képmodell megönthesse a pint.
 *
 * A badge egyszer készül el, és utána kész: eszköz, nem render. Ettől a
 * prompton áll vagy bukik minden — két pin csak akkor tartozik egy
 * készletbe, ha ugyanazok a mondatok készítették. Ezért a lenti stíluszár
 * betűre ugyanaz minden badge-en; a collection csak a motívumot, a
 * zománcot, a patinát és a peremet választja.
 *
 * A prompt itt épül, a szerveren, nem a kliensen: a generálás a mi
 * számlánkra megy, és egy klienstől érkező promptra nem bízhatjuk rá, mit
 * rajzoltat. A kliens csak a collection uid-jét küldi.
 *
 * A BADGE_STYLE_VERSION emelése szándékos tett: a már legenerált badge-ek
 * megtartják a saját promptjukat, és csak az újak beszélik az új nyelvet.
 * Két stílusverzió egy polcon pont az a következetlenség, ami ellen ez a
 * fájl készült — vagyis az emelés az összes badge újragenerálását jelenti.
 */

/** Csak akkor emeld, ha a lenti zár változik. Minden badge mellé bekerül. */
export const BADGE_STYLE_VERSION = 2;

/**
 * Kötött szöveg, első fele. Azt mondja meg, miféle tárgyról készül a kép,
 * még mielőtt bármi szó esne erről a collectionről.
 *
 * A pin alatt nincs asztal: a badge a saját körvonalán ér véget, és onnantól
 * a PNG alfa-csatornája üres. A badge ugyanis nem egy képen ül, hanem egy
 * lapon, egy listában, egy sötét és egy világos felületen — bármi, ami
 * mögé odaszárad, pont ott lesz rossz színű.
 */
const STYLE_PREFIX =
	'Antique cast pewter enamel pin badge, a single isolated pin centred in ' +
	'frame, cut out on a fully transparent background: no surface, no ' +
	'backdrop and no shadow, the PNG alpha channel empty everywhere the pin ' +
	'itself is not. ';

/**
 * Kötött szöveg, második fele. Azt mondja meg, hogyan öntött, világított és
 * felületkezelt a fém. Ettől néz ki úgy egy koponya és egy ivókürt, mintha
 * ugyanaz az öntöde adta volna ki őket.
 */
const STYLE_SUFFIX =
	' Oxidised silver pewter with bright polished edge highlights and dark ' +
	'antiqued recesses, high-relief sculpted casting, deeply recessed ' +
	'sandblasted matte black field behind the relief, fine casting pitting ' +
	'in the metal, heavy metal band merchandise aesthetic, macro product ' +
	'photograph, soft studio key light from the upper left, nothing behind ' +
	'or beneath the pin, the pin filling about ninety percent of the ' +
	'square frame.';

/**
 * Ami nem kerülhet rá. A felirat kifejezetten tiltott: a képmodell rosszul
 * szedi a betűt, és egy elgépelt badge rosszabb, mint egy néma. Amelyik
 * badge szót akar, az később kap die-cut formát, kézzel.
 */
export const BADGE_NEGATIVE_PROMPT =
	'text, letters, words, numbers, watermark, signature, multiple pins, ' +
	'grid of pins, collage, hands, human figure, blurry, soft focus, low ' +
	'contrast, flat vector illustration, cartoon, plastic, toy, background, ' +
	'backdrop, surface, table, floor, charcoal background, grey background, ' +
	'black background, coloured background, white background, gradient ' +
	'background, drop shadow, cast shadow, reflection, border frame';

/**
 * Minden pin tárgya: stílusonként egy megönthető dolog, sosem egy hangulat.
 * Az öntő ki tud emelni egy ivókürtöt; a „melankóliát" senki.
 *
 * A kulcsok a `StyleEnum` értékei (`libs/common/api`). Teszt tartja nyitva,
 * hogy mindegyikre jusson motívum — egy lemaradt stílus csendben ugyanazt a
 * általános pint adná egy egész műfajnak, és pont ez a tábla van ellene.
 */
export const MOTIF_BY_STYLE: Record<string, string> = {
	'Alternative metal': 'a cracked industrial gear split by a lightning bolt',
	'Alternative Rock': 'a worn guitar plectrum over a broken vinyl record',
	'Avantgarde metal':
		'a fractured theatre mask breaking into geometric shards',
	'Blackened Doom': 'a heavy iron bell hanging in a dead tree',
	'Blackened Thrash': 'a horned skull wearing a studded bullet belt',
	'Bay Area Thrash': 'a suspension bridge tower behind two crossed guitars',
	Black: 'a bare winter forest under a thin crescent moon',
	'Blues Rock': 'a slide guitar neck crossed with a harmonica',
	'Brutal Death': 'a cracked anvil struck by a heavy chain',
	'Celtic Folk metal': 'a celtic knotwork ring around a carved harp',
	Death: 'a weathered skull over two crossed scythes',
	'Death Doom': 'a mourning stone angel with folded wings',
	Deathgrind: 'a circular saw blade over two crossed bones',
	Doom: 'a cracked church bell hanging from a heavy chain',
	'First wave of black metal':
		'a three branched candelabra with guttering candles',
	'Folk metal': 'a drinking horn crossed with a hand axe',
	'Funk Rock': 'a bass guitar headstock over a starburst',
	'Glam Rock': 'a platform boot struck through by a lightning bolt',
	'Glam Metal': 'a studded leather bracelet around a five point star',
	Gothenburg: 'a wolf head in profile wrapped in knotwork',
	Gothic: 'a cathedral rose window holding a single rose',
	'Gothic Doom': 'a weeping stone gargoyle on a broken column',
	Grindcore: 'a crushed tin can behind a circular saw blade',
	Groove: 'a clenched fist gripping a thick chain link',
	'Groove Thrash': 'a sledgehammer crossed with a snapped chain',
	Grunge: 'a smashed guitar body over a torn flannel patch',
	'Hard rock': 'a double neck guitar over a winged wheel',
	'Heavy metal': 'a horned hand sign wearing a spiked wristband',
	'Melodic Death': 'a stag skull with antlers wound in thorns',
	'Melodic Doom': 'a broken hourglass spilling sand over a wilted rose',
	Metalcore: 'a torn chain link inside a ring of barbed wire',
	'New Wave Of British Heavy Metal':
		'a knight helmet visor over two crossed Flying V guitars',
	'Pagan Thrash': 'a raven perched inside a ring of rune stones',
	'Power metal': 'a winged sword rising out of a crown',
	'Progressive metal': 'an armillary sphere of interlocking brass rings',
	'Progressive Death': 'a skull dissolving into a geometric lattice',
	'Progressive Thrash': 'a clockwork gear train driving a guitar tuning peg',
	'Rap Rock': 'a microphone crossed with a spray can',
	Rock: 'a plectrum over a vinyl record and crossed drumsticks',
	Speed: 'a flaming motorcycle wheel trailing speed lines',
	'Symphonic Heavy metal':
		'a violin scroll crossed with a sword beneath a crown',
	'Technical Death': 'a mechanical skull with an exposed clockwork jaw',
	'Technical Thrash': 'an exploded diagram of a gear driven metronome',
	'Teutonic Thrash': 'a spiked steel helmet over two crossed hammers',
	Thrash: 'a screaming skull wreathed in flames',
	'US Power metal': 'an eagle clutching a sword over a shield',
};

/** Ha a katalógus semmit nem mond a stílusról, a pinnek akkor is lennie kell. */
const FALLBACK_MOTIF = 'a vinyl record crossed by a tonearm';

/**
 * A zománc stíluscsaládonként. A színt fogja meg leggyorsabban a szem,
 * ezért a műfajt követi, nem az egyes collectiont: minden thrash badge
 * ugyanúgy izzik narancsra, és egy polcnyi belőlük sorozatnak látszik.
 */
const ENAMEL_BY_FAMILY: { match: RegExp; enamel: string }[] = [
	{ match: /thrash|speed/i, enamel: 'fiery orange and red enamel' },
	{ match: /death|grind/i, enamel: 'deep blood red enamel' },
	{ match: /black/i, enamel: 'pale ice blue enamel' },
	{ match: /doom|gothic/i, enamel: 'dark verdigris green enamel' },
	{ match: /folk|pagan|celtic/i, enamel: 'moss green enamel' },
	{ match: /power|symphonic/i, enamel: 'royal blue and gold enamel' },
	{ match: /glam/i, enamel: 'hot magenta enamel' },
	{ match: /progressive/i, enamel: 'deep violet enamel' },
	{ match: /core|groove/i, enamel: 'burnt orange enamel' },
];
/** Amit a családok nem fognak meg. */
const FALLBACK_ENAMEL = 'oxblood red enamel';

/** Ennyi évesen olvasódik a fém rendesen öregnek. */
const VINTAGE_YEARS = 40;
/** Ennyi évesen legalább már nem látszik újnak. */
const AGED_YEARS = 20;

/** Itt lesz egy collectionből emléktárgy helyett trófea. */
const TIER_2_POINTS = 250;
const TIER_3_POINTS = 450;

/** Amit a collection elmond magáról az öntőnek. */
export interface BadgePromptInput {
	/** A collection stílusai, abban a sorrendben, ahogy a criteria mondja. */
	styles: string[];
	/** A legkorábbi album-év, amit a szabály elér; `null`, ha ismeretlen. */
	earliestYear: number | null;
	/** Amennyit a teljesítése ér — a kurátoré vagy a szabályé. */
	points: number;
	/** Az egyszerzős collection die-cut pint kap, nem korongot. */
	isSingleArtist: boolean;
	/** Ebből lesz a seed, így ugyanaz a collection ugyanazt a pint önti. */
	slug: string;
}

/** Minden, ami a generáló függvénynek kell, és amit a badge megőriz. */
export interface BadgePrompt {
	prompt: string;
	negativePrompt: string;
	/** Ugyanaz a collection, ugyanaz a seed — a badge újraelőállítható. */
	seed: number;
	styleVersion: number;
	aspectRatio: '1:1';
}

/** Az első stílus motívuma, amit a collection megnevez. */
export function motifOf(styles: string[]): string {
	const style = styles[0];

	return style === undefined
		? FALLBACK_MOTIF
		: (MOTIF_BY_STYLE[style] ?? FALLBACK_MOTIF);
}

/** Az első stílus zománca, amit a collection megnevez. */
export function enamelOf(styles: string[]): string {
	const style = styles[0];

	if (style === undefined) {
		return FALLBACK_ENAMEL;
	}

	return (
		ENAMEL_BY_FAMILY.find(({ match }) => match.test(style))?.enamel ??
		FALLBACK_ENAMEL
	);
}

/**
 * Mennyire koptatott a fém. A szabály által elért legrégebbi lemezből jön,
 * nem abból, mikor írták a collectiont: egy tegnap megírt 1982-es
 * collection attól még 1982-ről szól.
 */
export function patinaOf(earliestYear: number | null, now: number): string {
	if (earliestYear === null) {
		return 'aged pewter with darkened recesses';
	}

	const age = new Date(now).getUTCFullYear() - earliestYear;

	if (age >= VINTAGE_YEARS) {
		return 'heavily blackened antique patina, worn smooth on the raised edges';
	}

	return age >= AGED_YEARS
		? 'aged pewter with darkened recesses'
		: 'bright polished nickel with only light oxidation';
}

/** A perem viszi a collection súlyát, hogy a szem rangsorolni tudja őket. */
export function rimOf(points: number): string {
	if (points >= TIER_3_POINTS) {
		return 'a double stepped rim with a rope twist border';
	}

	return points >= TIER_2_POINTS
		? 'a raised beaded rim'
		: 'a plain raised rim';
}

/**
 * A slug stabil, 32 bites hashe. A seednek túl kell élnie egy újraépítést,
 * egy deployt és egy másik gépet, ezért nem jöhet másból, mint a collection
 * saját nevéből.
 */
export function seedOf(slug: string): number {
	let hash = 2166136261;

	for (let index = 0; index < slug.length; index += 1) {
		hash ^= slug.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return hash >>> 0;
}

/** A mondatok, amik egy collection pinjét öntik. */
export function buildBadgePrompt(
	input: BadgePromptInput,
	now: number
): BadgePrompt {
	const subject = input.isSingleArtist
		? `The pin is die cut to the silhouette of ${motifOf(input.styles)}, with ${rimOf(input.points)} following its outline.`
		: `The pin is round, struck with ${motifOf(input.styles)} in raised relief, inside ${rimOf(input.points)}.`;

	const finish = `The metal is ${patinaOf(input.earliestYear, now)}, and ${enamelOf(input.styles)} fills the recesses of the relief.`;

	return {
		prompt: `${STYLE_PREFIX}${subject} ${finish}${STYLE_SUFFIX}`,
		negativePrompt: BADGE_NEGATIVE_PROMPT,
		seed: seedOf(input.slug),
		styleVersion: BADGE_STYLE_VERSION,
		aspectRatio: '1:1',
	};
}
