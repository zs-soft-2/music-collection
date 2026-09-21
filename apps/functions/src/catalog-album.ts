/**
 * Album és előadó a katalógusba egy Discogs-kiadásból — ahhoz a release-
 * kéréshez, amelynek albuma még nincs meg (fotóról azonosított lemez).
 *
 * Ami létrejön, az vázlat: a név, a típus, az év és a dalok a Discogsról
 * jönnek, a stílusokat és az előadó adatait az admin tölti ki a szokásos
 * űrlapokon (az előadónál a `discogs.artistId` miatt a Load gomb is megy).
 * Amit a Discogs nem mond meg — például az előadó országát —, azt üresen
 * hagyjuk: a kitalált érték rosszabb, mint a hiányzó.
 */

import { searchParameters } from './catalog-sync';
import { DiscogsRelease, discogsReleaseDate } from './discogs-release';
import { normalize, stripDiscogsSuffix } from './discogs-match';
import { text } from './discogs-api';

/** A katalógus egyetlen műfaja. */
const GENRE = 'Rock';

/** Discogs "Various" ál-előadó; nem valódi katalógus-előadó. */
const VARIOUS_ARTIST_ID = 194;

/** A Discogs formátum-leírásai → a katalógus album-típusa (FormatEnum). */
const FORMATS: [RegExp, string][] = [
	[/\blive\b/i, 'live'],
	[/\bcompilation\b/i, 'compilation'],
	[/\bmaxi-single\b/i, 'maxi'],
	[/\bep\b/i, 'ep'],
	[/\bsingle\b/i, 'single'],
];

export function albumFormat(release: DiscogsRelease): string {
	const tags = (release.formats ?? []).flatMap((format) => [
		format.name ?? '',
		...(format.descriptions ?? []),
		format.text ?? '',
	]);

	for (const [pattern, format] of FORMATS) {
		if (tags.some((tag) => pattern.test(tag))) return format;
	}

	return 'lp';
}

/** A kiadás dalcímei; az indexeket és a nem-dal sorokat kihagyva. */
export function albumSongs(release: DiscogsRelease): string[] {
	return (release.tracklist ?? [])
		.filter((track) => (track.type_ ?? 'track') === 'track')
		.map((track) => text(track.title))
		.filter((title): title is string => !!title);
}

export function albumCoverUrl(release: DiscogsRelease): string | null {
	const images = release.images ?? [];
	const primary = images.find((image) => image.type === 'primary');

	return text(primary?.uri ?? images[0]?.uri);
}

/** A kiadás főelőadója, a Discogs egyértelműsítő utótagja nélkül. */
export function releaseArtist(
	release: DiscogsRelease
): { id: number | null; name: string } | null {
	const main = (release.artists ?? []).find(
		(artist) => Number(artist.id) !== VARIOUS_ARTIST_ID
	);
	const name = stripDiscogsSuffix(text(main?.name) ?? '');

	if (!name) return null;

	const id = Number(main?.id);

	return { id: Number.isSafeInteger(id) && id > 0 ? id : null, name };
}

/**
 * A kiadás albumcíme: a Discogs a release címében csak az albumot adja, az
 * előadót külön — a keresési találatokkal ellentétben.
 */
export function albumName(release: DiscogsRelease): string {
	return text(release.title) ?? '';
}

export interface CatalogArtistReference {
	uid: string;
	name: string;
}

/** Új katalógus-előadó a kiadás főelőadójából. */
export function toCatalogArtist(
	uid: string,
	artist: { id: number | null; name: string }
): Record<string, unknown> {
	return {
		uid,
		entityType: 'Artist',
		name: artist.name,
		artistType: 'band',
		genre: GENRE,
		description: '',
		styles: [],
		...(artist.id ? { discogs: { artistId: artist.id } } : {}),
		searchParameters: searchParameters(artist.name),
	};
}

/** Új katalógus-album a Discogs-kiadásból, az előadó alá. */
export function toCatalogAlbum(
	release: DiscogsRelease,
	{ uid, artist }: { uid: string; artist: CatalogArtistReference }
): Record<string, unknown> {
	const name = albumName(release);
	const date = discogsReleaseDate(release);

	return {
		uid,
		entityType: 'Album',
		name,
		artist: { uid: artist.uid, entityType: 'Artist', name: artist.name },
		format: albumFormat(release),
		genre: GENRE,
		styles: [],
		songs: albumSongs(release),
		year: date ? new Date(date) : null,
		coverImage: null,
		coverImageUrl: albumCoverUrl(release),
		discogs: {
			masterId: release.master_id ?? null,
			releaseId: release.id,
			released: text(release.released),
			country: text(release.country),
			labels: (release.labels ?? []).map((label) => ({
				name: text(label.name) ?? '',
				catno: text(label.catno),
			})),
			formats: (release.formats ?? []).map((format) =>
				[format.name, ...(format.descriptions ?? [])]
					.filter(Boolean)
					.join(', ')
			),
		},
		searchParameters: searchParameters(name),
	};
}

/** Névre egyező katalógus-előadó keresésekor használt összevetés. */
export const sameArtistName = (a: string, b: string): boolean =>
	normalize(a) === normalize(b) && !!normalize(a);

/**
 * Ugyanaz a lemez-e a két cím — egy előadón belül. Két előadónak lehet
 * ugyanolyan című albuma, a katalógus ezért csak az előadón belül ütközteti
 * a címeket, ahogy az admin űrlap is.
 */
export const sameAlbumName = (a: string, b: string): boolean =>
	normalize(a) === normalize(b) && !!normalize(a);
