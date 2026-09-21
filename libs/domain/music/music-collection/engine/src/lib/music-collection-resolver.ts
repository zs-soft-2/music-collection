import {
	CatalogAlbum,
	CatalogArtist,
	CatalogCredit,
	CreditCriterion,
	MusicCollectionCatalog,
	MusicCollectionCriteria,
	MusicCollectionMembership,
	ResolvedMusicCollection,
} from '@music-collection/domain/music-collection/api';

import {
	matchesEnum,
	matchesNumber,
	matchesReference,
	matchesSingleEnum,
} from './music-collection-criteria';

/** The definition as resolving it sees it; the rest of it is presentation. */
export interface ResolvableCollection {
	uid: string;
	criteria: MusicCollectionCriteria;
	criteriaVersion: number;
}

/**
 * One credit must satisfy the whole criterion, not two of them together:
 * "Gene Hoglan on drums" is not met by Hoglan guesting on vocals while
 * somebody else drums.
 */
function matchesCredits(
	credits: CatalogCredit[],
	criterion?: CreditCriterion
): boolean {
	if (!criterion) {
		return true;
	}

	const roles = criterion.roles?.map((role) => role.toLowerCase());

	return credits.some(
		(credit) =>
			(criterion.musicians === undefined ||
				criterion.musicians.includes(credit.musicianUid)) &&
			(roles === undefined || roles.includes(credit.role.toLowerCase()))
	);
}

function matchesAlbum(
	album: CatalogAlbum,
	criteria: MusicCollectionCriteria,
	artists: Map<string, CatalogArtist>,
	credits: Map<string, CatalogCredit[]>
): boolean {
	if (
		!matchesNumber(album.year, criteria.years) ||
		!matchesEnum(album.styles, criteria.styles) ||
		!matchesSingleEnum(album.format, criteria.albumFormats) ||
		!matchesReference(album.artistUid, criteria.artists)
	) {
		return false;
	}

	if (criteria.artistStyles || criteria.artistCountries) {
		const artist = artists.get(album.artistUid);

		// The criteria ask about the artist and the catalog has no such one.
		if (
			!artist ||
			!matchesEnum(artist.styles, criteria.artistStyles) ||
			!matchesSingleEnum(artist.country, criteria.artistCountries)
		) {
			return false;
		}
	}

	return matchesCredits(credits.get(album.uid) ?? [], criteria.credits);
}

function toMembership(album: CatalogAlbum): MusicCollectionMembership {
	return {
		albumUid: album.uid,
		albumName: album.name,
		artistUid: album.artistUid,
		artistName: album.artistName,
		year: album.year,
		coverUrl: album.coverUrl,
	};
}

/** By artist, then chronologically, then by title. */
function compareMemberships(
	a: MusicCollectionMembership,
	b: MusicCollectionMembership
): number {
	return (
		a.artistName.localeCompare(b.artistName) ||
		(a.year ?? 0) - (b.year ?? 0) ||
		a.albumName.localeCompare(b.albumName)
	);
}

/**
 * The albums of the catalog the collection asks for.
 *
 * A criteria object with no fields matches the whole catalog: the fields are
 * ANDed, and there is nothing to fail. That is why a collection is only
 * published deliberately — a draft resolving to everything would hand out a
 * badge nobody can earn.
 */
export function resolveMusicCollection(
	collection: ResolvableCollection,
	catalog: MusicCollectionCatalog,
	calculatedAt: number = Date.now()
): ResolvedMusicCollection {
	const artists = new Map(
		catalog.artists.map((artist) => [artist.uid, artist])
	);
	const credits = new Map<string, CatalogCredit[]>();

	for (const credit of catalog.credits ?? []) {
		const album = credits.get(credit.albumUid);

		if (album) {
			album.push(credit);
		} else {
			credits.set(credit.albumUid, [credit]);
		}
	}

	const albums = catalog.albums
		.filter((album) =>
			matchesAlbum(album, collection.criteria, artists, credits)
		)
		.map(toMembership)
		.sort(compareMemberships);

	return {
		collectionUid: collection.uid,
		criteriaVersion: collection.criteriaVersion,
		albums,
		total: albums.length,
		calculatedAt,
	};
}
