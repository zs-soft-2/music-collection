/**
 * Which part of the collector's life the page belongs to. The menu used to
 * be sorted by one thing only — whether the page needs a signed-in user —
 * which is a fact about the route, not a reason anybody opens it. Grouping
 * by intent is what lets the account menu be read instead of scanned.
 *
 * `general` is the odd one out: it carries no heading, for the pages that
 * stand on their own above the groups.
 */
export type MenuGroup = 'general' | 'collection' | 'explore' | 'contribute';

export type MenuItem = {
	/**
	 * The link's text, as a key into the dictionary (`nav.home`) rather than
	 * as words. The icon used to be looked up by the words themselves, which
	 * only worked while there was one language — and not even then: the
	 * "My Collection" link never matched the "Collection" icon.
	 */
	labelKey: string;
	/** PrimeIcons class, e.g. `pi-home`. */
	icon: string;
	routerLink: string[];
	group: MenuGroup;
	/**
	 * The page only means something to a signed-in collector — it either
	 * shows what is theirs, or takes something of theirs. A guest never sees
	 * the link, and `authenticatedGuard` turns them away from the route.
	 */
	requiresAuth?: boolean;
};

/** A run of links under one heading, or under none for `general`. */
export type MenuSection = {
	group: MenuGroup;
	/** `null` for `general`, which is shown without a heading. */
	titleKey: string | null;
	items: MenuItem[];
};
