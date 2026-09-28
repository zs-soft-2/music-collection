/**
 * Discogs-lekérdezés a katalógus-űrlapok MusicBrainz-alternatívájaként: banda
 * keresése és profilja, diszkográfiája, album (master) keresése és profilja a
 * tracklistával. A MusicBrainz sok kisebb kiadványt és bandát nem ismer; ezek
 * a hívások akkor lépnek be, amikor ott nincs találat.
 *
 * A leképezés itt csak normalizál (szöveg, szám, tracklist); a katalógus
 * enumjaira (StyleEnum, FormatEnum, CountryEnum) a kliens mapperei képeznek,
 * mert a functions külön npm-projekt, és a `libs`-ből nem tud importálni.
 */

import {
	DiscogsRequestOptions,
	discogsGet,
	releasedYear,
	text,
} from './discogs-api';
import { normalize, stripDiscogsSuffix } from './discogs-match';

/** Egy lapon ennyi elemet kérünk. */
const PER_PAGE = 100;
/** Ennél több lapot egy diszkográfiához sem kérünk le. */
const MAX_PAGES = 3;
/** A keresés ennyi találatot ad; a névtestvérek kiválasztásához elég. */
const SEARCH_PER_PAGE = 25;

const numbers = (value: unknown): number | null => {
	const number = Number(value);

	return Number.isSafeInteger(number) && number > 0 ? number : null;
};

const texts = (value: unknown): string[] =>
	Array.isArray(value)
		? value.map(text).filter((item): item is string => !!item)
		: [];

/** Az elsődleges kép, ha van; egyébként a legelső. */
function primaryImage(
	images: { type?: unknown; uri?: unknown }[] | undefined
): string | null {
	const list = images ?? [];

	return text(
		(list.find((image) => image.type === 'primary') ?? list[0])?.uri
	);
}

/* ------------------------------------------------------------------ banda */

/** Egy banda a névre keresésből, amennyi a névtestvérek szétválasztásához kell. */
export interface DiscogsArtistCandidate {
	discogsId: number;
	name: string;
	thumbUrl: string | null;
}

/**
 * Egy banda profilja. Amit a Discogs nem tud: alapítási év és ország — azokat
 * a MusicBrainz adja, ha ismeri a bandát.
 */
export interface DiscogsBandProfile {
	discogsId: number;
	name: string;
	/** Bemutatkozás, Discogs-jelölésekkel. */
	description: string | null;
	sites: string[];
	imageUrl: string | null;
	/** A Discogs műfaj- és stílusnevei; a katalógus enumjaira a kliens képez. */
	styles: string[];
	members: DiscogsBandMember[];
}

/**
 * A banda egy tagja. Évszám nincs: a Discogs a tagoknál csak azt tartja, hogy
 * a jelenlegi felállás része-e.
 */
export interface DiscogsBandMember {
	discogsId: number | null;
	name: string;
	active: boolean;
}

/** Az `/artists/{id}` válasz használt mezői. */
interface DiscogsApiBand {
	id?: unknown;
	name?: unknown;
	profile?: unknown;
	urls?: unknown;
	images?: { type?: unknown; uri?: unknown }[];
	members?: { id?: unknown; name?: unknown; active?: unknown }[];
}

/** A `/database/search?type=artist` válasz egy eleme. */
interface DiscogsApiArtistResult {
	id?: unknown;
	title?: unknown;
	thumb?: unknown;
}

export function toBandProfile(band: DiscogsApiBand): DiscogsBandProfile | null {
	const discogsId = numbers(band.id);

	if (!discogsId) return null;

	return {
		discogsId,
		name: stripDiscogsSuffix(text(band.name) ?? ''),
		description: text(band.profile),
		sites: texts(band.urls).filter((url) => /^https?:\/\//i.test(url)),
		imageUrl: primaryImage(band.images),
		// A Discogs az előadóhoz nem ad műfajt; a stílusok a kiadványain
		// vannak, ezért itt üres — az album-profil adja őket.
		styles: [],
		members: (band.members ?? [])
			.map((member) => {
				const name = stripDiscogsSuffix(text(member.name) ?? '');

				return name
					? {
							discogsId: numbers(member.id),
							name,
							active: member.active === true,
						}
					: null;
			})
			.filter((member): member is DiscogsBandMember => !!member),
	};
}

export async function fetchBandProfile(
	artistId: number,
	options: DiscogsRequestOptions = {}
): Promise<DiscogsBandProfile | null> {
	return toBandProfile(
		await discogsGet<DiscogsApiBand>(`/artists/${artistId}`, options)
	);
}

/**
 * A névre illő bandák. A `/database/search` tokent igényel (401 nélküle), és a
 * Discogs a nevet egyértelműsítő utótaggal adja vissza ("Nirvana (2)") — az
 * utótag lekerül, mert a katalógus a nevet utótag nélkül tartja.
 */
export async function searchArtists(
	name: string,
	options: DiscogsRequestOptions = {}
): Promise<DiscogsArtistCandidate[]> {
	const query = new URLSearchParams({
		q: name,
		type: 'artist',
		per_page: String(SEARCH_PER_PAGE),
	});
	const page = await discogsGet<{ results?: DiscogsApiArtistResult[] }>(
		`/database/search?${query}`,
		options
	);
	const wanted = normalize(name);

	const hits = (page.results ?? [])
		.map((result) => {
			const discogsId = numbers(result.id);
			const title = text(result.title);

			return discogsId && title
				? {
						discogsId,
						name: stripDiscogsSuffix(title),
						thumbUrl: text(result.thumb),
					}
				: null;
		})
		.filter((hit): hit is DiscogsArtistCandidate => !!hit);
	const exact = hits.filter((hit) => normalize(hit.name) === wanted);

	// A Discogs a részleges egyezéseket is visszaadja ("Nirvana UK"). Ahol van
	// pontos névegyezés, a névtestvérek közül csak azokból érdemes választani;
	// ahol nincs, a legelső találat marad — ugyanaz, amit a MusicBrainz-út
	// felajánl (`rankArtists`), és az admin a forráslapon ellenőrzi, az övé-e.
	return exact.length ? exact : hits.slice(0, 1);
}

/* --------------------------------------------------------- diszkográfia */

/** A banda egy albuma a diszkográfiából. */
export interface DiscogsArtistAlbum {
	/** Master id, ha a Discogs ismeri; egyébként a préselés id-ja. */
	id: number;
	/** `master`, ha az albumnak van összevont mestere. */
	type: 'master' | 'release';
	name: string;
	year: number | null;
	thumbUrl: string | null;
	/** "LP", "Album", "EP"… amennyit a Discogs erről az elemről tud. */
	formats: string[];
}

/** Az `/artists/{id}/releases` válasz egy eleme (a használt mezők). */
interface DiscogsApiArtistRelease {
	id?: unknown;
	type?: unknown;
	title?: unknown;
	role?: unknown;
	year?: unknown;
	thumb?: unknown;
	format?: unknown;
	main_release?: unknown;
}

interface DiscogsApiReleasePage {
	pagination?: { pages?: number };
	releases?: DiscogsApiArtistRelease[];
}

/**
 * A banda saját kiadványai, a régebbiek előre. A `Main` szerep szűri ki a
 * közreműködéseket (compilation, "Appearance").
 *
 * Amelyik albumnak van mestere, az onnan jön — a mester az album, a préselések
 * a kiadásai. Mester nélküli préselést is beveszünk: a kisebb kiadványoknak
 * gyakran nincs mesterük, és pont ezek azok, amiket a MusicBrainz sem ismer.
 * Az azonos címűekből az első marad, hogy egy album ne szerepeljen többször.
 */
export function toArtistAlbums(
	releases: DiscogsApiArtistRelease[]
): DiscogsArtistAlbum[] {
	const seen = new Set<string>();

	return releases
		.filter((release) => text(release.role) === 'Main')
		.map((release) => {
			const id = numbers(release.id);
			const name = text(release.title);
			const type = text(release.type) === 'master' ? 'master' : 'release';

			return id && name
				? {
						id,
						type: type as 'master' | 'release',
						name,
						year: releasedYear(release.year),
						thumbUrl: text(release.thumb),
						formats: text(release.format)
							? String(release.format)
									.split(',')
									.map((part) => part.trim())
									.filter(Boolean)
							: [],
					}
				: null;
		})
		.filter((album): album is DiscogsArtistAlbum => !!album)
		.sort(
			(a, b) =>
				(a.year ?? 9999) - (b.year ?? 9999) ||
				// A mester előzi az ugyanilyen című préselést.
				Number(b.type === 'master') - Number(a.type === 'master')
		)
		.filter((album) => {
			const key = normalize(album.name);

			if (seen.has(key)) return false;

			seen.add(key);

			return true;
		});
}

export async function fetchArtistAlbums(
	artistId: number,
	options: DiscogsRequestOptions = {}
): Promise<DiscogsArtistAlbum[]> {
	const releases: DiscogsApiArtistRelease[] = [];

	for (let page = 1; page <= MAX_PAGES; page += 1) {
		const query = new URLSearchParams({
			page: String(page),
			per_page: String(PER_PAGE),
			sort: 'year',
			sort_order: 'asc',
		});
		const result = await discogsGet<DiscogsApiReleasePage>(
			`/artists/${artistId}/releases?${query}`,
			options
		);

		releases.push(...(result.releases ?? []));

		if (page >= (result.pagination?.pages ?? 1)) break;
	}

	return toArtistAlbums(releases);
}

/* ------------------------------------------------------------------ album */

/** Egy szám a master tracklistájából. */
export interface DiscogsMasterTrack {
	/** Ahogy a borítón szerepel: "A1", "3"… */
	position: string;
	name: string;
	/** "4:04", ahogy a Discogs tartja; null, ha nem tudja. */
	duration: string | null;
}

/**
 * Egy album (Discogs master): profil, borító és tracklist egy hívásból — a
 * MusicBrainz-úton ez három kérés (release-group, Cover Art Archive, release).
 */
export interface DiscogsMasterProfile {
	masterId: number;
	name: string;
	artistName: string | null;
	year: number | null;
	/** Discogs stílus- és műfajnevek; a katalógus enumjaira a kliens képez. */
	styles: string[];
	coverUrl: string | null;
	tracks: DiscogsMasterTrack[];
}

/** A `/masters/{id}` válasz használt mezői. */
interface DiscogsApiMaster {
	id?: unknown;
	title?: unknown;
	year?: unknown;
	artists?: { name?: unknown }[];
	styles?: unknown;
	genres?: unknown;
	images?: { type?: unknown; uri?: unknown }[];
	tracklist?: {
		type_?: unknown;
		position?: unknown;
		title?: unknown;
		duration?: unknown;
	}[];
}

/**
 * A tracklist számai. A `type_` szűri ki a fejezetcímeket (`heading`) és a
 * több számot összefogó sorokat (`index`) — a katalógusba csak a `track`
 * sorok valók.
 */
export function toMasterTracks(
	tracklist: DiscogsApiMaster['tracklist']
): DiscogsMasterTrack[] {
	return (tracklist ?? [])
		.filter((track) => {
			const type = text(track.type_);

			return !type || type === 'track';
		})
		.map((track, index) => {
			const name = text(track.title);

			return name
				? {
						position: text(track.position) ?? String(index + 1),
						name,
						duration: text(track.duration),
					}
				: null;
		})
		.filter((track): track is DiscogsMasterTrack => !!track);
}

export function toMasterProfile(
	master: DiscogsApiMaster
): DiscogsMasterProfile | null {
	const masterId = numbers(master.id);

	if (!masterId) return null;

	return {
		masterId,
		name: text(master.title) ?? '',
		artistName:
			stripDiscogsSuffix(text((master.artists ?? [])[0]?.name) ?? '') ||
			null,
		year: releasedYear(master.year),
		// A stílus a szűkebb megnevezés ("Thrash"), a műfaj a bővebb
		// ("Rock") — ebben a sorrendben nézi majd őket a kliens mappere.
		styles: [...texts(master.styles), ...texts(master.genres)],
		coverUrl: primaryImage(master.images),
		tracks: toMasterTracks(master.tracklist),
	};
}

export async function fetchMasterProfile(
	masterId: number,
	options: DiscogsRequestOptions = {}
): Promise<DiscogsMasterProfile | null> {
	return toMasterProfile(
		await discogsGet<DiscogsApiMaster>(`/masters/${masterId}`, options)
	);
}

/** Egy album-találat a kereséből, amennyi az azonosításához kell. */
export interface DiscogsMasterCandidate {
	masterId: number;
	name: string;
	artistName: string | null;
	year: number | null;
	thumbUrl: string | null;
}

/** A `/database/search?type=master` válasz egy eleme. */
interface DiscogsApiMasterResult {
	id?: unknown;
	title?: unknown;
	year?: unknown;
	thumb?: unknown;
}

/**
 * Előadó + cím alapján az album mesterei. A Discogs a találat címét
 * "Előadó - Album" alakban adja; a rangsorolás a kliens mapperében van, ahol
 * a katalógus névösszevetése (`isSameCatalogName`) is elérhető.
 */
export async function searchMasters(
	artist: string,
	albumTitle: string,
	options: DiscogsRequestOptions = {}
): Promise<DiscogsMasterCandidate[]> {
	const query = new URLSearchParams({
		artist,
		release_title: albumTitle,
		type: 'master',
		per_page: String(SEARCH_PER_PAGE),
	});
	const page = await discogsGet<{ results?: DiscogsApiMasterResult[] }>(
		`/database/search?${query}`,
		options
	);

	return (page.results ?? [])
		.map((result) => {
			const masterId = numbers(result.id);
			const title = text(result.title);

			if (!masterId || !title) return null;

			const separator = title.indexOf(' - ');

			return {
				masterId,
				name: separator > 0 ? title.slice(separator + 3).trim() : title,
				artistName:
					separator > 0
						? stripDiscogsSuffix(title.slice(0, separator))
						: null,
				year: releasedYear(result.year),
				thumbUrl: text(result.thumb),
			};
		})
		.filter((hit): hit is DiscogsMasterCandidate => !!hit);
}
