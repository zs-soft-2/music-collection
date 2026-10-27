/**
 * Amit a collection tényleg elmond magáról, mielőtt szavakká válna.
 *
 * A badge sokáig a *szabályból* készült: a criteria első stílusneve kiválasztott
 * egy sort egy táblából, és kész. Egy diszkográfia-collection azonban stílusról
 * nem beszél, ezért az előadó `styles` tömbjének nulladik eleme döntött — vagyis
 * a pin tárgyát az szabta meg, milyen sorrendben írta be a stílusokat egy
 * importáló script. Egy Megadeth-collection így kapott Motörhead-ikonográfiát:
 * a seed a „Hard rock" sorból választott, mert az állt elöl.
 *
 * Ez a fájl a szabály helyett a *lemezeket* kérdezi meg. Minden benne pure: a
 * Firestore-olvasás a `music-collection-badge-facts.ts`-ben van, hogy az itteni
 * döntések tesztelhetők maradjanak a katalógus nélkül.
 *
 * Három dolgot ad, és mindhárom másik szinten kapcsol be
 * (`BadgeContextLevel`): a lemezek stílusainak többségét és a valódi
 * legkorábbi évet (`catalog`), a lemezcímek visszatérő tárgyi szavát
 * (`rich`), és a borítók színéből a zománcot (`rich`).
 */

/** Egy lemez annyija, amennyi egy jelvényhez kell. */
export interface BadgeAlbum {
	name: string;
	/** Kiadás éve; `null`, ha a katalógus nem tudja. */
	year: number | null;
	styles: string[];
	/** A borító elérhető címe — Storage-letöltés vagy külső kép. */
	coverUrl: string | null;
}

/**
 * A lemezek stílusai gyakoriság szerint, a legtöbbet szereplővel elöl.
 *
 * Többség, nem első találat: egy diszkográfiában szinte mindig akad egy
 * kakukktojás (egy akusztikus lemez, egy korai demó más címkével), és a
 * jelvény nem arról szól. Döntetlennél az ábécé dönt, hogy ugyanaz a
 * katalógus mindig ugyanazt a pint adja — a `Map` beolvasási sorrendje
 * ehhez nem elég stabil alap.
 *
 * A `fallback` akkor él, ha egyetlen elért lemez sem mond stílust: ilyenkor
 * marad az, amit a szabály vagy az előadó állít. Üres lista is lehet belőle,
 * és a motívumválasztás onnan tudja, hogy az általános pinhez kell nyúlnia.
 */
export function dominantStyles(
	albums: BadgeAlbum[],
	fallback: string[]
): string[] {
	const counts = new Map<string, number>();

	for (const album of albums) {
		for (const style of album.styles) {
			if (style) {
				counts.set(style, (counts.get(style) ?? 0) + 1);
			}
		}
	}

	if (!counts.size) {
		return fallback;
	}

	return [...counts.entries()]
		.sort(
			([style, count], [otherStyle, otherCount]) =>
				otherCount - count || style.localeCompare(otherStyle)
		)
		.map(([style]) => style);
}

/**
 * A legkorábbi év, amit a collection tényleg elér.
 *
 * Eddig a `criteria.years.from` volt az egyetlen forrás, amit viszont csak az
 * évszámra írt szabályok mondanak ki. Egy előadóra írt collectionnek nincs
 * ilyen mezője, tehát minden diszkográfia-pin ugyanazt a közepes patinát
 * kapta, akkor is, ha 1983-ban kezdődik. A lemezek éve ennél egyszerűen
 * jobban tudja.
 *
 * A szabályé marad az elsőbbség, ha korábbi: egy „1970-től" szabály a
 * koráról beszél akkor is, ha a katalógusban ma csak egy 1994-es lemez van
 * alatta.
 */
export function earliestYearOf(
	albums: BadgeAlbum[],
	criteriaYear: number | null
): number | null {
	const years = albums
		.map((album) => album.year)
		.filter((year): year is number => typeof year === 'number' && year > 0);

	if (!years.length) {
		return criteriaYear;
	}

	const earliest = Math.min(...years);

	return criteriaYear === null ? earliest : Math.min(criteriaYear, earliest);
}

/**
 * Tárgyak, amiket a lemezcímek szavai megidéznek.
 *
 * Nem hangulatszótár és nem jelentéstan: minden érték olyasmi, amit egy öntő
 * ki tud emelni a fémből. A „dystopia" ezért nincs benne, a „rust" igen.
 *
 * Ettől lesz a pin ezé a diszkográfiáé, és nem a műfajé: a Megadeth
 * stúdiólemezei között a *peace* kétszer szerepel (Peace Sells, Rust in
 * Peace), tehát a jelvény alsó mezejébe egy elpattintott olajág kerül. Ez
 * olyasmi, amit a zenekar neve nélkül is csak erről a lemezsorról lehet
 * tudni — és a névvel ellentétben nem csábítja a modellt se feliratra, se a
 * zenekar védjegyes kabalájára.
 *
 * A kulcs a cím egy szava, kisbetűsen, írásjelek nélkül. Egy szó, nem
 * szókapcsolat: a címek tagolása a kiadások közt is ingadozik.
 */
export const TITLE_MOTIFS: Record<string, string> = {
	angel: 'a single feathered wing',
	ashes: 'a small heap of ashes',
	beast: 'a horned beast skull',
	bell: 'a small cast bell',
	black: 'a guttering black candle',
	blade: 'a short broken blade',
	blood: 'a single falling drop',
	bomb: 'a bomb with a lit fuse',
	bone: 'two small crossed bones',
	bones: 'two small crossed bones',
	book: 'a closed clasped book',
	chain: 'a broken chain link',
	chains: 'a broken chain link',
	clock: 'a small hourglass',
	countdown: 'a small hourglass',
	cross: 'a small iron cross',
	crown: 'a small battered crown',
	dawn: 'a low rising sun disc',
	dead: 'a small bare skull',
	death: 'a small bare skull',
	devil: 'a horned demon head',
	dragon: 'a dragon head in profile',
	dream: 'a closed sleeping eye',
	eye: 'a single open eye',
	fang: 'a single curved fang',
	fire: 'a small tongue of flame',
	fist: 'a clenched fist',
	ghost: 'an empty hooded cowl',
	god: 'a forked lightning bolt',
	grave: 'a leaning gravestone',
	hammer: 'a short forging hammer',
	hand: 'an open skeletal hand',
	heart: 'an anatomical heart',
	hell: 'a two pronged pitchfork',
	ice: 'a six pointed frost crystal',
	iron: 'a riveted iron plate',
	key: 'a toothed iron key',
	king: 'a small battered crown',
	knife: 'a short broken blade',
	machine: 'a toothed gear wheel',
	mask: 'a blank faceplate mask',
	mirror: 'a cracked hand mirror',
	moon: 'a thin crescent moon',
	night: 'a thin crescent moon',
	peace: 'a snapped olive branch',
	rain: 'three falling drops',
	raven: 'a raven in profile',
	road: 'a leaning road sign',
	rose: 'a single cut rose',
	rust: 'a bent rusted nail',
	sea: 'a single breaking wave',
	serpent: 'a coiled serpent',
	shadow: 'a cast silhouette head',
	skull: 'a small bare skull',
	snake: 'a coiled serpent',
	snow: 'a six pointed frost crystal',
	soul: 'an empty hooded cowl',
	spider: 'a spider on its web',
	star: 'a five pointed star',
	steel: 'a riveted iron plate',
	storm: 'a forked lightning bolt',
	sun: 'a rayed sun disc',
	sword: 'a short upright sword',
	thorn: 'a curved thorn branch',
	thunder: 'a forked lightning bolt',
	time: 'a small hourglass',
	tomb: 'a leaning gravestone',
	war: 'two crossed war axes',
	wheel: 'a spoked wheel',
	winter: 'a bare winter branch',
	witch: 'a tall pointed hat',
	wolf: 'a wolf head in profile',
	world: 'a banded globe',
};

/** Ennél rövidebb szó nem jelöl semmit; a „war" még igen. */
const MIN_TITLE_WORD = 3;

/** A cím szavai, kisbetűsen, írásjelek nélkül. */
function titleWords(title: string): string[] {
	return title
		.toLowerCase()
		.split(/[^a-z]+/)
		.filter((word) => word.length >= MIN_TITLE_WORD);
}

/**
 * A lemezcímek legtöbbször visszatérő tárgyi szava, tárgyként.
 *
 * Csak az számít, hány *lemez* címében szerepel a szó, nem hányszor hangzik
 * el: egy cím, amiben kétszer áll a „death", nem teszi a diszkográfiát
 * halálosabbá. Döntetlennél a seed dönt — a collection sajátja, tehát a
 * választás stabil, de két szomszédé nem feltétlenül ugyanaz.
 *
 * `null`, ha egyik cím sem mond semmi megönthetőt: ilyenkor a pin marad
 * egymotívumos, és nem kerül rá egy sokadik általános koponya.
 */
export function titleMotifOf(titles: string[], seed: number): string | null {
	const counts = new Map<string, number>();

	for (const title of titles) {
		for (const word of new Set(titleWords(title))) {
			if (TITLE_MOTIFS[word]) {
				counts.set(word, (counts.get(word) ?? 0) + 1);
			}
		}
	}

	if (!counts.size) {
		return null;
	}

	const best = Math.max(...counts.values());
	// A motívum, nem a szó szerint: két szó ugyanarra a tárgyra mutathat
	// (`death` és `skull`), és azokból egyet kell csinálni, különben a
	// döntetlen attól függne, melyik szinonimát írta a címbe a zenekar.
	const motifs = [
		...new Set(
			[...counts.entries()]
				.filter(([, count]) => count === best)
				.map(([word]) => TITLE_MOTIFS[word])
		),
	].sort();

	return motifs[seed % motifs.length];
}

/** Egy szín, ahogy egy borítóról leolvassuk. 0–255. */
export interface Rgb {
	red: number;
	green: number;
	blue: number;
}

/**
 * A zománcok, ahogy a színkör szeletei szerint elnevezzük őket.
 *
 * A határ a hue fokban, 0-tól az itt megadott értékig. A szókincs
 * szándékosan ugyanaz, amit a stíluscsaládok is használnak: a borító a
 * *választást* mozdítja el collectionönként, a *nyelvet* nem. Enélkül egy
 * polcnyi badge-ről lejönne az, amitől egy készletnek látszanak.
 */
const ENAMEL_BY_HUE: { until: number; enamel: string }[] = [
	{ until: 15, enamel: 'deep blood red enamel' },
	{ until: 40, enamel: 'burnt orange enamel' },
	{ until: 65, enamel: 'antique gold enamel' },
	{ until: 95, enamel: 'moss green enamel' },
	{ until: 160, enamel: 'dark verdigris green enamel' },
	{ until: 200, enamel: 'pale ice blue enamel' },
	{ until: 255, enamel: 'royal blue enamel' },
	{ until: 290, enamel: 'deep violet enamel' },
	{ until: 330, enamel: 'hot magenta enamel' },
	{ until: 360, enamel: 'deep blood red enamel' },
];

/** Ennyire kell színesnek lennie egy borítónak, hogy a színe számítson. */
const MIN_SATURATION = 0.18;

/**
 * A borító színe zománcként.
 *
 * Ami nem elég telt ahhoz, hogy színt mondjon — egy fekete-fehér borító, egy
 * szürke fotó —, az nem kap kitalált színt: a sötétje ónszürke, a világosa
 * csontfehér zománc lesz. Ez az a két érték, ami a fémmel együtt is megáll,
 * és nem hazudik a lemezről.
 */
export function enamelFromColor(color: Rgb | null): string | null {
	if (!color) {
		return null;
	}

	const red = color.red / 255;
	const green = color.green / 255;
	const blue = color.blue / 255;
	const max = Math.max(red, green, blue);
	const min = Math.min(red, green, blue);
	const span = max - min;

	if (span < MIN_SATURATION) {
		return max < 0.5 ? 'gunmetal grey enamel' : 'bone white enamel';
	}

	let hue: number;

	if (max === red) {
		hue = ((green - blue) / span) % 6;
	} else if (max === green) {
		hue = (blue - red) / span + 2;
	} else {
		hue = (red - green) / span + 4;
	}

	hue = (hue * 60 + 360) % 360;

	return (
		ENAMEL_BY_HUE.find(({ until }) => hue < until)?.enamel ??
		'deep blood red enamel'
	);
}
