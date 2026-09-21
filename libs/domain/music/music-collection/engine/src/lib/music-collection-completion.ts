import {
	MusicCollectionProgress,
	OwnedCopy,
	ResolvedMusicCollection,
} from '@music-collection/domain/music-collection/api';

/**
 * The albums a collector owns, whatever they own them on.
 *
 * Two rules live here, and only here. A copy that left the collection is
 * kept as history but is not owned any more, and several copies of the same
 * record — two pressings, or simply two of the same — are still one album.
 */
export function ownedAlbumUids(copies: readonly OwnedCopy[]): Set<string> {
	const owned = new Set<string>();

	for (const copy of copies) {
		if (copy.disposedAt === null) {
			owned.add(copy.albumUid);
		}
	}

	return owned;
}

/**
 * How far the collector has got with this collection, as both stand now.
 *
 * Nothing is remembered: the collection gaining an album, or a record
 * leaving the shelf, takes a completed badge away again.
 */
export function compareWithCollection(
	resolved: ResolvedMusicCollection,
	copies: readonly OwnedCopy[]
): MusicCollectionProgress {
	const owned = ownedAlbumUids(copies);
	const ownedAlbumUidsOfCollection: string[] = [];
	const missingAlbumUids: string[] = [];

	for (const album of resolved.albums) {
		(owned.has(album.albumUid)
			? ownedAlbumUidsOfCollection
			: missingAlbumUids
		).push(album.albumUid);
	}

	const total = resolved.total;
	const ownedCount = ownedAlbumUidsOfCollection.length;
	const completed = total > 0 && ownedCount === total;

	return {
		collectionUid: resolved.collectionUid,
		total,
		owned: ownedCount,
		missing: missingAlbumUids.length,
		// Rounding must never show a full bar next to a locked badge.
		percentage:
			total === 0
				? 0
				: completed
					? 100
					: Math.min(99, Math.round((ownedCount / total) * 100)),
		completed,
		ownedAlbumUids: ownedAlbumUidsOfCollection,
		missingAlbumUids,
	};
}
