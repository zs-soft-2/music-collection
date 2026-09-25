/**
 * A napi kérdés: egy kérdés egy napra, mindenkinek ugyanaz.
 *
 * A kérdés nem kézzel íródik és nem is egy modell találja ki, hanem a
 * katalógusból áll össze: a válasz egy Firestore-ban álló tény, tehát a
 * kiértékelés pontos, a merítés pedig együtt nő a katalógussal. A három
 * rossz válasz testvérekből jön (ugyanaz az album, előadó, kiadó), mert a
 * hihető rossz válasz teszi kérdéssé a kérdést.
 *
 * A sablonok merítésfüggők: mindegyik megmondja, mi kell neki, és ha az
 * anyag nem elég hozzá, `null`-t ad. Így a pressing-kérdések (katalógusszám,
 * kiadó, ország) maguktól kapcsolnak be, ahogy a Discogs-adat pótlódik —
 * a motorhoz nem kell hozzányúlni.
 *
 * Ez a fájl a motor: a sablonok és a választás, Firestore nélkül. Az anyag
 * összegyűjtése és a kiírás a `daily-question-compose.ts`-ben van.
 *
 * Amit a kliens lát, abban NINCS benne a válasz: a kérdés-dokumentum csak a
 * kérdést és a négy opciót tartja, a megfejtés külön dokumentumba kerül,
 * amit a szabályok senkinek nem engednek olvasni. Négy opciónál a válasz
 * hashelése értelmetlen volna — mind a négyet végig lehetne próbálni —,
 * ezért a kiértékelés callable-ön megy majd.
 *
 * Ami ellen ez nem véd: a katalógus nyilvános, tehát a kérdésben szereplő
 * albumot bárki kikeresheti. Ez itt nem vizsga; a szabály csak azt zárja ki,
 * hogy a válasz egy mezőből kiolvasható legyen.
 *
 * A véletlen a napból származik (`hashSeed` + `createRandom`), így egy nap
 * kérdése újrafuttatva is ugyanaz, és a teszt is kiszámítható.
 */

import { isoDay } from './upcoming-release';

/** `libs/common/api` EntityTypeEnum.DailyQuestion. */
const ENTITY_TYPE = 'Daily Question';

/** Ennyi válaszlehetőség közül lehet választani. */
export const OPTION_COUNT = 4;

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
	id: string;
	/** Kész szöveg: katalógusérték (név, évszám), nem fordítandó. */
	label: string;
}

/** Amiről a kérdés szólt — a válasz után, a „tovább” linkhez. */
export interface QuestionSubject {
	kind: 'album' | 'artist' | 'release' | 'track' | 'musician';
	uid: string;
	name: string;
}

export interface QuestionDraft {
	/** i18n kulcs: `dailyQuestion.template.<key>`. */
	templateKey: string;
	difficulty: QuestionDifficulty;
	/** A kérdés-keretbe behelyettesítendő katalógusértékek. */
	params: Record<string, string>;
	options: QuestionOption[];
	answerId: string;
	subject: QuestionSubject;
	/** Amiről a kérdés szól, ha kép: borító. A legtöbb sablonnál nincs. */
	imageUrl?: string | null;
}

/**
 * A nap pontozása, ahogy a kérdéssel együtt megszületik.
 *
 * Azért utazik a kérdéssel, és nem a kiértékeléskor olvassuk a beállításból:
 * a délben átállított pontérték ne tegye olcsóbbá a délelőtti tippeket, és a
 * kiértékelés tranzakciója maradjon akkora, amekkora volt.
 */
export interface QuestionScoring {
	/** Amit a nehézség fizet egy jó tippért. */
	base: number;
	streakBonusPerDay: number;
	maxStreakBonusDays: number;
	/** A gyorsasági bónusz felső határa; óra nélkül 0. */
	speedBonusMax: number;
	/** 1, bónusz napon több. */
	multiplier: number;
}

/** Amit a kliens olvas. A válasz nincs benne. */
export interface DailyQuestionDocument {
	uid: string;
	day: string;
	entityType: string;
	templateKey: string;
	difficulty: QuestionDifficulty;
	params: Record<string, string>;
	options: QuestionOption[];
	/** Ennyi másodperc van válaszolni; 0 = nincs óra. */
	timeLimitSec: number;
	scoring: QuestionScoring;
	/** Borító, ha a kérdés képes; különben null. */
	imageUrl: string | null;
}

/** Amit csak a szerver olvas. */
export interface DailyQuestionAnswer {
	day: string;
	answerId: string;
	templateKey: string;
	subject: QuestionSubject;
}

export interface MaterialAlbum {
	uid: string;
	name: string;
	artistUid: string | null;
	artistName: string;
	year: number | null;
	styles: string[];
	/** A katalógus műfaj-besorolása (`GenreEnum` értéke). */
	genre: string | null;
	/** A borító címe, ha a katalógus tud róla — a képes kérdéshez. */
	coverUrl: string | null;
}

export interface MaterialTrack {
	uid: string;
	name: string;
	index: number;
	position: string | null;
	durationSec: number | null;
	/** Kitöltve, ha a szám csak az egyik pressingen van rajta. */
	releaseUid: string | null;
	/** Melyik albumé — a testvérlemez számai is idekerülnek csalinak. */
	albumUid: string;
}

/** Egy zenész egy zenekarban (`membership`). */
export interface MaterialMember {
	musicianUid: string;
	musicianName: string;
	artistUid: string;
	artistName: string;
	instruments: string[];
	kind: string;
}

/** Egy közreműködés egy lemezen (`contribution`). */
export interface MaterialCredit {
	musicianUid: string;
	name: string;
	/** Discogs-szerep, pl. „Guitar”, „Producer”. */
	role: string;
}

export interface MaterialRelease {
	uid: string;
	name: string;
	catno: string | null;
	country: string | null;
	labelName: string | null;
	year: number | null;
}

export interface MaterialArtist {
	uid: string;
	name: string;
	country: string | null;
	formedIn: number | null;
}

/** Egy húzás anyaga: egy album és a szomszédsága. */
export interface QuestionMaterial {
	album: MaterialAlbum;
	artist: MaterialArtist | null;
	/** Az album számai, sorrendben. */
	tracks: MaterialTrack[];
	/** Az album kiadásai a katalógusban. */
	releases: MaterialRelease[];
	/** Az előadó többi albuma — hihető évszámokhoz. */
	siblingAlbums: MaterialAlbum[];
	/** Más előadók — hamis válaszokhoz. */
	otherArtists: MaterialArtist[];
	/** Más kiadások — hamis kiadókhoz és katalógusszámokhoz. */
	otherReleases: MaterialRelease[];
	/**
	 * Egy testvérlemez számai. Ez az egyetlen hely, ahonnan biztosan olyan
	 * szám jön, ami ugyanattól az előadótól való, de NEM ezen a lemezen van
	 * — enélkül a „melyik nem szerepel rajta” kérdés nem kérdés, hanem
	 * névfelismerés.
	 */
	siblingTracks: MaterialTrack[];
	/** Az anchor előadó felállása (`membership`). */
	members: MaterialMember[];
	/** Más zenekarok tagjai — hamis nevekhez. */
	otherMembers: MaterialMember[];
	/** Az album közreműködői (`contribution`). */
	credits: MaterialCredit[];
	/** Más lemezek közreműködői — hamis nevekhez. */
	otherCredits: MaterialCredit[];
}

export interface DailyQuestionTemplate {
	key: string;
	difficulty: QuestionDifficulty;
	build(
		material: QuestionMaterial,
		random: () => number
	): QuestionDraft | null;
}

// ── Véletlen ────────────────────────────────────────────────────────────────

/** FNV-1a: a napból egy szám, amiből a húzás indul. */
export function hashSeed(text: string): number {
	let hash = 2166136261;

	for (const character of text) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 16777619);
	}

	return hash >>> 0;
}

/** mulberry32: kicsi, determinisztikus generátor. */
export function createRandom(seed: number): () => number {
	let state = seed >>> 0;

	return () => {
		state = (state + 0x6d2b79f5) >>> 0;

		let value = state;

		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

export function pick<T>(items: T[], random: () => number): T {
	return items[Math.floor(random() * items.length)];
}

export function shuffle<T>(items: T[], random: () => number): T[] {
	const result = [...items];

	for (let index = result.length - 1; index > 0; index--) {
		const swap = Math.floor(random() * (index + 1));

		[result[index], result[swap]] = [result[swap], result[index]];
	}

	return result;
}

/** Visszatevés nélküli minta; kevesebb elemre annyit ad, amennyi van. */
export function sample<T>(
	items: T[],
	count: number,
	random: () => number
): T[] {
	return shuffle(items, random).slice(0, count);
}

const distinct = (values: string[]): string[] => [...new Set(values)];

// ── Katalógusértékek ────────────────────────────────────────────────────────

/**
 * Évszám abból, ahogy a dátum a Firestore-ban áll: Timestamp, epoch
 * ezredmásodperc vagy ISO szöveg. A dátumok helyi éjfélre kerülnek
 * (pl. 1987-01-01T00:00+01), ami UTC-ben még az előző év — ezért a fél nap,
 * ugyanúgy, mint a `tools/discogs/discogs-mapping.mjs` `yearOf`-jában.
 */
export function yearOf(value: unknown): number | null {
	if (value === null || value === undefined || value === '') return null;

	const raw =
		typeof value === 'object' && value !== null && 'toDate' in value
			? (value as { toDate(): Date }).toDate()
			: value;
	const ms =
		raw instanceof Date
			? raw.getTime()
			: typeof raw === 'number'
				? raw
				: Date.parse(String(raw));

	if (Number.isNaN(ms)) return null;

	const year = new Date(ms + 12 * 60 * 60 * 1000).getUTCFullYear();

	return Number.isFinite(year) ? year : null;
}

/** Az album saját számai, lejátszási sorrendben. */
export function albumTracks(tracks: MaterialTrack[]): MaterialTrack[] {
	return tracks
		.filter((track) => !track.releaseUid)
		.sort((left, right) => left.index - right.index);
}

/**
 * Négy opció: a válasz és a hamis válaszok, összekeverve. Kevés hamis
 * válasznál nincs kérdés — ilyenkor a sablon kihagyja magát.
 */
function options(
	answer: QuestionOption,
	distractors: QuestionOption[],
	random: () => number
): QuestionOption[] | null {
	const others = distractors
		.filter((option) => option.id !== answer.id)
		.filter(
			(option, index, list) =>
				list.findIndex((other) => other.id === option.id) === index
		);

	if (others.length < OPTION_COUNT - 1) return null;

	return shuffle(
		[answer, ...sample(others, OPTION_COUNT - 1, random)],
		random
	);
}

const trackOption = (track: MaterialTrack): QuestionOption => ({
	id: track.uid,
	label: track.name,
});

// ── Sablonok ────────────────────────────────────────────────────────────────

/**
 * Melyik évben jelent meg az album. A hamis évszámok lehetőleg az előadó
 * többi lemezének évei — az igazi évszám hihetőbb csali, mint a kitalált —,
 * és csak ha nincs elég, akkor jön a szomszédos évekből.
 */
const albumYear: DailyQuestionTemplate = {
	key: 'albumYear',
	difficulty: 'easy',
	build: (material, random) => {
		const { album } = material;

		if (!album.year) return null;

		const fromSiblings = distinct(
			material.siblingAlbums
				.map((sibling) => sibling.year)
				.filter((year): year is number => !!year && year !== album.year)
				.map(String)
		);
		const nearby = [-5, -3, -2, -1, 1, 2, 3, 5]
			.map((offset) => (album.year as number) + offset)
			.filter((year) => year > 1900)
			.map(String);
		const answer = { id: `year-${album.year}`, label: String(album.year) };
		const choices = options(
			answer,
			[...fromSiblings, ...nearby].map((year) => ({
				id: `year-${year}`,
				label: year,
			})),
			random
		);

		if (!choices) return null;

		return {
			templateKey: albumYear.key,
			difficulty: albumYear.difficulty,
			params: { album: album.name, artist: album.artistName },
			options: choices,
			answerId: answer.id,
			subject: { kind: 'album', uid: album.uid, name: album.name },
		};
	},
};

/** Kinek a lemeze. A legkönnyebb kérdés, és szinte mindig van hozzá anyag. */
const albumArtist: DailyQuestionTemplate = {
	key: 'albumArtist',
	difficulty: 'easy',
	build: (material, random) => {
		const { album } = material;

		if (!album.artistUid || !album.artistName) return null;

		const answer = { id: album.artistUid, label: album.artistName };
		const choices = options(
			answer,
			material.otherArtists.map((artist) => ({
				id: artist.uid,
				label: artist.name,
			})),
			random
		);

		if (!choices) return null;

		return {
			templateKey: albumArtist.key,
			difficulty: albumArtist.difficulty,
			params: { album: album.name },
			options: choices,
			answerId: answer.id,
			subject: { kind: 'album', uid: album.uid, name: album.name },
		};
	},
};

/**
 * Melyik szám nyitja a lemezt. A csalik ugyanarról az albumról jönnek: aki
 * ismeri a lemezt, tudja a sorrendet is, aki csak a címeket látta, nem.
 */
const openingTrack: DailyQuestionTemplate = {
	key: 'openingTrack',
	difficulty: 'medium',
	build: (material, random) => {
		const tracks = albumTracks(material.tracks);

		if (tracks.length < OPTION_COUNT) return null;

		const [first, ...rest] = tracks;

		if (!first.name) return null;

		const choices = options(
			trackOption(first),
			rest.filter((track) => !!track.name).map(trackOption),
			random
		);

		if (!choices) return null;

		return {
			templateKey: openingTrack.key,
			difficulty: openingTrack.difficulty,
			params: {
				album: material.album.name,
				artist: material.album.artistName,
			},
			options: choices,
			answerId: first.uid,
			subject: {
				kind: 'album',
				uid: material.album.uid,
				name: material.album.name,
			},
		};
	},
};

/**
 * Melyik a leghosszabb szám. Csak akkor kérdés, ha a leghosszabb tényleg
 * kiemelkedik: tíz másodpercen belüli különbségnél ez már pénzfeldobás,
 * ilyenkor a sablon kihagyja magát.
 */
export const LONGEST_TRACK_MARGIN_SEC = 10;

const longestTrack: DailyQuestionTemplate = {
	key: 'longestTrack',
	difficulty: 'hard',
	build: (material, random) => {
		const timed = albumTracks(material.tracks)
			.filter((track) => !!track.name && !!track.durationSec)
			.sort(
				(left, right) =>
					(right.durationSec as number) - (left.durationSec as number)
			);

		if (timed.length < OPTION_COUNT) return null;

		const [first, second] = timed;

		if (
			(first.durationSec as number) - (second.durationSec as number) <
			LONGEST_TRACK_MARGIN_SEC
		) {
			return null;
		}

		const choices = options(
			trackOption(first),
			timed.slice(1).map(trackOption),
			random
		);

		if (!choices) return null;

		return {
			templateKey: longestTrack.key,
			difficulty: longestTrack.difficulty,
			params: {
				album: material.album.name,
				artist: material.album.artistName,
			},
			options: choices,
			answerId: first.uid,
			subject: {
				kind: 'album',
				uid: material.album.uid,
				name: material.album.name,
			},
		};
	},
};

/** A B oldal nyitószáma — bakelit-kérdés, a `position` mezőből. */
const sideBOpener: DailyQuestionTemplate = {
	key: 'sideBOpener',
	difficulty: 'hard',
	build: (material, random) => {
		const tracks = albumTracks(material.tracks).filter(
			(track) => !!track.name && !!track.position
		);
		const opener = tracks.find((track) =>
			/^b-?0*1$/i.test((track.position as string).trim())
		);

		if (!opener || tracks.length < OPTION_COUNT) return null;

		const choices = options(
			trackOption(opener),
			tracks.filter((track) => track.uid !== opener.uid).map(trackOption),
			random
		);

		if (!choices) return null;

		return {
			templateKey: sideBOpener.key,
			difficulty: sideBOpener.difficulty,
			params: {
				album: material.album.name,
				artist: material.album.artistName,
			},
			options: choices,
			answerId: opener.uid,
			subject: {
				kind: 'album',
				uid: material.album.uid,
				name: material.album.name,
			},
		};
	},
};

/**
 * Hány szám van a lemezen. Rövid lemeznél nem kérdés (négy szám ránézésre
 * megvan), ezért csak öt számtól kezdve kérdezzük.
 */
const MIN_COUNTED_TRACKS = 5;

const trackCount: DailyQuestionTemplate = {
	key: 'trackCount',
	difficulty: 'medium',
	build: (material, random) => {
		const count = albumTracks(material.tracks).length;

		if (count < MIN_COUNTED_TRACKS) return null;

		const answer = { id: `count-${count}`, label: String(count) };
		const choices = options(
			answer,
			[-3, -2, -1, 1, 2, 3]
				.map((offset) => count + offset)
				.filter((value) => value > 0)
				.map((value) => ({
					id: `count-${value}`,
					label: String(value),
				})),
			random
		);

		if (!choices) return null;

		return {
			templateKey: trackCount.key,
			difficulty: trackCount.difficulty,
			params: {
				album: material.album.name,
				artist: material.album.artistName,
			},
			options: choices,
			answerId: answer.id,
			subject: {
				kind: 'album',
				uid: material.album.uid,
				name: material.album.name,
			},
		};
	},
};

/**
 * Melyik kiadó nyomta ezt a kiadást. Ha az albumnak több kiadása is van a
 * katalógusban, a kérdés megmondja, melyikről van szó (ország és évszám),
 * különben több jó válasz is lenne.
 */
const releaseLabel: DailyQuestionTemplate = {
	key: 'releaseLabel',
	difficulty: 'medium',
	build: (material, random) => {
		const named = material.releases.filter(
			(release) => !!release.labelName
		);

		if (!named.length) return null;

		const release = pick(named, random);
		const answer = {
			id: `label-${release.labelName}`,
			label: release.labelName as string,
		};
		const choices = options(
			answer,
			material.otherReleases
				.filter(
					(other) =>
						!!other.labelName &&
						other.labelName !== release.labelName
				)
				.map((other) => ({
					id: `label-${other.labelName}`,
					label: other.labelName as string,
				})),
			random
		);

		if (!choices) return null;

		return {
			templateKey: releaseLabel.key,
			difficulty: releaseLabel.difficulty,
			params: {
				album: material.album.name,
				artist: material.album.artistName,
				country: release.country ?? '',
				year: release.year ? String(release.year) : '',
			},
			options: choices,
			answerId: answer.id,
			subject: { kind: 'release', uid: release.uid, name: release.name },
		};
	},
};

/**
 * Melyik katalógusszám áll a kiadáson. Ma még vékony a merítés — a
 * katalógus java Spotify-seedelt, katalógusszám nélkül —, de ahogy a
 * Discogs-adat pótlódik, ez a sablon magától bekapcsol.
 */
const releaseCatno: DailyQuestionTemplate = {
	key: 'releaseCatno',
	difficulty: 'hard',
	build: (material, random) => {
		const numbered = material.releases.filter((release) => !!release.catno);

		if (!numbered.length) return null;

		const release = pick(numbered, random);
		const answer = {
			id: `catno-${release.catno}`,
			label: release.catno as string,
		};
		const choices = options(
			answer,
			material.otherReleases
				.filter(
					(other) => !!other.catno && other.catno !== release.catno
				)
				.map((other) => ({
					id: `catno-${other.catno}`,
					label: other.catno as string,
				})),
			random
		);

		if (!choices) return null;

		return {
			templateKey: releaseCatno.key,
			difficulty: releaseCatno.difficulty,
			params: {
				album: material.album.name,
				artist: material.album.artistName,
				label: release.labelName ?? '',
			},
			options: choices,
			answerId: answer.id,
			subject: { kind: 'release', uid: release.uid, name: release.name },
		};
	},
};

/** Honnan való az előadó. Az országnevek a katalógus angol értékei. */
const artistCountry: DailyQuestionTemplate = {
	key: 'artistCountry',
	difficulty: 'medium',
	build: (material, random) => {
		const { artist } = material;

		if (!artist?.country) return null;

		const answer = {
			id: `country-${artist.country}`,
			label: artist.country,
		};
		const choices = options(
			answer,
			material.otherArtists
				.filter(
					(other) =>
						!!other.country && other.country !== artist.country
				)
				.map((other) => ({
					id: `country-${other.country}`,
					label: other.country as string,
				})),
			random
		);

		if (!choices) return null;

		return {
			templateKey: artistCountry.key,
			difficulty: artistCountry.difficulty,
			params: { artist: artist.name },
			options: choices,
			answerId: answer.id,
			subject: { kind: 'artist', uid: artist.uid, name: artist.name },
		};
	},
};

// ── Sablonok: a lemez adatai ────────────────────────────────────────────────

/**
 * A katalógus stílus-szótárának egy metszete, hamis válaszoknak — akkor jön
 * elő, ha a szomszédságból nem telik ki három olyan stílus, ami az albumon
 * nincs rajta. A `StyleEnum` a `libs/common/api`-ban él, amit a functions
 * build nem lát; ez a lista ezért másolat, és csak csalinak való.
 */
const STYLE_POOL = [
	'Alternative Rock',
	'Black',
	'Blues Rock',
	'Death',
	'Doom',
	'Folk metal',
	'Glam Rock',
	'Gothic',
	'Grindcore',
	'Grunge',
	'Hard rock',
	'Heavy metal',
	'Melodic Death',
	'Metalcore',
	'Power metal',
	'Progressive metal',
	'Psychedelic Rock',
	'Punk',
	'Speed Metal',
	'Thrash',
];

const valueOption = (prefix: string, label: string): QuestionOption => ({
	id: `${prefix}-${label}`,
	label,
});

const albumSubject = (album: MaterialAlbum): QuestionSubject => ({
	kind: 'album',
	uid: album.uid,
	name: album.name,
});

/** Az album és az előadó többi lemeze, egy listában. */
const artistAlbums = (material: QuestionMaterial): MaterialAlbum[] => [
	material.album,
	...material.siblingAlbums,
];

/**
 * Melyik stílust adja a katalógus a lemezhez. A csali elsősorban a
 * szomszédságból jön — az előadó más lemezeinek stílusai közelebb vannak
 * egymáshoz, mint egy véletlen műfaj —, és csak ha abból nem telik ki három,
 * akkor a szótárból.
 */
const albumStyle: DailyQuestionTemplate = {
	key: 'albumStyle',
	difficulty: 'medium',
	build: (material, random) => {
		const own = material.album.styles.filter(Boolean);

		if (!own.length) return null;

		const style = pick(own, random);
		const fromSiblings = distinct(
			material.siblingAlbums.flatMap((sibling) => sibling.styles)
		).filter((other) => !own.includes(other));
		const fromPool = STYLE_POOL.filter((other) => !own.includes(other));
		const choices = options(
			valueOption('style', style),
			[...fromSiblings, ...fromPool].map((other) =>
				valueOption('style', other)
			),
			random
		);

		if (!choices) return null;

		return {
			templateKey: albumStyle.key,
			difficulty: albumStyle.difficulty,
			params: {
				album: material.album.name,
				artist: material.album.artistName,
			},
			options: choices,
			answerId: `style-${style}`,
			subject: albumSubject(material.album),
		};
	},
};

/**
 * Melyik az előadó legkorábbi lemeze a katalógusban. Csak akkor kérdés, ha a
 * legkorábbi egyedül áll az évével — két lemez ugyanabból az évből két jó
 * választ jelentene.
 */
const earliestAlbum: DailyQuestionTemplate = {
	key: 'earliestAlbum',
	difficulty: 'medium',
	build: (material, random) => {
		const dated = artistAlbums(material)
			.filter((album) => !!album.year && !!album.name)
			.sort(
				(left, right) => (left.year as number) - (right.year as number)
			);

		if (dated.length < OPTION_COUNT) return null;

		const [first, second] = dated;

		if (first.year === second.year) return null;

		const choices = options(
			{ id: first.uid, label: first.name },
			dated
				.slice(1)
				.map((album) => ({ id: album.uid, label: album.name })),
			random
		);

		if (!choices) return null;

		return {
			templateKey: earliestAlbum.key,
			difficulty: earliestAlbum.difficulty,
			params: { artist: material.album.artistName },
			options: choices,
			answerId: first.uid,
			subject: albumSubject(first),
		};
	},
};

/**
 * Melyik lemezen szerepel ez a szám. A csalik az előadó többi lemeze: a
 * kérdés így arról szól, hogy a gyűjtő tudja-e, melyik lemezre tegye a
 * számot, nem arról, hogy felismeri-e az előadót.
 */
const trackAlbum: DailyQuestionTemplate = {
	key: 'trackAlbum',
	difficulty: 'medium',
	build: (material, random) => {
		const tracks = albumTracks(material.tracks).filter(
			(track) => !!track.name
		);
		const named = material.siblingAlbums.filter((album) => !!album.name);

		if (!tracks.length || !material.album.name) return null;

		const track = pick(tracks, random);
		const choices = options(
			{ id: material.album.uid, label: material.album.name },
			named.map((album) => ({ id: album.uid, label: album.name })),
			random
		);

		if (!choices) return null;

		return {
			templateKey: trackAlbum.key,
			difficulty: trackAlbum.difficulty,
			params: { track: track.name, artist: material.album.artistName },
			options: choices,
			answerId: material.album.uid,
			subject: albumSubject(material.album),
		};
	},
};

/** Melyik szám következik. A lemez sorrendjét csak az tudja, aki hallgatta. */
const nextTrack: DailyQuestionTemplate = {
	key: 'nextTrack',
	difficulty: 'hard',
	build: (material, random) => {
		const tracks = albumTracks(material.tracks).filter(
			(track) => !!track.name
		);

		if (tracks.length < OPTION_COUNT + 1) return null;

		const index = Math.floor(random() * (tracks.length - 1));
		const current = tracks[index];
		const next = tracks[index + 1];
		const choices = options(
			trackOption(next),
			tracks
				.filter(
					(track) =>
						track.uid !== next.uid && track.uid !== current.uid
				)
				.map(trackOption),
			random
		);

		if (!choices) return null;

		return {
			templateKey: nextTrack.key,
			difficulty: nextTrack.difficulty,
			params: {
				album: material.album.name,
				artist: material.album.artistName,
				track: current.name,
			},
			options: choices,
			answerId: next.uid,
			subject: albumSubject(material.album),
		};
	},
};

/** Hányadik szám a lemezen. A csalik a szomszédos sorszámok. */
const trackPosition: DailyQuestionTemplate = {
	key: 'trackPosition',
	difficulty: 'medium',
	build: (material, random) => {
		const tracks = albumTracks(material.tracks).filter(
			(track) => !!track.name
		);

		if (tracks.length < OPTION_COUNT + 1) return null;

		const index = Math.floor(random() * tracks.length);
		const track = tracks[index];
		const place = index + 1;
		const choices = options(
			valueOption('place', String(place)),
			tracks
				.map((_, other) => other + 1)
				.filter((other) => other !== place)
				.map((other) => valueOption('place', String(other))),
			random
		);

		if (!choices) return null;

		return {
			templateKey: trackPosition.key,
			difficulty: trackPosition.difficulty,
			params: {
				album: material.album.name,
				artist: material.album.artistName,
				track: track.name,
			},
			options: choices,
			answerId: `place-${place}`,
			subject: albumSubject(material.album),
		};
	},
};

/** A legrövidebb szám — ugyanazzal a kikötéssel, mint a leghosszabb. */
const shortestTrack: DailyQuestionTemplate = {
	key: 'shortestTrack',
	difficulty: 'hard',
	build: (material, random) => {
		const timed = albumTracks(material.tracks)
			.filter((track) => !!track.name && !!track.durationSec)
			.sort(
				(left, right) =>
					(left.durationSec as number) - (right.durationSec as number)
			);

		if (timed.length < OPTION_COUNT) return null;

		const [first, second] = timed;

		if (
			(second.durationSec as number) - (first.durationSec as number) <
			LONGEST_TRACK_MARGIN_SEC
		) {
			return null;
		}

		const choices = options(
			trackOption(first),
			timed.slice(1).map(trackOption),
			random
		);

		if (!choices) return null;

		return {
			templateKey: shortestTrack.key,
			difficulty: shortestTrack.difficulty,
			params: {
				album: material.album.name,
				artist: material.album.artistName,
			},
			options: choices,
			answerId: first.uid,
			subject: albumSubject(material.album),
		};
	},
};

/**
 * Milyen hosszú a lemez. Percre kerekítve kérdezzük, és csak akkor, ha
 * minden szám ideje megvan — hiányzó hosszakból összeadott „teljes” idő nem
 * válasz, hanem tévedés.
 */
export const ALBUM_LENGTH_STEP_MIN = 4;

const albumLength: DailyQuestionTemplate = {
	key: 'albumLength',
	difficulty: 'hard',
	build: (material, random) => {
		const tracks = albumTracks(material.tracks);

		if (tracks.length < MIN_COUNTED_TRACKS) return null;
		if (tracks.some((track) => !track.durationSec)) return null;

		const minutes = Math.round(
			tracks.reduce(
				(total, track) => total + (track.durationSec as number),
				0
			) / 60
		);

		if (minutes < ALBUM_LENGTH_STEP_MIN) return null;

		const choices = options(
			valueOption('length', String(minutes)),
			[-3, -2, -1, 1, 2, 3]
				.map((offset) => minutes + offset * ALBUM_LENGTH_STEP_MIN)
				.filter((value) => value > 0)
				.map((value) => valueOption('length', String(value))),
			random
		);

		if (!choices) return null;

		return {
			templateKey: albumLength.key,
			difficulty: albumLength.difficulty,
			params: {
				album: material.album.name,
				artist: material.album.artistName,
			},
			options: choices,
			answerId: `length-${minutes}`,
			subject: albumSubject(material.album),
		};
	},
};

/**
 * Melyik szám NEM szerepel a lemezen. A jó válasz egy testvérlemez száma —
 * ugyanaz az előadó, ugyanaz a hangzás —, a három csali pedig a lemezről
 * való. Idegen előadó számával ez nem kérdés lenne, hanem névfelismerés.
 */
const notOnAlbum: DailyQuestionTemplate = {
	key: 'notOnAlbum',
	difficulty: 'hard',
	build: (material, random) => {
		const own = albumTracks(material.tracks).filter(
			(track) => !!track.name
		);
		const ownNames = new Set(own.map((track) => track.name.toLowerCase()));
		const strangers = material.siblingTracks.filter(
			(track) =>
				!!track.name &&
				track.albumUid !== material.album.uid &&
				!ownNames.has(track.name.toLowerCase())
		);

		if (own.length < OPTION_COUNT - 1 || !strangers.length) return null;

		const stranger = pick(strangers, random);
		const choices = options(
			trackOption(stranger),
			own.map(trackOption),
			random
		);

		if (!choices) return null;

		return {
			templateKey: notOnAlbum.key,
			difficulty: notOnAlbum.difficulty,
			params: {
				album: material.album.name,
				artist: material.album.artistName,
			},
			options: choices,
			answerId: stranger.uid,
			subject: albumSubject(material.album),
		};
	},
};

/** Melyik lemez borítója ez. A kérdés maga a kép; a válaszok lemezcímek. */
const coverAlbum: DailyQuestionTemplate = {
	key: 'coverAlbum',
	difficulty: 'medium',
	build: (material, random) => {
		const { album } = material;

		if (!album.coverUrl || !album.name) return null;

		const choices = options(
			{ id: album.uid, label: album.name },
			material.siblingAlbums
				.filter((sibling) => !!sibling.name)
				.map((sibling) => ({ id: sibling.uid, label: sibling.name })),
			random
		);

		if (!choices) return null;

		return {
			templateKey: coverAlbum.key,
			difficulty: coverAlbum.difficulty,
			params: { artist: album.artistName },
			options: choices,
			answerId: album.uid,
			subject: albumSubject(album),
			imageUrl: album.coverUrl,
		};
	},
};

/** Melyik országban nyomták ezt a kiadást. */
const releaseCountry: DailyQuestionTemplate = {
	key: 'releaseCountry',
	difficulty: 'medium',
	build: (material, random) => {
		const located = material.releases.filter(
			(release) => !!release.country
		);

		if (!located.length) return null;

		const release = pick(located, random);
		const country = release.country as string;
		const choices = options(
			valueOption('country', country),
			material.otherReleases
				.filter((other) => !!other.country && other.country !== country)
				.map((other) =>
					valueOption('country', other.country as string)
				),
			random
		);

		if (!choices) return null;

		return {
			templateKey: releaseCountry.key,
			difficulty: releaseCountry.difficulty,
			params: {
				album: material.album.name,
				artist: material.album.artistName,
				label: release.labelName ?? '',
				year: release.year ? String(release.year) : '',
			},
			options: choices,
			answerId: `country-${country}`,
			subject: { kind: 'release', uid: release.uid, name: release.name },
		};
	},
};

// ── Sablonok: emberek ───────────────────────────────────────────────────────

/** Melyik évben alakult a zenekar. */
const artistFormedIn: DailyQuestionTemplate = {
	key: 'artistFormedIn',
	difficulty: 'medium',
	build: (material, random) => {
		const { artist } = material;

		if (!artist?.formedIn) return null;

		const formed = artist.formedIn;
		const fromOthers = distinct(
			material.otherArtists
				.map((other) => other.formedIn)
				.filter((year): year is number => !!year && year !== formed)
				.map(String)
		);
		const nearby = [-6, -4, -3, -2, -1, 1, 2, 3, 4, 6]
			.map((offset) => formed + offset)
			.filter(
				(year) => year > 1900 && year <= new Date().getUTCFullYear()
			)
			.map(String);
		const choices = options(
			valueOption('formed', String(formed)),
			[...fromOthers, ...nearby].map((year) =>
				valueOption('formed', year)
			),
			random
		);

		if (!choices) return null;

		return {
			templateKey: artistFormedIn.key,
			difficulty: artistFormedIn.difficulty,
			params: { artist: artist.name },
			options: choices,
			answerId: `formed-${formed}`,
			subject: { kind: 'artist', uid: artist.uid, name: artist.name },
		};
	},
};

/** A zenekar felállása: a tagok nevei csak a saját zenekaruk alatt jók. */
const bandMember: DailyQuestionTemplate = {
	key: 'bandMember',
	difficulty: 'medium',
	build: (material, random) => {
		const { artist } = material;
		const own = material.members.filter((member) => !!member.musicianName);

		if (!artist || !own.length) return null;

		const ownUids = new Set(own.map((member) => member.musicianUid));
		const member = pick(own, random);
		const choices = options(
			{ id: member.musicianUid, label: member.musicianName },
			material.otherMembers
				.filter(
					(other) =>
						!!other.musicianName &&
						other.artistUid !== artist.uid &&
						!ownUids.has(other.musicianUid)
				)
				.map((other) => ({
					id: other.musicianUid,
					label: other.musicianName,
				})),
			random
		);

		if (!choices) return null;

		return {
			templateKey: bandMember.key,
			difficulty: bandMember.difficulty,
			params: { artist: artist.name },
			options: choices,
			answerId: member.musicianUid,
			subject: {
				kind: 'musician',
				uid: member.musicianUid,
				name: member.musicianName,
			},
		};
	},
};

/** Ugyanez visszafelé: melyik zenekarban játszott ez a zenész. */
const memberBand: DailyQuestionTemplate = {
	key: 'memberBand',
	difficulty: 'medium',
	build: (material, random) => {
		const { artist } = material;
		const own = material.members.filter((member) => !!member.musicianName);

		if (!artist || !own.length) return null;

		const member = pick(own, random);
		/** Akinek több zenekara is van, arra több jó válasz lenne. */
		const elsewhere = material.otherMembers.some(
			(other) =>
				other.musicianUid === member.musicianUid &&
				other.artistUid !== artist.uid
		);

		if (elsewhere) return null;

		const choices = options(
			{ id: artist.uid, label: artist.name },
			distinct(
				material.otherMembers
					.filter(
						(other) =>
							!!other.artistName && other.artistUid !== artist.uid
					)
					.map((other) => `${other.artistUid}|${other.artistName}`)
			).map((value) => {
				const [uid, name] = value.split('|');

				return { id: uid, label: name };
			}),
			random
		);

		if (!choices) return null;

		return {
			templateKey: memberBand.key,
			difficulty: memberBand.difficulty,
			params: { musician: member.musicianName },
			options: choices,
			answerId: artist.uid,
			subject: { kind: 'artist', uid: artist.uid, name: artist.name },
		};
	},
};

/** Milyen hangszeren játszott a zenekarban. A csalik a zenekar többi hangszere. */
const memberInstrument: DailyQuestionTemplate = {
	key: 'memberInstrument',
	difficulty: 'hard',
	build: (material, random) => {
		const { artist } = material;
		const playing = material.members.filter(
			(member) => !!member.musicianName && member.instruments.length
		);

		if (!artist || !playing.length) return null;

		const member = pick(playing, random);
		const own = member.instruments.map((instrument) => instrument.trim());
		const instrument = own[0];

		if (!instrument) return null;

		const others = distinct([
			...material.members.flatMap((other) => other.instruments),
			...material.otherMembers.flatMap((other) => other.instruments),
		])
			.map((value) => value.trim())
			.filter((value) => !!value && !own.includes(value));
		const choices = options(
			valueOption('instrument', instrument),
			others.map((value) => valueOption('instrument', value)),
			random
		);

		if (!choices) return null;

		return {
			templateKey: memberInstrument.key,
			difficulty: memberInstrument.difficulty,
			params: { artist: artist.name, musician: member.musicianName },
			options: choices,
			answerId: `instrument-${instrument}`,
			subject: {
				kind: 'musician',
				uid: member.musicianUid,
				name: member.musicianName,
			},
		};
	},
};

/** A közreműködők közül azok, akik pontosan egyszer szerepelnek a szereppel. */
function soleCredit(
	credits: MaterialCredit[],
	match: (credit: MaterialCredit) => boolean
): MaterialCredit | null {
	const matching = credits.filter(
		(credit) => !!credit.name && !!credit.role && match(credit)
	);
	const names = new Set(matching.map((credit) => credit.musicianUid));

	return matching.length && names.size === 1 ? matching[0] : null;
}

/**
 * Ki játszott ezen a hangszeren a lemezen. Csak akkor kérdés, ha a szerephez
 * egyetlen név tartozik — két gitáros mellett két jó válasz volna.
 */
const albumCredit: DailyQuestionTemplate = {
	key: 'albumCredit',
	difficulty: 'hard',
	build: (material, random) => {
		const roles = distinct(
			material.credits
				.filter((credit) => !!credit.name && !!credit.role)
				.map((credit) => credit.role)
		);

		if (!roles.length) return null;

		const role = pick(roles, random);
		const credit = soleCredit(
			material.credits,
			(other) => other.role === role
		);

		if (!credit) return null;

		const ownUids = new Set(
			material.credits.map((other) => other.musicianUid)
		);
		const choices = options(
			{ id: credit.musicianUid, label: credit.name },
			[
				...material.credits.filter(
					(other) => other.musicianUid !== credit.musicianUid
				),
				...material.otherCredits.filter(
					(other) => !ownUids.has(other.musicianUid)
				),
			]
				.filter((other) => !!other.name)
				.map((other) => ({ id: other.musicianUid, label: other.name })),
			random
		);

		if (!choices) return null;

		return {
			templateKey: albumCredit.key,
			difficulty: albumCredit.difficulty,
			params: {
				album: material.album.name,
				artist: material.album.artistName,
				role,
			},
			options: choices,
			answerId: credit.musicianUid,
			subject: albumSubject(material.album),
		};
	},
};

/** A lemez producere. Ugyanaz a kikötés: egyetlen név tartozzon a szerephez. */
const albumProducer: DailyQuestionTemplate = {
	key: 'albumProducer',
	difficulty: 'hard',
	build: (material, random) => {
		const producer = soleCredit(material.credits, (credit) =>
			/^produce/i.test(credit.role.trim())
		);

		if (!producer) return null;

		const ownUids = new Set([producer.musicianUid]);
		const choices = options(
			{ id: producer.musicianUid, label: producer.name },
			[
				...material.credits.filter(
					(other) => !ownUids.has(other.musicianUid)
				),
				...material.otherCredits.filter(
					(other) => !ownUids.has(other.musicianUid)
				),
			]
				.filter((other) => !!other.name)
				.map((other) => ({ id: other.musicianUid, label: other.name })),
			random
		);

		if (!choices) return null;

		return {
			templateKey: albumProducer.key,
			difficulty: albumProducer.difficulty,
			params: {
				album: material.album.name,
				artist: material.album.artistName,
			},
			options: choices,
			answerId: producer.musicianUid,
			subject: albumSubject(material.album),
		};
	},
};

/**
 * Minden kérdésfajta, amit a motor ismer. Az admin felület ebből a listából
 * kapja a kapcsolókat (`readDailyQuestionSettings`), tehát ami itt nincs
 * benne, azt kapcsolni sem lehet — és ami itt van, azt nem kell máshol is
 * felsorolni.
 */
export const TEMPLATES: DailyQuestionTemplate[] = [
	albumArtist,
	albumYear,
	openingTrack,
	trackCount,
	releaseLabel,
	artistCountry,
	longestTrack,
	sideBOpener,
	releaseCatno,
	albumStyle,
	earliestAlbum,
	trackAlbum,
	nextTrack,
	trackPosition,
	shortestTrack,
	albumLength,
	notOnAlbum,
	coverAlbum,
	releaseCountry,
	artistFormedIn,
	bandMember,
	memberBand,
	memberInstrument,
	albumCredit,
	albumProducer,
];

/** Amit az admin felület mutat: a fajta és a nehézsége. */
export function templateCatalog(): {
	key: string;
	difficulty: QuestionDifficulty;
}[] {
	return TEMPLATES.map((template) => ({
		key: template.key,
		difficulty: template.difficulty,
	}));
}

// ── Kérdésválasztás ─────────────────────────────────────────────────────────

/**
 * A hét előrehaladtával nehezedik, mint a keresztrejtvény: hétfőn bemelegítés,
 * a hétvége a nehezéé. Ez csak kívánság — ha aznap nincs rá anyag, a választás
 * visszaesik arra, amiből építeni lehetett.
 */
export function difficultyForDay(day: string): QuestionDifficulty {
	const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();

	if (weekday === 1 || weekday === 2) return 'easy';
	if (weekday === 3 || weekday === 4) return 'medium';

	return 'hard';
}

/**
 * Amit ebből az anyagból meg lehet kérdezni.
 *
 * A kikapcsolt sablonok itt esnek ki, nem a választásnál: amit az admin
 * levett a listáról, azt a motor meg se próbálja felépíteni.
 */
export function draftsFor(
	material: QuestionMaterial,
	random: () => number,
	disabled: string[] = []
): QuestionDraft[] {
	const off = new Set(disabled);

	return TEMPLATES.filter((template) => !off.has(template.key))
		.map((template) => template.build(material, random))
		.filter((draft): draft is QuestionDraft => !!draft);
}

/** A választást befolyásoló kívánságok; egyik sem parancs. */
export interface QuestionChoice {
	/** A nap kívánt nehézsége. */
	preferred?: QuestionDifficulty;
	/** A közelmúlt sablonjai: ugyanazt a kérdésfajtát hetente egyszer elég. */
	avoid?: readonly string[];
	/** Amit az admin kikapcsolt. */
	disabled?: string[];
}

/**
 * A nap kérdése ebből az anyagból.
 *
 * A nehézség kívánság, az `avoid` pedig a közelmúlt sablonjai. Mindkettő
 * csak akkor érvényesül, ha marad utána választható kérdés — a semminél a
 * múlt heti sablon is jobb. A kikapcsolt sablon viszont parancs: abból nem
 * lesz kérdés akkor sem, ha nem marad más.
 */
export function buildQuestion(
	material: QuestionMaterial,
	random: () => number,
	choice: QuestionChoice = {}
): QuestionDraft | null {
	const drafts = draftsFor(material, random, choice.disabled);

	if (!drafts.length) return null;

	const seen = new Set(choice.avoid ?? []);
	const fresh = drafts.filter((draft) => !seen.has(draft.templateKey));
	const choices = fresh.length ? fresh : drafts;
	const wanted = choices.filter(
		(draft) => draft.difficulty === choice.preferred
	);

	return pick(wanted.length ? wanted : choices, random);
}

// ── A játék napja ───────────────────────────────────────────────────────────

/**
 * A játék napja ebben az időzónában telik. Ugyanez az időzóna áll a
 * `composeDailyQuestionDaily` ütemezésén is: a kérdés éjfél után néhány
 * perccel áll össze, és a nap azonosítója ugyanaz a nap kell legyen, amit a
 * gyűjtő az óráján lát.
 *
 * UTC-vel ez elcsúszna: budapesti 00:05-kor UTC szerint még az előző nap
 * este van, tehát a futás a tegnapi nap kérdését írná meg — a mai naphoz
 * pedig egész nap nem tartozna dokumentum.
 */
export const GAME_TIME_ZONE = 'Europe/Budapest';

/** A nap `YYYY-MM-DD` alakban, a játék időzónájában. */
export function gameDay(
	now: Date = new Date(),
	timeZone: string = GAME_TIME_ZONE
): string {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(now);
	const value = (type: string) =>
		parts.find((part) => part.type === type)?.value ?? '';

	return `${value('year')}-${value('month')}-${value('day')}`;
}

// ── Dokumentumok ────────────────────────────────────────────────────────────

/** Az előző nap dátuma, `YYYY-MM-DD` alakban. */
export function previousDay(day: string): string {
	const date = new Date(`${day}T00:00:00Z`);

	date.setUTCDate(date.getUTCDate() - 1);

	return isoDay(date);
}

/** A nap szabályai, ahogy a kérdésre rákerülnek. */
export interface DayRules {
	timeLimitSec: number;
	scoring: QuestionScoring;
}

export function toQuestionDocument(
	day: string,
	draft: QuestionDraft,
	rules: DayRules
): DailyQuestionDocument {
	return {
		uid: day,
		day,
		entityType: ENTITY_TYPE,
		templateKey: draft.templateKey,
		difficulty: draft.difficulty,
		params: draft.params,
		options: draft.options,
		timeLimitSec: rules.timeLimitSec,
		scoring: rules.scoring,
		imageUrl: draft.imageUrl ?? null,
	};
}

export function toAnswerDocument(
	day: string,
	draft: QuestionDraft
): DailyQuestionAnswer {
	return {
		day,
		answerId: draft.answerId,
		templateKey: draft.templateKey,
		subject: draft.subject,
	};
}
