export type MenuItem = {
	label: string;
	routerLink: string[];
	/**
	 * The page only means something to a signed-in collector — it either
	 * shows what is theirs, or takes something of theirs. A guest never sees
	 * the link, and `authenticatedGuard` turns them away from the route.
	 */
	requiresAuth?: boolean;
};
