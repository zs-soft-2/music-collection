import { Translator } from '@music-collection/core/i18n';

/** One step of the trail. Without a `link` it is the page we are on. */
export interface Crumb {
	label: string;
	link?: string | unknown[];
	/** Kept on the link, so a step up is read where this page was read. */
	queryParams?: Record<string, string>;
}

/**
 * A page's trail: the front page, then the pages this one sits *inside*, then
 * the page itself.
 *
 * Only a page that genuinely contains this one may be a step — either an
 * address this page's own address is under (`/collection` for a copy), or the
 * record it is part of (the artist of an album, the album of a pressing).
 * Where the reader happened to come from is a different question, and it is
 * the Back control that answers it; letting it into the trail is what made
 * every artist look as though it lived in the collection.
 *
 * Steps that are not known yet are passed as `null` and left out, so a trail
 * can be drawn before the page has its name.
 */
export function pageTrail(
	t: Translator,
	steps: readonly (Crumb | null | undefined | false)[]
): Crumb[] {
	return [
		{ label: t('nav.home'), link: '/home' },
		...steps.filter((step): step is Crumb => !!step),
	];
}

/**
 * The page this one sits in: the last step that leads somewhere, the page
 * itself left out. Where Back goes when there is no visit behind the page.
 */
export function parentCrumb(trail: readonly Crumb[]): Crumb | null {
	for (let index = trail.length - 2; index >= 0; index--) {
		if (trail[index].link) {
			return trail[index];
		}
	}

	return null;
}
