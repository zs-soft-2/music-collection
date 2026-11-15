import {
	AlbumEntity,
	ArtistEntity,
	CollectionItemEntity,
	ContributionEntity,
	ReleaseEntity,
} from '@music-collection/api';
import { MediaEnum, RarityTier } from '@music-collection/common/api';
import { toAlbumCoverUrl, toYear } from '@music-collection/common/engine';
import {
	CatalogAlbum,
	CatalogArtist,
	CatalogCredit,
	OwnedCopy,
} from '@music-collection/domain/music-collection/api';

/**
 * From the catalog's entities onto the narrow ports the resolver works
 * with. Nothing is decided here — the year is read the way the whole app
 * reads it, and a copy without an album is dropped because it cannot say
 * which record it is a pressing of.
 */

export function toCatalogAlbum(album: AlbumEntity): CatalogAlbum {
	return {
		uid: album.uid,
		name: album.name,
		artistUid: album.artist?.uid ?? '',
		artistName: album.artist?.name ?? 'Unknown artist',
		year: toYear(album.year),
		styles: album.styles ?? [],
		format: album.format ?? null,
		coverUrl: toAlbumCoverUrl(album),
	};
}

export function toCatalogArtist(artist: ArtistEntity): CatalogArtist {
	return {
		uid: artist.uid,
		styles: artist.styles ?? [],
		country: artist.country ?? null,
	};
}

export function toCatalogCredit(
	contribution: ContributionEntity
): CatalogCredit {
	return {
		albumUid: contribution.albumUid,
		musicianUid: contribution.musicianUid,
		role: contribution.role,
	};
}

/**
 * The collector's copies, as the completion and the scoring need to see
 * them. A copy without an album is dropped: it cannot say which record it is
 * a pressing of.
 *
 * A copy carries the pressing as it was the day the copy was filed, and a
 * rarity is worked out again every month — so the tier is read from the
 * catalog's own pressing where the catalog is at hand, and from the copy's
 * snapshot only where it is not.
 */
export function toOwnedCopies(
	items: CollectionItemEntity[],
	releases: readonly ReleaseEntity[] = []
): OwnedCopy[] {
	const catalog = new Map(releases.map((release) => [release.uid, release]));
	const copies: OwnedCopy[] = [];

	for (const item of items) {
		const albumUid = item.release?.album?.uid;

		if (albumUid) {
			copies.push({
				albumUid,
				disposedAt: item.disposal?.date ?? null,
				// A copy that names no medium is weighed as the least of them.
				media: item.release.media ?? MediaEnum.all,
				rarity: toRarity(catalog.get(item.release.uid) ?? item.release),
			});
		}
	}

	return copies;
}

/**
 * How rare the pressing is. A generic release — "I have it on vinyl" — is
 * not a pressing at all, and one the server has not weighed yet says
 * nothing: both are common, because rarity is shown, never assumed.
 */
function toRarity(release: ReleaseEntity): RarityTier {
	return release.generic ? 'common' : (release.rarity?.tier ?? 'common');
}
