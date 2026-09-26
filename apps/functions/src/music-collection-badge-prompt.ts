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
 * Minden pin tárgya: stílusonként több megönthető dolog, sosem egy hangulat.
 * Az öntő ki tud emelni egy ivókürtöt; a „melankóliát" senki.
 *
 * Miért több egy stílusra: egy motívum azt jelentette, hogy két thrash
 * collection szükségszerűen ugyanazt a pint kapja. A stílus onnantól nem
 * választ, csak kioszt — a polc pedig ismétel. A `seed` dönti el, melyik
 * jut egy collectionnek, tehát a saját pinje továbbra is mindig ugyanaz.
 *
 * A szókincs szándékosan szűk és tárgyi: láng, koponya, csont, szarv,
 * tüske, lánc, fejsze, sisak — ez az, amit a műfaj egy évtizede hímez
 * hátára. Hangszer csak a rock-oldali stílusokban szerepel; egy death
 * metal pinen a gitár a legkevésbé érdekes dolog, ami ráférhet.
 *
 * A kulcsok a `StyleEnum` értékei (`libs/common/api`). Teszt tartja nyitva,
 * hogy mindegyikre jusson motívum — egy lemaradt stílus csendben ugyanazt
 * az általános pint adná egy egész műfajnak, és pont ez a tábla van ellene.
 */
export const MOTIFS_BY_STYLE: Record<string, string[]> = {
	'Alternative metal': [
		'a cracked industrial gear split by a lightning bolt',
		'a skull bolted into a riveted steel faceplate',
		'a clenched fist bursting out of a cracked concrete slab',
	],
	'Alternative Rock': [
		'a moth with a skull marking on its back',
		'a shattered lightbulb with a bird skull inside',
		'a worn guitar plectrum over a broken vinyl record',
	],
	Ambient: [
		'a still lake reflecting a single pale moon',
		'a feather drifting through slow rings of fog',
		'a hollow skull filled with softly glowing mist',
	],
	'Avantgarde metal': [
		'a fractured theatre mask breaking into geometric shards',
		'a skull unfolding into sharp paper planes',
		'a candle burning at both ends under a glass bell jar',
	],
	'Blackened Doom': [
		'a heavy iron bell hanging in a dead tree',
		'a horned skull sinking into a tar pit',
		'a black candle guttering on an upturned coffin lid',
	],
	'Blackened Thrash': [
		'a horned skull wearing a studded bullet belt',
		'a goat skull over two crossed daggers in flames',
		'an inverted cross bound in barbed wire',
	],
	'Bay Area Thrash': [
		'a skull in a dented hardhat over a snapped suspension cable',
		'a suspension bridge tower engulfed in flames',
		'a skeletal fist punching up through cracked asphalt',
	],
	Black: [
		'a bare winter forest under a thin crescent moon',
		'a horned goat head inside an inverted pentagram',
		'a raven skull crowned with a ring of black candles',
	],
	'Blues Rock': [
		'a crossroads signpost under a swinging lantern',
		'a harmonica crossed with a bottleneck slide',
		'a grinning skull in a felt fedora, cigar in its teeth',
	],
	'Brutal Death': [
		'a cracked anvil struck by a heavy chain',
		'a skull crushed in the jaws of a bear trap',
		'a meat cleaver buried in a splintered butcher block',
	],
	'Celtic Folk metal': [
		'a celtic knotwork ring around a carved harp',
		'a horned helm resting on a mossy standing stone',
		'a triple spiral carved into a weathered stone cross',
	],
	Death: [
		'a weathered skull over two crossed scythes',
		'a hooded reaper skull beneath a sickle moon',
		'a ribcage cracked open around a burning heart',
	],
	'Death Doom': [
		'a mourning stone angel with folded wings',
		'a skull half sunk in a flooded crypt',
		'a funeral urn split open by a creeping root',
	],
	Deathgrind: [
		'a circular saw blade over two crossed bones',
		'a skull fed into the teeth of a threshing machine',
		'a gas mask skull with a severed hose',
	],
	Doom: [
		'a cracked church bell hanging from a heavy chain',
		'a cowled monk skull under a collapsing stone arch',
		'a single black candle melting over a tombstone',
	],
	Drone: [
		'a monolith humming in an empty desert',
		'an endless power line vanishing into grey haze',
		'a skull resonating inside a massive tuning fork',
	],
	Experimental: [
		'a skull reassembled from mismatched machine parts',
		'a tangle of patch cables sprouting from a seed pod',
		'a warped cassette tape spiralling into a mobius strip',
	],
	'First wave of black metal': [
		'a three branched candelabra with guttering candles',
		'a goat skull over two crossed pitchforks',
		'a bat winged demon head on a pentagram medallion',
	],
	'Folk metal': [
		'a drinking horn crossed with a hand axe',
		'a boar skull between two upright mead horns',
		'a wolf pelt draped over a rune carved shield',
	],
	'Funk Rock': [
		'a skull in round sunglasses and a wide brimmed hat',
		'a starburst behind a slap bass headstock',
		'a clenched fist inside a starburst of lightning',
	],
	'Glam Rock': [
		'a platform boot struck through by a lightning bolt',
		'a skull with a lightning bolt painted across its face',
		'a tipped top hat over a hand mirror cracked down the middle',
	],
	'Glam Metal': [
		'a studded leather bracelet around a five point star',
		'a skull with a teased mane and a hoop earring',
		'a switchblade driven through a heart shaped padlock',
	],
	Gothenburg: [
		'a wolf head in profile wrapped in knotwork',
		'a bird of prey skull inside a broken snowflake',
		'a skeletal hand crushing a frozen branch',
	],
	Gothic: [
		'a cathedral rose window holding a single rose',
		'a bat winged hourglass over a sealed coffin',
		'a lace veiled skull with a rose between its teeth',
	],
	'Gothic Doom': [
		'a weeping stone gargoyle on a broken column',
		'a raven perched on a crumbling mausoleum door',
		'a skull wound in a widow veil of iron thorns',
	],
	Grindcore: [
		'a crushed tin can behind a circular saw blade',
		'a skull flattened under an industrial press',
		'a megaphone spilling a coil of barbed wire',
	],
	Groove: [
		'a clenched fist gripping a thick chain link',
		'a skull with a piston driven through the temple',
		'a heavy boot sole treaded with rows of bones',
	],
	'Groove Thrash': [
		'a sledgehammer crossed with a snapped chain',
		'a skull in a welding mask throwing sparks',
		'a brass knuckled fist wrapped in loose chain',
	],
	Grunge: [
		'a moth eaten flannel patch stitched over a cracked skull',
		'a smashed amplifier cabinet leaking smoke',
		'a rain worn skull with a single flower in the eye socket',
	],
	'Hard rock': [
		'a winged wheel wreathed in flames',
		'a skull in aviator goggles over two crossed wrenches',
		'a pair of flaming dice over a torn ace of spades',
	],
	'Heavy metal': [
		'a horned hand sign wearing a spiked wristband',
		'a winged skull crowned with a ring of rivets',
		'a skull over two crossed lightning bolts in a spiked ring',
	],
	'Math Rock': [
		'a skull traced over a grid of irregular time signatures',
		'a guitar fretboard folded into a tangram puzzle',
		'a set square and compass crossed over a tapping hand',
	],
	'Melodic Death': [
		'a stag skull with antlers wound in thorns',
		'a skull cradled in a pair of feathered wings',
		'a sword driven through a frozen rose',
	],
	'Melodic Doom': [
		'a broken hourglass spilling sand over a wilted rose',
		'a skull resting on an open book of dead leaves',
		'a cracked stone lantern gone dark',
	],
	Metalcore: [
		'a torn chain link inside a ring of barbed wire',
		'a skull stitched shut with heavy gauge wire',
		'a taped fist over a shield split down the middle',
	],
	Noise: [
		'a speaker cone torn open by a burst of static',
		'a skull dissolving into television snow',
		'a jagged waveform clipped flat against its limits',
	],
	'Noise Rock': [
		'a skull wrapped in a snarl of frayed live wires',
		'a distortion pedal cracked open and sparking',
		'a jackhammer driven through a cracked loudspeaker horn',
	],
	'New Wave Of British Heavy Metal': [
		'a knight helmet visor over two crossed broadswords',
		'a screaming skull sealed in a riveted iron mask',
		'a lion rampant behind a spiked gauntlet',
	],
	'Pagan Thrash': [
		'a raven perched inside a ring of rune stones',
		'a horned skull bound with braided leather cord',
		'a burning torch crossed with a bone handled spear',
	],
	'Post-Rock': [
		'a lone lighthouse beam cutting through a crescendo of waves',
		'a skull silhouetted against a slow sunrise over ruins',
		'a flock of birds lifting off a rusted radio tower',
	],
	'Power metal': [
		'a winged sword rising out of a crown',
		'a dragon coiled around a mountain peak',
		'a gauntlet raising a flaming banner',
	],
	'Progressive metal': [
		'an armillary sphere of interlocking brass rings',
		'a skull split open onto a spiral staircase',
		'an eye inside a tessellated triangle of gears',
	],
	'Progressive Death': [
		'a skull dissolving into a geometric lattice',
		'a spine rising into a helix of thorns',
		'a nautilus shell cracked open around a fossil skull',
	],
	'Progressive Thrash': [
		'a clockwork gear train driving a spinning saw blade',
		'a skull with a metronome arm through its jaw',
		'a pocket watch shattered by a lightning bolt',
	],
	'Psychedelic Rock': [
		'a third eye opening in a melting kaleidoscope',
		'a mushroom cap sprouting from a paisley skull',
		'a butterfly with wings of swirling liquid colour',
	],
	'Rap Rock': [
		'a microphone crossed with a spray can',
		'a skull in a backwards cap over a boombox',
		'a chain medallion stamped with a snarling skull',
	],
	Rock: [
		'a plectrum over a vinyl record and crossed drumsticks',
		'a skull in a studded leather collar, cigarette in its teeth',
		'a lightning bolt striking a split bass drum head',
	],
	Speed: [
		'a flaming motorcycle wheel trailing speed lines',
		'a skull in a flight helmet against a shockwave',
		'a winged boot spurred with a lightning bolt',
	],
	'Space Rock': [
		'a skull in a cracked astronaut helmet drifting past a ringed planet',
		'a rocket trailing a comet tail of glowing sparks',
		'a flying saucer beaming down over a lonely standing stone',
	],
	'Symphonic Heavy metal': [
		'a violin scroll crossed with a sword beneath a crown',
		'a laurel wreathed skull against a pipe organ facade',
		'a conductor baton crossed with a flaming sword',
	],
	'Technical Death': [
		'a mechanical skull with an exposed clockwork jaw',
		'a spine built out of interlocking gear teeth',
		'a skull dissected into numbered bone plates',
	],
	'Technical Thrash': [
		'an exploded diagram of a gear driven metronome',
		'a skull wired into an etched circuit board',
		'a caliper measuring the jaw of a bare skull',
	],
	'Teutonic Thrash': [
		'a spiked steel helmet over two crossed hammers',
		'a horned skull in a spiked pickelhaube, wreathed in flames',
		'a tank tread rolling over a shattered skull',
	],
	Thrash: [
		'a screaming skull wreathed in flames',
		'a skeletal fist throwing the horns out of a burning pit',
		'a skull over two crossed hand axes inside a bullet belt',
	],
	'US Power metal': [
		'an eagle clutching a sword over a shield',
		'a winged skull in a plumed war helm',
		'a flaming gauntlet holding a broken chain aloft',
	],
};

/**
 * Ha a katalógus semmit nem mond a stílusról, a pinnek akkor is lennie kell.
 *
 * Ez a motívum viszont nem lehet semleges. Egy lemezjátszó-kar bármelyik
 * műfajról szólhatna, és a visszaesés pont azokat a collectionöket éri,
 * amiket nem stílus tart össze — egy előadót, egy évtizedet —, vagyis a
 * polc legszebb darabjai kapnák a legüresebb pint. A katalógus egyetlen
 * műfajról szól, tehát a visszaesés is arról szóljon.
 */
const FALLBACK_MOTIFS = [
	'a horned skull over two crossed bones in a ring of flames',
	'a skeletal hand throwing the horns against a wall of fire',
	'a winged skull on a spiked medallion',
];

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

/** Egy criteria-mező stringlistája, vagy üres, ha nincs ott semmi ilyen. */
export function criterionList(value: unknown, key: string): string[] {
	const criterion = (value ?? {}) as Record<string, unknown>;

	return Array.isArray(criterion[key]) ? (criterion[key] as string[]) : [];
}

/**
 * A stílusok, ahogy a szabály megnevezi őket. A sorrend számít: az első
 * adja a pin tárgyát és a zománc színét.
 *
 * Négy helyen lehet stílus, és mindegyiket meg kell nézni. Az album stílusa
 * az elsődleges, de egy collectiont éppúgy össze tarthat az előadó stílusa;
 * és az `includesAll` ugyanolyan megnevezés, mint az `includesAny` — csak
 * szigorúbb. Amelyik alakot ez a lista kihagyja, az a collection csendben
 * a visszaesést kapja: egy egész szabály veszítené el a maga motívumát
 * azon, hogy másik operátorral írták meg.
 */
export function styleNames(criteria: Record<string, unknown>): string[] {
	return [
		...criterionList(criteria['styles'], 'includesAny'),
		...criterionList(criteria['styles'], 'includesAll'),
		...criterionList(criteria['artistStyles'], 'includesAny'),
		...criterionList(criteria['artistStyles'], 'includesAll'),
	];
}

/**
 * Az első megnevezett stílus egyik motívuma, a seed által kiválasztva.
 *
 * A seed a collection slugjából jön, vagyis a választás stabil: ugyanaz a
 * collection mindig ugyanazt a motívumot kéri, akkor is, ha egy év múlva
 * generálják újra. Két szomszédja viszont nem feltétlenül ugyanazt.
 */
export function motifOf(styles: string[], seed: number): string {
	const style = styles[0];
	const motifs =
		(style === undefined ? undefined : MOTIFS_BY_STYLE[style]) ??
		FALLBACK_MOTIFS;

	return motifs[seed % motifs.length];
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
	const seed = seedOf(input.slug);
	const motif = motifOf(input.styles, seed);
	const subject = input.isSingleArtist
		? `The pin is die cut to the silhouette of ${motif}, with ${rimOf(input.points)} following its outline.`
		: `The pin is round, struck with ${motif} in raised relief, inside ${rimOf(input.points)}.`;

	const finish = `The metal is ${patinaOf(input.earliestYear, now)}, and ${enamelOf(input.styles)} fills the recesses of the relief.`;

	return {
		prompt: `${STYLE_PREFIX}${subject} ${finish}${STYLE_SUFFIX}`,
		negativePrompt: BADGE_NEGATIVE_PROMPT,
		seed,
		styleVersion: BADGE_STYLE_VERSION,
		aspectRatio: '1:1',
	};
}
