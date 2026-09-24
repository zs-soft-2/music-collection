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
	kind: 'album' | 'artist' | 'release' | 'track';
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
}

export interface MaterialTrack {
	uid: string;
	name: string;
	index: number;
	position: string | null;
	durationSec: number | null;
	/** Kitöltve, ha a szám csak az egyik pressingen van rajta. */
	releaseUid: string | null;
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
				.filter(
					(year): year is number => !!year && year !== album.year
				)
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
					(right.durationSec as number) -
					(left.durationSec as number)
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
			tracks
				.filter((track) => track.uid !== opener.uid)
				.map(trackOption),
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
		const named = material.releases.filter((release) => !!release.labelName);

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
					(other) => !!other.country && other.country !== artist.country
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
];

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

/** Amit ebből az anyagból meg lehet kérdezni. */
export function draftsFor(
	material: QuestionMaterial,
	random: () => number
): QuestionDraft[] {
	return TEMPLATES.map((template) => template.build(material, random)).filter(
		(draft): draft is QuestionDraft => !!draft
	);
}

/**
 * A nap kérdése ebből az anyagból.
 *
 * A nehézség kívánság, az `avoid` pedig a tegnapi sablon: kétszer ugyanazt
 * kérdezni fárasztó. Mindkettő csak akkor érvényesül, ha marad utána
 * választható kérdés — a semminél a tegnapi sablon is jobb.
 */
export function buildQuestion(
	material: QuestionMaterial,
	random: () => number,
	preferred?: QuestionDifficulty,
	avoid?: string | null
): QuestionDraft | null {
	const drafts = draftsFor(material, random);

	if (!drafts.length) return null;

	const fresh = drafts.filter((draft) => draft.templateKey !== avoid);
	const choices = fresh.length ? fresh : drafts;
	const wanted = choices.filter((draft) => draft.difficulty === preferred);

	return pick(wanted.length ? wanted : choices, random);
}

// ── Dokumentumok ────────────────────────────────────────────────────────────

/** Az előző nap dátuma, `YYYY-MM-DD` alakban. */
export function previousDay(day: string): string {
	const date = new Date(`${day}T00:00:00Z`);

	date.setUTCDate(date.getUTCDate() - 1);

	return isoDay(date);
}

export function toQuestionDocument(
	day: string,
	draft: QuestionDraft
): DailyQuestionDocument {
	return {
		uid: day,
		day,
		entityType: ENTITY_TYPE,
		templateKey: draft.templateKey,
		difficulty: draft.difficulty,
		params: draft.params,
		options: draft.options,
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
