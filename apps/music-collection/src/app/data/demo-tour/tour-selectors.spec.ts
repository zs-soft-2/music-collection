import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { pageTours } from './tours.script';

/**
 * The page each walkthrough talks about, as markup.
 *
 * A stop points at a selector, and a selector that finds nothing fails the
 * step and ends the run — in front of whoever pressed the launcher. Nothing
 * in a running app catches that: the page has to be open, signed in, with the
 * right records on it. So the templates are read instead, and every class, id
 * and component a stop names has to be one the page actually draws.
 *
 * The home page is read together with the shell, because two of its stops
 * point at the bar that carries every page.
 */
const PAGES: Record<string, string[]> = {
	'home-guest': [
		'page/home/home-page.component.html',
		'module/top-bar',
		'app.component.html',
	],
	'home-collector': [
		'page/home/home-page.component.html',
		'module/top-bar',
		'app.component.html',
	],
	'page-collection': ['page/collection/collection-page.component.html'],
	'page-copy': ['page/collection-item/collection-item-page.component.html'],
	'page-scan': ['page/scan/scan-page.component.html'],
	'page-shelfScan': ['page/shelf-scan/shelf-scan-page.component.html'],
	'page-wishlist': [
		'page/wishlist/component/page/wishlist-page.component.html',
	],
	'page-wishlistItem': [
		'page/wishlist-item/wishlist-item-page.component.html',
	],
	'page-radio': ['page/radio/radio-page.component.html'],
	'page-dailyQuestion': [
		'page/daily-question/daily-question-page.component.html',
	],
	'page-map': ['page/map/map-page.component.html'],
	'page-requests': ['page/my-request/my-request-page.component.html'],
	'page-bands': ['page/owned-artist/list/owned-artist-list.component.html'],
	'page-profile': ['page/profile/profile-page.component.html'],
	'page-challenges': ['page/collections/collections-page.component.html'],
	'page-challenge': [
		'page/collections/collection-detail-page.component.html',
	],
	'page-upcoming': ['page/upcoming/upcoming-page.component.html'],
	'page-network': ['page/network/network-page.component.html'],
	'page-artist': ['page/artist/artist-page.component.html'],
	'page-album': ['page/album/album-page.component.html'],
	'page-track': ['page/track/track-page.component.html'],
	'page-release': ['page/release/release-page.component.html'],
	'page-label': ['page/label/label-page.component.html'],
	'page-musician': ['page/musician/musician-page.component.html'],
};

/** A template, or every template under a folder of components. */
function markupOf(where: string): string {
	const path = join(__dirname, '../..', where);

	if (where.endsWith('.html')) {
		return readFileSync(path, 'utf-8');
	}

	// A folder: the component templates in it, inline ones included, which is
	// where the top bar keeps its own markup.
	return readdirDeep(path)
		.filter((file) => file.endsWith('.html') || file.endsWith('.ts'))
		.map((file) => readFileSync(file, 'utf-8'))
		.join('\n');
}

function readdirDeep(path: string): string[] {
	return readdirSync(path).flatMap((entry) => {
		const full = join(path, entry);

		return statSync(full).isDirectory() ? readdirDeep(full) : [full];
	});
}

/** What a template draws: its classes, its ids and the elements it uses. */
function drawnBy(markup: string): Set<string> {
	const drawn = new Set<string>();
	const add = (word: string): void => {
		if (word && !word.includes('{{')) {
			drawn.add(word);
		}
	};

	for (const [, value] of markup.matchAll(/\bclass="([^"]*)"/g)) {
		value.split(/\s+/).forEach(add);
	}
	for (const [, value] of markup.matchAll(/\[class\.([\w-]+)\]/g)) {
		add(value);
	}
	for (const [, value] of markup.matchAll(/\bid="([\w-]+)"/g)) {
		add(value);
	}
	for (const [, value] of markup.matchAll(/<([a-z][\w-]*)/g)) {
		add(value);
	}

	return drawn;
}

/**
 * The ids a template builds rather than spells out: `[id]="'mc-tab-' + x"`.
 *
 * A row in an `@for` cannot write its own id down, so the page never contains
 * the whole word and reading the markup for it would find nothing. What is
 * literal is the front of it, and that is enough: a stop naming
 * `#mc-profile-tab-data` is pointing at something this loop draws, and a stop
 * naming an id with no such beginning is not.
 */
function builtBy(markup: string): string[] {
	return [...markup.matchAll(/\[(?:attr\.)?id\]="'([\w-]+)'\s*\+/g)].map(
		([, start]) => start
	);
}

/** The classes, ids and elements one selector names. */
function named(selector: string): string[] {
	return [
		...[...selector.matchAll(/\.([\w-]+)/g)].map(([, word]) => word),
		...[...selector.matchAll(/#([\w-]+)/g)].map(([, word]) => word),
		...[...selector.matchAll(/aria-labelledby="([\w-]+)"/g)].map(
			([, word]) => word
		),
		...[...selector.matchAll(/(?:^|[\s>])([a-z][\w-]*)/g)].map(
			([, word]) => word
		),
	];
}

const tours = pageTours.map((tour): [string, string, string[]] => [
	tour.script.id,
	tour.script.id,
	tour.script.steps.map((step) => step.highlight?.selector ?? ''),
]);

describe('what the stops point at', () => {
	it('knows which page every walkthrough is about', () => {
		const strangers = pageTours
			.map((tour) => tour.script.id)
			.filter((id) => !PAGES[id]);

		expect(strangers).toEqual([]);
	});

	describe.each(tours)('%s', (id, _name, selectors) => {
		const markup = (PAGES[id] ?? []).map(markupOf);
		const page = new Set(markup.flatMap((one) => [...drawnBy(one)]));
		const built = markup.flatMap(builtBy);

		/** Whether the page draws this class, id or element. */
		const draws = (word: string): boolean =>
			page.has(word) || built.some((start) => word.startsWith(start));

		it('points at nothing the page does not draw', () => {
			// A comma selector is a stop with a fallback: one of the two has
			// to be on the page, not both.
			const lost = selectors.filter(
				(selector) =>
					!selector.split(',').some((one) => named(one).every(draws))
			);

			expect(lost).toEqual([]);
		});
	});
});
