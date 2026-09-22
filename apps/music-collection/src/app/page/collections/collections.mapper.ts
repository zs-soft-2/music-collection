import {
	BadgeDefinition,
	NextAlbumSuggestion,
} from '@music-collection/domain/music-collection/api';
import { MusicCollectionStanding } from '@music-collection/domain/music-collection/core';

import {
	COVER_MOSAIC_SIZE,
	CollectionAlbumView,
	CollectionBadgeView,
	CollectionCardView,
	CollectionDetailView,
	NEXT_ALBUM_COUNT,
	NextAlbumDemandView,
	NextAlbumView,
} from './collections.model';

/**
 * From a standing — the definition, what it resolves to and how far the
 * collector has got — onto what the pages render. Nothing is decided here:
 * membership and progress both come from the engine, and this only arranges
 * them.
 */

/**
 * The picture of the badge, wherever it comes from: the cast pin is the
 * badge once an admin has picked one, and the typed-in artwork only stands
 * in until then. Null leaves the icon to speak for it.
 */
function toBadgeArtwork(badge: BadgeDefinition | null): string | null {
	return badge ? (badge.image?.filePath ?? badge.artworkUrl) : null;
}

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
		badgeArtworkUrl: toBadgeArtwork(collection.badge),
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
				artworkUrl: toBadgeArtwork(badge),
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

/**
 * The hunt list: the ranked records, named in the collector's terms.
 *
 * The ranking knows collections by uid alone; the names and the links come
 * from the cards the page has already built. A collection the cards do not
 * hold cannot be pointed at, so its demand is left out rather than shown as
 * a dead link — and a record wanted by nothing else drops out with it.
 */
export function toNextAlbums(
	suggestions: readonly NextAlbumSuggestion[],
	collections: readonly CollectionCardView[],
	limit: number = NEXT_ALBUM_COUNT
): NextAlbumView[] {
	const byUid = new Map(
		collections.map((collection) => [collection.uid, collection])
	);
	const named = (uid: string) => byUid.get(uid)?.name;
	const views: NextAlbumView[] = [];

	for (const suggestion of suggestions) {
		const wantedBy = suggestion.wantedBy.reduce<NextAlbumDemandView[]>(
			(demands, demand) => {
				const collection = byUid.get(demand.collectionUid);

				return collection
					? [
							...demands,
							{
								name: collection.name,
								slug: collection.slug,
								missing: demand.missing,
							},
						]
					: demands;
			},
			[]
		);

		if (!wantedBy.length) {
			continue;
		}

		const completes = suggestion.completesCollectionUids
			.map(named)
			.filter((name): name is string => !!name);

		views.push({
			albumUid: suggestion.album.albumUid,
			albumName: suggestion.album.albumName,
			artistName: suggestion.album.artistName,
			year: suggestion.album.year,
			coverUrl: suggestion.album.coverUrl,
			/*
			 * Points are claimed only where the collection they come from can
			 * be named: "completes" with nothing after it is worse than the
			 * quieter promise of moving closer.
			 */
			unlockedPoints: completes.length ? suggestion.unlockedPoints : 0,
			completes,
			potentialPoints: suggestion.potentialPoints,
			wantedBy,
		});

		if (views.length === limit) {
			break;
		}
	}

	return views;
}
