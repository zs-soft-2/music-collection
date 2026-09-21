import {
	AlbumEntity,
	ArtistEntity,
	CollectionItemEntity,
	ContributionEntity,
} from '@music-collection/api';
import {
	FormatDescriptionEnum,
	FormatDescriptionList,
} from '@music-collection/common/api';
import { toDescriptions, toYear } from '@music-collection/common/engine';
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
		coverUrl: album.coverImage?.filePath || album.coverImageUrl || null,
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
 * The edition tags the catalog knows, out of whatever the pressing carries:
 * the field holds one description on old records and a list on new ones, and
 * a tag the enum does not know is not a tag the scoring can weigh.
 */
function toEditions(value: unknown): FormatDescriptionEnum[] {
	return toDescriptions(value).filter(
		(description): description is FormatDescriptionEnum =>
			FormatDescriptionList.includes(description as FormatDescriptionEnum)
	);
}

/**
 * The collector's copies, as the completion and the scoring need to see
 * them. A copy without an album is dropped: it cannot say which record it is
 * a pressing of.
 */
export function toOwnedCopies(items: CollectionItemEntity[]): OwnedCopy[] {
	const copies: OwnedCopy[] = [];

	for (const item of items) {
		const albumUid = item.release?.album?.uid;

		if (albumUid) {
			copies.push({
				albumUid,
				disposedAt: item.disposal?.date ?? null,
				releaseYear: toYear(item.release?.date),
				editions: toEditions(item.release?.formatDescription),
			});
		}
	}

	return copies;
}
