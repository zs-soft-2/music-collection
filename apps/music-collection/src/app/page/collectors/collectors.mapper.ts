import {
	CollectorCardDocument,
	clipText,
	listOf,
	pictureUrl,
	positiveNumber,
	wholeNumber,
} from '../../data/collector-profile';
import { countryName } from '../../data/user-location';
import { NAME_MAX } from '../collector/collector.model';

import { MusicCollectionEntity } from '@music-collection/domain/music-collection/api';

import {
	WALL_FACES,
	WALL_FILTER_LIMIT,
	WallBadge,
	WallCollection,
	WallCollectionCard,
	WallEntry,
	WallHighlight,
	WallSort,
} from './collectors.model';

/**
 * From the published directory onto the wall.
 *
 * Same border post as the collector's own page — the entries were written by
 * collectors' browsers and the rules cannot look inside their lists — and the
 * same three outcomes for anything that arrives in one.
 */

function toBadges(entry: CollectorCardDocument): WallBadge[] {
	return listOf(entry.badges)
		.map((value) => {
			const badge = value as Record<string, unknown>;

			return {
				slug: clipText(badge['slug'], 120),
				name: clipText(badge['name'], NAME_MAX),
				imageUrl: pictureUrl(badge['imageUrl']),
				points: wholeNumber(badge['points']) ?? 0,
			};
		})
		.filter((badge) => !!badge.slug && !!badge.name);
}

function toPlace(entry: CollectorCardDocument): string | null {
	const code = clipText(entry.countryCode, 2);
	const city = clipText(entry.city, 60);

	if (!code) {
		return city || null;
	}

	return city ? `${city}, ${countryName(code)}` : countryName(code);
}

export function toWallEntries(
	documents: readonly CollectorCardDocument[]
): WallEntry[] {
	return (
		documents
			.map((entry) => {
				const displayName =
					clipText(entry.displayName, NAME_MAX) || null;

				return {
					uid: clipText(entry.uid, 200),
					displayName,
					photoURL: pictureUrl(entry.photoURL),
					initial: (displayName ?? '?').charAt(0).toUpperCase(),
					place: toPlace(entry),
					copies: wholeNumber(entry.copies) ?? 0,
					points: positiveNumber(entry.points) ?? 0,
					badges: toBadges(entry),
					collecting: listOf(entry.collecting)
						.map((slug) => clipText(slug, 120))
						.filter(Boolean),
					hasPage: entry.hasPage === true,
					updatedAt: wholeNumber(entry.updatedAt) ?? 0,
				};
			})
			// An entry with no uid leads nowhere, and the wall is made of links.
			.filter((entry) => !!entry.uid)
	);
}

/**
 * The collections anybody on the wall has finished, the most finished first.
 *
 * This is the filter row, and it is built out of the wall itself rather than
 * from the catalog: a collection nobody has completed would be a filter that
 * empties the page.
 */
export function toWallCollections(
	entries: readonly WallEntry[]
): WallCollection[] {
	const found = new Map<string, WallCollection>();

	for (const entry of entries) {
		for (const badge of entry.badges) {
			const seen = found.get(badge.slug);

			if (seen) {
				seen.collectors += 1;
				seen.imageUrl = seen.imageUrl ?? badge.imageUrl;
			} else {
				found.set(badge.slug, {
					slug: badge.slug,
					name: badge.name,
					imageUrl: badge.imageUrl,
					collectors: 1,
				});
			}
		}
	}

	return [...found.values()]
		.sort(
			(one, other) =>
				other.collectors - one.collectors ||
				one.name.localeCompare(other.name)
		)
		.slice(0, WALL_FILTER_LIMIT);
}

/** Everybody who finished that collection; everybody, where none is named. */
export function filterWall(
	entries: readonly WallEntry[],
	slug: string | null,
	query: string
): WallEntry[] {
	const needle = query.trim().toLocaleLowerCase();

	return entries.filter(
		(entry) =>
			(!slug ||
				entry.badges.some((badge) => badge.slug === slug) ||
				entry.collecting.includes(slug)) &&
			(!needle ||
				(entry.displayName ?? '')
					.toLocaleLowerCase()
					.includes(needle) ||
				(entry.place ?? '').toLocaleLowerCase().includes(needle) ||
				entry.badges.some((badge) =>
					badge.name.toLocaleLowerCase().includes(needle)
				))
	);
}

export function sortWall(
	entries: readonly WallEntry[],
	sort: WallSort
): WallEntry[] {
	const byName = (one: WallEntry, other: WallEntry) =>
		(one.displayName ?? '').localeCompare(other.displayName ?? '');

	/**
	 * Whoever finished something comes first, whatever order was asked for.
	 * This is a wall about finishing collections, and a collector who has
	 * finished none has nothing to show on it — they are here because they
	 * share a page, which is worth the last row rather than the first.
	 */
	const byFinished = (one: WallEntry, other: WallEntry) =>
		Number(other.badges.length > 0) - Number(one.badges.length > 0);

	const order = (one: WallEntry, other: WallEntry): number => {
		switch (sort) {
			case 'badges':
				return other.badges.length - one.badges.length;
			case 'points':
				return other.points - one.points;
			case 'shelf':
				return other.copies - one.copies;
			case 'name':
				return 0;
			default:
				return other.updatedAt - one.updatedAt;
		}
	};

	return [...entries].sort(
		(one, other) =>
			byFinished(one, other) || order(one, other) || byName(one, other)
	);
}

/**
 * The newest finished collections, one per collector before anybody gets a
 * second one.
 *
 * A collector who finished four collections last night would otherwise fill
 * the row by themselves, and a row of four badges belonging to one person
 * says far less than four people do.
 */
export function toWallHighlights(
	entries: readonly WallEntry[],
	count: number
): WallHighlight[] {
	const highlights: WallHighlight[] = [];

	for (let round = 0; highlights.length < count && round < 3; round += 1) {
		for (const entry of entries) {
			const badge = entry.badges[round];

			if (badge && highlights.length < count) {
				highlights.push({
					uid: entry.uid,
					displayName: entry.displayName,
					photoURL: entry.photoURL,
					initial: entry.initial,
					badge,
				});
			}
		}
	}

	return highlights;
}

/**
 * Every published collection, with the faces of whoever finished it.
 *
 * This is the other way round from the wall of collectors, and the reason the
 * page offers both: a collection nobody has finished is still worth naming —
 * it is the one somebody might go and finish — while the wall of collectors
 * can only ever show what is already done.
 *
 * The definitions are catalog documents, written by the callable and nobody
 * else, so they are read as they are; the faces come from the directory and
 * have already been through the border post above.
 */
export function toWallCollectionCards(
	definitions: readonly MusicCollectionEntity[],
	entries: readonly WallEntry[]
): WallCollectionCard[] {
	const finishers = new Map<string, WallFinisherList>();
	const hunters = new Map<string, WallFinisherList>();

	const add = (
		into: Map<string, WallFinisherList>,
		slug: string,
		entry: WallEntry
	): void => {
		const found = into.get(slug) ?? { faces: [], count: 0 };

		found.count += 1;

		if (found.faces.length < WALL_FACES) {
			found.faces.push({
				uid: entry.uid,
				displayName: entry.displayName,
				photoURL: entry.photoURL,
				initial: entry.initial,
			});
		}

		into.set(slug, found);
	};

	for (const entry of entries) {
		for (const badge of entry.badges) {
			add(finishers, badge.slug, entry);
		}

		// Following a collection is private; showing it is the collector
		// saying they are after it, and this is where that is heard.
		for (const slug of entry.collecting) {
			add(hunters, slug, entry);
		}
	}

	return definitions
		.map((definition) => {
			const found = finishers.get(definition.slug);
			const after = hunters.get(definition.slug);

			return {
				slug: definition.slug,
				name: definition.name,
				description: definition.description,
				icon: definition.icon,
				imageUrl:
					definition.badge?.image?.filePath ??
					definition.badge?.artworkUrl ??
					definition.coverImageUrl,
				group: definition.group ?? null,
				finishers: found?.faces ?? [],
				finisherCount: found?.count ?? 0,
				hunters: after?.faces ?? [],
				hunterCount: after?.count ?? 0,
			};
		})
		.sort(
			(one, other) =>
				// The curated collections first: there is a pair of
				// discographies per band, and they would bury them.
				Number(!!one.group) - Number(!!other.group) ||
				// Then whichever has somebody on it at all, finished or being
				// chased: a collection with a face on it is the one a visitor
				// can see the point of.
				other.finisherCount +
					other.hunterCount -
					(one.finisherCount + one.hunterCount) ||
				one.name.localeCompare(other.name)
		);
}

interface WallFinisherList {
	faces: WallCollectionCard['finishers'];
	count: number;
}
