/**
 * A collection tényei a katalógusból — a lemezek, amikről a jelvény szól.
 *
 * Külön fájl a rajzolástól és a döntésektől: itt csak olvasás van, a
 * `firebase-functions` pedig szándékosan nincs behúzva, hogy a modul
 * tesztelhető maradjon (a jest azon az ágon egy ESM-csomagba fut bele).
 * Ami tényből motívum lesz, az a `music-collection-badge-context.ts`-ben
 * dől el.
 *
 * Miért nem a teljes szabályt futtatjuk le: a resolver a `libs`-ben él, amit
 * a functions nem lát, és a katalógus végigolvasása badge-enként több ezer
 * olvasás lenne. Ehelyett a szabály azon felét kérdezzük meg, amelyik egy
 * szűk lekérdezéssel megválaszolható — a megnevezett előadók lemezeit, vagy
 * a megnevezett stílus lemezeit —, a maradékot (év, stílus, hordozó) pedig
 * memóriában szűrjük. Az előadó országát és a közreműködőket nem nézzük: azok
 * csak *szűkítenék* a listát, tehát a jelvény legrosszabb esetben egy-két
 * olyan lemezt is megnéz, ami végül nem tartozik bele. Egy szín és egy
 * évszám ennyit elbír; egy pontszám nem bírna, de pontot ez nem számol.
 */

import { Firestore, Query } from 'firebase-admin/firestore';

import { BadgeAlbum } from './music-collection-badge-context';

const ARTIST_COLLECTION = 'artist';
const ALBUM_COLLECTION = 'album';

/** Ennyi előadóig nézünk szét; ennél többet egy pin nem ér. */
export const MAX_ARTISTS = 5;
/** Ennyi lemez egy előadótól. A katalógus legnagyobb diszkográfiája ennél rövidebb. */
const MAX_ALBUMS_PER_ARTIST = 120;
/** Ennyi lemeznél többet egy jelvény soha nem olvas be. */
export const MAX_ALBUMS = 200;

/** Az albumdokumentum mezői, amikre szükség van — a többit nem olvassuk be. */
const ALBUM_FIELDS = [
	'name',
	'year',
	'styles',
	'format',
	'coverImage',
	'coverImageUrl',
] as const;

/** A szabály azon része, amiből le lehet kérdezni. */
export interface BadgeFactsRequest {
	artistUids: string[];
	/**
	 * A szabály *album*-stílusai (`criteria.styles`). Csak ezekre lehet
	 * szűrni: egy lemez a saját stílusait hordozza, az előadóét nem.
	 */
	albumStyles: string[];
	/**
	 * Minden megnevezett stílus, az előadóé is. Ebből lesz a keresés, ha a
	 * szabály nem nevez meg előadót — egy „Heavy metal" előadó-stílusra a
	 * katalógus ugyanúgy ad lemezeket, csak nem feltétlenül ugyanazokat.
	 */
	namedStyles: string[];
	years: { from: number | null; to: number | null; equals: number | null };
	formats: string[];
}

/** Amit a katalógus a collectionről mond. */
export interface BadgeFacts {
	albums: BadgeAlbum[];
	/** A megnevezett előadók neve — az `ai` szint ebből ír motívumot. */
	artistNames: string[];
	/** Az előadók saját stílusai, ha a lemezek nem mondanak semmit. */
	artistStyles: string[];
}

/** Egy albumdokumentum, ahogy a jelvénynek kell. */
function toAlbum(data: Record<string, unknown>): BadgeAlbum {
	const cover = (data['coverImage'] ?? null) as { filePath?: string } | null;
	const year = data['year'];

	return {
		name: typeof data['name'] === 'string' ? data['name'] : '',
		// A katalógusban a lemez éve szám. Ami nem az, arról nem állítjuk,
		// hogy tudjuk — egy rossz évszám rossz patinát önt a fémre.
		year: typeof year === 'number' && Number.isFinite(year) ? year : null,
		styles: Array.isArray(data['styles'])
			? (data['styles'] as string[]).filter(
					(style) => typeof style === 'string'
				)
			: [],
		coverUrl:
			cover?.filePath ||
			(typeof data['coverImageUrl'] === 'string'
				? data['coverImageUrl']
				: null) ||
			null,
	};
}

/**
 * A lemez formátuma külön olvasva: a szűréshez kell, a jelvényhez nem.
 */
function formatOf(data: Record<string, unknown>): string | null {
	return typeof data['format'] === 'string' ? data['format'] : null;
}

/** Illeszkedik-e a lemez arra, amit a szabály a lekérdezésen túl kér. */
function narrows(
	album: BadgeAlbum,
	format: string | null,
	request: BadgeFactsRequest
): boolean {
	const { years, formats, albumStyles } = request;

	if (album.year !== null) {
		if (years.equals !== null && album.year !== years.equals) return false;
		if (years.from !== null && album.year < years.from) return false;
		if (years.to !== null && album.year > years.to) return false;
	}

	if (formats.length && (!format || !formats.includes(format))) {
		return false;
	}

	// A stílust csak akkor kérjük számon, ha a lemez mond magáról ilyet:
	// egy stílus nélkül importált lemez attól még az előadóé, és a címe
	// meg a borítója ugyanúgy a collectionről beszél.
	return (
		!albumStyles.length ||
		!album.styles.length ||
		album.styles.some((style) => albumStyles.includes(style))
	);
}

/** Egy lekérdezés lemezei; a hiba nem állítja meg a jelvényt. */
async function albumsOf(query: Query): Promise<Record<string, unknown>[]> {
	try {
		const snapshot = await query.select(...ALBUM_FIELDS).get();

		return snapshot.docs.map((document) => document.data());
	} catch {
		// Hiányzó index vagy elszállt lekérdezés. A jelvény ilyenkor annyit
		// tud, amennyit a szabály maga kimond — ugyanazt, amit régen.
		return [];
	}
}

/**
 * A megnevezett előadók lapja: a nevük és a stílusuk.
 *
 * A stílus a végső tartalék — csak akkor jut szerephez, ha sem a szabály, sem
 * az elért lemezek nem mondanak stílust. Pont ez a tartalék vezette félre a
 * Megadeth jelvényét, amikor még ez volt az *első* forrás.
 */
async function readArtists(
	database: Firestore,
	artistUids: string[]
): Promise<{ names: string[]; styles: string[] }> {
	if (!artistUids.length) {
		return { names: [], styles: [] };
	}

	const snapshots = await database.getAll(
		...artistUids.map((uid) =>
			database.collection(ARTIST_COLLECTION).doc(uid)
		)
	);

	return {
		names: snapshots
			.map((snapshot) => snapshot.get('name'))
			.filter((name): name is string => typeof name === 'string'),
		styles: snapshots.flatMap((snapshot) => {
			const styles = snapshot.get('styles');

			return Array.isArray(styles) ? (styles as string[]) : [];
		}),
	};
}

/**
 * Amit a katalógus a collectionről tud.
 *
 * Két út vezet lemezekhez, és a sorrendjük szándékos. Ha a szabály előadót
 * nevez meg, a lemezei az előadó allekérdezéséből jönnek — ez pontos és
 * olcsó. Ha nem, de stílust igen, akkor a stílus lemezeiből veszünk egy
 * merítést; ez a `styles` mezőre collection-group indexet kér, és ha az
 * nincs kint, a lekérdezés csendben üresen tér vissza. Egyik út sem jár
 * sikerrel minden szabálynál — és ez rendben van: üres lemezlistánál a
 * jelvény ugyanúgy elkészül, csak abból, amit a szabály maga kimond.
 */
export async function readBadgeFacts(
	database: Firestore,
	request: BadgeFactsRequest
): Promise<BadgeFacts> {
	const artistUids = request.artistUids.slice(0, MAX_ARTISTS);
	const { names, styles } = await readArtists(database, artistUids);
	let documents: Record<string, unknown>[] = [];

	if (artistUids.length) {
		const perArtist = await Promise.all(
			artistUids.map((uid) =>
				albumsOf(
					database
						.collection(ARTIST_COLLECTION)
						.doc(uid)
						.collection(ALBUM_COLLECTION)
						.limit(MAX_ALBUMS_PER_ARTIST)
				)
			)
		);

		documents = perArtist.flat();
	} else if (request.namedStyles.length) {
		documents = await albumsOf(
			database
				.collectionGroup(ALBUM_COLLECTION)
				.where('styles', 'array-contains', request.namedStyles[0])
				.limit(MAX_ALBUMS)
		);
	}

	const albums = documents
		.map((data) => ({ album: toAlbum(data), format: formatOf(data) }))
		.filter(({ album, format }) => narrows(album, format, request))
		.map(({ album }) => album)
		// A sorrend a kiadásé: a borítókból a legkorábbiakat nézzük meg, és
		// azok mondják meg, milyen színnel indult ez a lemezsor.
		.sort((album, other) => (album.year ?? 9999) - (other.year ?? 9999))
		.slice(0, MAX_ALBUMS);

	return { albums, artistNames: names, artistStyles: styles };
}
