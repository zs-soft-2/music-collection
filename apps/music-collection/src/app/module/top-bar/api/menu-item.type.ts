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
	/**
	 * The page only means something to a signed-in collector — it either
	 * shows what is theirs, or takes something of theirs. A guest never sees
	 * the link, and `authenticatedGuard` turns them away from the route.
	 */
	requiresAuth?: boolean;
};
