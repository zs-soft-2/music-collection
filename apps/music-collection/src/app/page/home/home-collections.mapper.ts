import {
	MusicCollectionCriteria,
	NumberCriterion,
} from '@music-collection/domain/music-collection/api';
import { MusicCollectionStanding } from '@music-collection/domain/music-collection/core';

import { CollectionCardView } from '../collections/collections.model';
import { CollectionCrowd } from '../collectors/collectors.model';

import {
	HOME_CHIP_STYLES,
	HOME_COLLECTION_TABS,
	CollectionBigCardView,
	CollectionTileView,
	HomeCollectionTab,
	HomeCollectionTabView,
} from './home.model';

/**
 * The collections as the home page arranges them: the cards the collections
 * page already builds, with who is on each of them, and one of them picked
 * out as the week's.
 *
 * Nothing is resolved here — membership, progress and score all come from
 * the engine through `toCollectionCard`, and the directory says who stands
 * on what. This only decides what is shown and in which order.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function emptyCrowd(): CollectionCrowd {
	return { finishers: [], finisherCount: 0, hunters: [], hunterCount: 0 };
}

/** The cards with the collector's pick and the faces on them. */
export function toCollectionTiles(
	cards: readonly CollectionCardView[],
	crowds: ReadonlyMap<string, CollectionCrowd>,
	followed: ReadonlySet<string>
): CollectionTileView[] {
	return cards.map((card) => ({
		...card,
		...(crowds.get(card.slug) ?? emptyCrowd()),
		followed: followed.has(card.uid),
	}));
}

function onTab(tile: CollectionTileView, tab: HomeCollectionTab): boolean {
	switch (tab) {
		// What the collector took on: the ones they starred, and the ones
		// their shelf already reaches into even without starring them.
		case 'mine':
			return tile.followed || tile.owned > 0;
		case 'curated':
			return tile.group === null;
		case 'discography':
			return tile.group === 'discography';
		default:
			return tile.completed;
	}
}

/** The tiles of one tab, the nearest to finished first. */
export function filterCollectionTiles(
	tiles: readonly CollectionTileView[],
	tab: HomeCollectionTab,
	limit: number
): CollectionTileView[] {
	return tiles.filter((tile) => onTab(tile, tab)).slice(0, limit);
}

/**
 * The tabs with what stands behind each. A tab with nothing on it is left
 * out rather than offered as an empty grid — a visitor who collects nothing
 * yet is shown the curated list first.
 */
export function toCollectionTabs(
	tiles: readonly CollectionTileView[]
): HomeCollectionTabView[] {
	return HOME_COLLECTION_TABS.map(({ value, labelKey }) => ({
		value,
		labelKey,
		count: tiles.filter((tile) => onTab(tile, value)).length,
	})).filter((tab) => tab.count > 0);
}

/** The years the rule asks for, as the chip writes them. */
function toYearChip(years: NumberCriterion | undefined): string | null {
	if (!years) {
		return null;
	}

	if (years.equals) {
		return `${years.equals}`;
	}

	if (years.from && years.to) {
		return `${years.from}–${years.to}`;
	}

	return years.from ? `${years.from}–` : years.to ? `–${years.to}` : null;
}

/**
 * What the rule asks for, in a few words: the styles it names and the years
 * it covers. A collection defined by a list of artists has neither, and gets
 * no chips rather than a made-up line.
 */
export function toCollectionChips(
	criteria: MusicCollectionCriteria | undefined
): string[] {
	if (!criteria) {
		return [];
	}

	const styles =
		criteria.styles?.includesAny ??
		criteria.styles?.includesAll ??
		criteria.artistStyles?.includesAny ??
		[];
	const years = toYearChip(criteria.years);

	return [...styles.slice(0, HOME_CHIP_STYLES), ...(years ? [years] : [])];
}

/**
 * The collection of the week.
 *
 * It rotates on the week rather than on chance: a hero that changed on every
 * reload would be a slot machine, and the point of naming one collection is
 * that it stays named long enough to be talked about. Everybody sees the
 * same one in the same week, and whose shelf it is drawn against is what
 * differs.
 *
 * Only the curated collections stand for it — there is a pair of
 * discographies for every band the catalog knows, and a hero picked out of
 * those would be a different band's back catalog every week and nothing
 * anyone chose.
 */
export function pickCollectionOfTheWeek(
	tiles: readonly CollectionTileView[],
	standings: readonly MusicCollectionStanding[],
	now: number
): CollectionBigCardView | null {
	const candidates = [...tiles]
		.filter((tile) => tile.group === null && tile.total > 0)
		.sort((one, other) => one.slug.localeCompare(other.slug));

	if (!candidates.length) {
		return null;
	}

	const week = Math.floor(now / WEEK_MS);

	return dressBigCard(candidates[week % candidates.length], standings);
}

/** One tile with what its rule asks for, as the big card reads it. */
export function dressBigCard(
	tile: CollectionTileView,
	standings: readonly MusicCollectionStanding[]
): CollectionBigCardView {
	const standing = standings.find(
		(found) => found.collection.slug === tile.slug
	);

	return { ...tile, chips: toCollectionChips(standing?.collection.criteria) };
}

/** A collection already taken on comes before one nobody here collects. */
function heroRank(tile: CollectionTileView): number {
	return tile.followed || tile.owned > 0 ? 0 : 1;
}

/**
 * What the big card can be turned to, the week's collection first.
 *
 * The week's one is still the one the page opens on and the one being
 * talked about — it does not move until the week does. The others are there
 * because a reader the week's set says nothing to should be able to turn
 * the card rather than leave the page: the collections this shelf is
 * already on come first, the nearest to finishing before the rest.
 */
export function pickHeroCollections(
	tiles: readonly CollectionTileView[],
	standings: readonly MusicCollectionStanding[],
	now: number,
	limit: number
): CollectionBigCardView[] {
	const weekly = pickCollectionOfTheWeek(tiles, standings, now);

	if (!weekly || limit < 1) {
		return [];
	}

	const rest = [...tiles]
		.filter(
			(tile) =>
				tile.group === null &&
				tile.total > 0 &&
				tile.slug !== weekly.slug
		)
		.sort(
			(one, other) =>
				heroRank(one) - heroRank(other) ||
				other.percentage - one.percentage ||
				one.name.localeCompare(other.name)
		)
		.slice(0, limit - 1)
		.map((tile) => dressBigCard(tile, standings));

	return [weekly, ...rest];
}
