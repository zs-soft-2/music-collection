import { CollectionCardView } from '../collections/collections.model';
import { CollectionCrowd } from '../collectors/collectors.model';

/**
 * What the home page is about: the collections, and the people on them.
 *
 * The page opens on one collection — the week's — then on who is collecting
 * here, then on the collections themselves. Everything else the catalog can
 * show is below that, so the first screen answers what this app is for
 * rather than how big the catalog is.
 */

/** One collection as the home grid draws it. */
export interface CollectionTileView
	extends CollectionCardView, CollectionCrowd {
	/** The collector picked it: the star on `/collections`. */
	followed: boolean;
}

/**
 * One collection as the big card draws it — the panel the page opens on.
 *
 * The chips are what its rule asks for in a few words — a style, the years
 * it covers — taken from the definition rather than written by hand.
 */
export interface CollectionBigCardView extends CollectionTileView {
	chips: string[];
}

/** Which collections the home grid shows. */
export type HomeCollectionTab =
	'mine' | 'curated' | 'discography' | 'completed';

/** One tab of the grid, with how many stand behind it. */
export interface HomeCollectionTabView {
	value: HomeCollectionTab;
	labelKey: string;
	count: number;
}

export const HOME_COLLECTION_TABS: {
	value: HomeCollectionTab;
	labelKey: string;
}[] = [
	{ value: 'mine', labelKey: 'home.collections.tab.mine' },
	{ value: 'curated', labelKey: 'home.collections.tab.curated' },
	{ value: 'discography', labelKey: 'home.collections.tab.discography' },
	{ value: 'completed', labelKey: 'home.collections.tab.completed' },
];

/**
 * How many collections the big card can be turned to.
 *
 * The week's one is the first of them and stays the one being talked about;
 * the others are there because a reader who does not care for this week's
 * set should be able to move on without leaving the page. Few enough that
 * the dots can be counted at a glance.
 */
export const HOME_HERO_CARDS = 5;

/** How many collection tiles the grid shows before "all" takes over. */
export const HOME_COLLECTION_TILES = 6;

/** How many collectors the page introduces by name. */
export const HOME_COLLECTOR_CARDS = 3;

/** How many badges and hunts fit on a collector's card before it counts. */
export const HOME_COLLECTOR_PINS = 3;

/** How many styles of the rule reach the hero's chips. */
export const HOME_CHIP_STYLES = 2;
