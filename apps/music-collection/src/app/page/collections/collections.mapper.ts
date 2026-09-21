import { MusicCollectionStanding } from '@music-collection/domain/music-collection/core';

import {
	COVER_MOSAIC_SIZE,
	CollectionAlbumView,
	CollectionBadgeView,
	CollectionCardView,
	CollectionDetailView,
} from './collections.model';

/**
 * From a standing — the definition, what it resolves to and how far the
 * collector has got — onto what the pages render. Nothing is decided here:
 * membership and progress both come from the engine, and this only arranges
 * them.
 */

function toCovers(standing: MusicCollectionStanding): string[] {
	const covers: string[] = [];

	for (const album of standing.resolved.albums) {
		if (album.coverUrl) {
			covers.push(album.coverUrl);

			if (covers.length === COVER_MOSAIC_SIZE) {
				break;
			}
		}
	}

	return covers;
}

export function toCollectionCard(
	standing: MusicCollectionStanding
): CollectionCardView {
	const { collection, progress, score } = standing;

	return {
		uid: collection.uid,
		slug: collection.slug,
		name: collection.name,
		description: collection.description,
		icon: collection.icon,
		coverImageUrl: collection.coverImageUrl,
		badgeName: collection.badge?.name ?? null,
		owned: progress.owned,
		total: progress.total,
		missing: progress.missing,
		percentage: progress.percentage,
		completed: progress.completed,
		points: score.totalPoints,
		earnedPoints: score.earnedPoints,
		bonusPoints: score.bonusPoints,
		covers: toCovers(standing),
	};
}

/** Nearly finished first, and an empty collection last whatever its name. */
export function sortCollectionCards(
	cards: CollectionCardView[]
): CollectionCardView[] {
	return [...cards].sort(
		(a, b) =>
			Number(b.total > 0) - Number(a.total > 0) ||
			b.percentage - a.percentage ||
			a.name.localeCompare(b.name)
	);
}

function toBadge(
	standing: MusicCollectionStanding
): CollectionBadgeView | null {
	const { badge } = standing.collection;

	return badge
		? {
				name: badge.name,
				description: badge.description,
				icon: badge.icon,
				artworkUrl: badge.artworkUrl,
				earned: standing.progress.completed,
			}
		: null;
}

export function toCollectionDetail(
	standing: MusicCollectionStanding
): CollectionDetailView {
	const owned = new Set(standing.progress.ownedAlbumUids);
	const albums: CollectionAlbumView[] = standing.resolved.albums.map(
		(album) => ({ ...album, owned: owned.has(album.albumUid) })
	);

	return {
		...toCollectionCard(standing),
		badge: toBadge(standing),
		albums,
		highlights: standing.score.highlights,
	};
}
