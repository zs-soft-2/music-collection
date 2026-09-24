import { Translator } from '@music-collection/core/i18n';

import { Crumb } from '../page-breadcrumb';

/**
 * The query parameter a detail page is opened with to say where it was
 * opened from: `?from=collection:bay-area-thrash`. It is in the URL rather
 * than in memory so the trail survives a reload, a bookmark and a link sent
 * to someone else — the page is then still read where it was read from.
 */
export const PAGE_ORIGIN_PARAM = 'from';

const COLLECTION_PREFIX = 'collection:';

/** The value that opens a page as part of a collection. */
export function collectionOrigin(slug: string): string {
	return `${COLLECTION_PREFIX}${slug}`;
}

/** The query parameters that carry a collection origin on to a link. */
export function collectionOriginParams(
	slug: string | null
): Record<string, string> | undefined {
	return slug ? { [PAGE_ORIGIN_PARAM]: collectionOrigin(slug) } : undefined;
}

/** The collection slug of an origin, or null when it names something else. */
export function collectionOriginSlug(origin: string | null): string | null {
	return origin?.startsWith(COLLECTION_PREFIX)
		? origin.slice(COLLECTION_PREFIX.length) || null
		: null;
}

/**
 * The steps up to a collection a page was opened from. The name joins once
 * it is known, so the trail never shows a wrong step while it loads.
 */
export function collectionTrail(
	slug: string | null,
	name: string | null,
	/** The app's own word for the first crumb; the rest is the data's. */
	t: Translator
): Crumb[] {
	if (!slug) {
		return [];
	}

	return [
		{ label: t('nav.collections'), link: '/collections' },
		...(name ? [{ label: name, link: ['/collections', slug] }] : []),
	];
}
