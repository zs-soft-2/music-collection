import {
	BadgeDefinition,
	MusicCollectionCriteria,
	NextAlbumSuggestion,
} from '@music-collection/domain/music-collection/api';
import { MusicCollectionStanding } from '@music-collection/domain/music-collection/core';

import {
	COVER_POOL_SIZE,
	AlbumSort,
	CollectionAlbumView,
	CollectionBadgeView,
	CollectionCardListView,
	CollectionCardView,
	CollectionDecadeView,
	CollectionGroupView,
	CollectionDetailView,
	CollectionRuleRow,
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

/**
 * The covers the card draws its mosaic from. The first four are the four
 * tiles; the rest are what a moving mosaic turns over to, and cost nothing
 * until one is asked for.
 */
function toCovers(standing: MusicCollectionStanding): string[] {
	const covers: string[] = [];

	for (const album of standing.resolved.albums) {
		if (album.coverUrl) {
			covers.push(album.coverUrl);

			if (covers.length === COVER_POOL_SIZE) {
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
		// A definition written before the field existed has no group.
		group: collection.group ?? null,
	};
}

/**
 * The cards under their headings, the curated list first.
 *
 * A heading per shelf rather than one long grid: a band's discography is
 * looked up, not browsed, and there are two of them for every band the
 * catalog knows two studio albums of — enough to push the curated
 * collections off the screen. A shelf with nothing on it is left out, so a
 * collector who follows no discography sees the page exactly as before.
 */
export function toCollectionGroups(
	cards: CollectionCardListView[]
): CollectionGroupView[] {
	const groups: CollectionGroupView[] = [
		{
			group: null,
			labelKey: 'page.collections.group.curated',
			leadKey: 'page.collections.group.curatedLead',
			collections: [],
		},
		{
			group: 'discography',
			labelKey: 'page.collections.group.discography',
			leadKey: 'page.collections.group.discographyLead',
			collections: [],
		},
	];

	for (const card of cards) {
		(
			groups.find(({ group }) => group === card.group) ?? groups[0]
		).collections.push(card);
	}

	return groups.filter(({ collections }) => collections.length > 0);
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

/** A line of the rule, left out when the criterion names nothing. */
function ruleRow(
	labelKey: string,
	values: readonly (string | undefined)[] | undefined,
	excluded = false
): CollectionRuleRow[] {
	const named = (values ?? []).filter((value): value is string => !!value);

	return named.length
		? [{ labelKey, values: named, ...(excluded ? { excluded } : {}) }]
		: [];
}

/** The years the rule asks for, written the way a chip can carry them. */
function ruleYears(criteria: MusicCollectionCriteria): string | undefined {
	const years = criteria.years;

	if (!years) {
		return undefined;
	}

	if (years.equals) {
		return `${years.equals}`;
	}

	if (years.from && years.to) {
		return `${years.from}–${years.to}`;
	}

	return years.from
		? `${years.from}–`
		: years.to
			? `–${years.to}`
			: undefined;
}

/**
 * What the rule asks for, line by line.
 *
 * A collection is a rule, and the rule is the most interesting thing about
 * it: it says why these records and not others, and it is what makes the
 * set grow by itself as the catalog does. The page says it in the rule's
 * own words — the style names, the years, the bands — rather than in the
 * criteria object's.
 *
 * The bands are named by uid in the rule and by name in what it resolved
 * to, so the records themselves are what the names come from. A band whose
 * records are all gone from the catalog cannot be named, and is counted
 * rather than invented.
 */
export function toCollectionRule(
	criteria: MusicCollectionCriteria | undefined,
	albums: readonly CollectionAlbumView[] = []
): CollectionRuleRow[] {
	if (!criteria) {
		return [];
	}

	const named = new Map(
		albums.map((album) => [album.artistUid, album.artistName])
	);
	const artists = criteria.artists?.includesAny ?? [];
	const unnamed = artists.filter((uid) => !named.has(uid)).length;

	return [
		...ruleRow('ui.collectionDetailPage.rule.years', [ruleYears(criteria)]),
		...ruleRow(
			'ui.collectionDetailPage.rule.styles',
			criteria.styles?.includesAny
		),
		...ruleRow(
			'ui.collectionDetailPage.rule.allStyles',
			criteria.styles?.includesAll
		),
		...ruleRow(
			'ui.collectionDetailPage.rule.artistStyles',
			criteria.artistStyles?.includesAny ??
				criteria.artistStyles?.includesAll
		),
		...ruleRow(
			'ui.collectionDetailPage.rule.artists',
			artists
				.map((uid) => named.get(uid))
				.filter((name): name is string => !!name)
		),
		...ruleRow(
			'ui.collectionDetailPage.rule.moreArtists',
			unnamed ? [`${unnamed}`] : []
		),
		...ruleRow(
			'ui.collectionDetailPage.rule.formats',
			criteria.albumFormats?.includesAny
		),
		...ruleRow(
			'ui.collectionDetailPage.rule.countries',
			criteria.artistCountries?.includesAny
		),
		...ruleRow(
			'ui.collectionDetailPage.rule.roles',
			criteria.credits?.roles
		),
		...ruleRow(
			'ui.collectionDetailPage.rule.musicians',
			criteria.credits?.musicians?.length
				? [`${criteria.credits.musicians.length}`]
				: []
		),
		...ruleRow(
			'ui.collectionDetailPage.rule.notStyles',
			criteria.styles?.excludes,
			true
		),
		...ruleRow(
			'ui.collectionDetailPage.rule.notArtistStyles',
			criteria.artistStyles?.excludes,
			true
		),
	];
}

/**
 * The collection across the decades, and how much of each is on the shelf.
 *
 * It answers a question the counts cannot: where the gap is. A collector
 * two thirds of the way through a set usually has the famous decade and
 * none of the one before it, and that is the trip to the shop worth making.
 *
 * A record the catalog has no year for stands in no decade rather than in a
 * made-up one — the bar says what is known.
 */
export function toCollectionDecades(
	albums: readonly CollectionAlbumView[]
): CollectionDecadeView[] {
	const decades = new Map<number, { total: number; owned: number }>();

	for (const album of albums) {
		if (album.year === null) {
			continue;
		}

		const decade = Math.floor(album.year / 10) * 10;
		const entry = decades.get(decade) ?? { total: 0, owned: 0 };

		entry.total += 1;

		if (album.owned) {
			entry.owned += 1;
		}

		decades.set(decade, entry);
	}

	const fullest = Math.max(1, ...[...decades.values()].map((d) => d.total));

	return [...decades.entries()]
		.sort(([one], [other]) => one - other)
		.map(([decade, entry]) => ({
			label: `${decade}s`,
			short: `'${`${decade}`.slice(2)}`,
			total: entry.total,
			owned: entry.owned,
			share: Math.round((entry.owned / entry.total) * 100),
			height: Math.round((entry.total / fullest) * 100),
		}));
}

/**
 * The records in the order the reader asked for. By year is the collection
 * telling its own story, which is why it is the one the page opens with;
 * the other two are for finding one record among a hundred.
 */
export function sortCollectionAlbums(
	albums: readonly CollectionAlbumView[],
	sort: AlbumSort
): CollectionAlbumView[] {
	const byName = (one: CollectionAlbumView, other: CollectionAlbumView) =>
		one.albumName.localeCompare(other.albumName);

	return [...albums].sort((one, other) => {
		switch (sort) {
			case 'year':
				return (
					(one.year ?? 0) - (other.year ?? 0) || byName(one, other)
				);
			case 'artist':
				return (
					one.artistName.localeCompare(other.artistName) ||
					(one.year ?? 0) - (other.year ?? 0)
				);
			default:
				return byName(one, other);
		}
	});
}
