import { readFileSync } from 'fs';
import { join } from 'path';

import { DemoScript } from '@zssz-soft/demo-autopilot-core';
import { Route } from '@angular/router';

import { routes } from '../../app-routing';
import {
	COLLECTOR_TOUR_ID,
	GUEST_TOUR_ID,
	PageTour,
	pageTours,
	tourFor,
} from './tours.script';

/**
 * The dictionaries, read rather than imported: the files belong to the i18n
 * library rather than to the app, and a relative import across that line is
 * what the module boundaries forbid.
 */
const dictionaries = ['hu', 'en', 'de'].map(
	(language) =>
		[
			language,
			JSON.parse(
				readFileSync(
					join(
						__dirname,
						`../../../../../../libs/core/i18n/assets/i18n/${language}.json`
					),
					'utf-8'
				)
			) as Record<string, unknown>,
		] as const
);

/** The value at `tour.pages.scan.intro.title`, or undefined. */
function valueAt(dictionary: Record<string, unknown>, key: string): unknown {
	return key
		.split('.')
		.reduce<unknown>(
			(node, part) =>
				(node as Record<string, unknown> | undefined)?.[part],
			dictionary
		);
}

const segments = (path: string): string[] => path.split('/').filter(Boolean);

/** Whether a route's path is the tour's, segment for segment. */
function same(route: Route, path: string): boolean {
	const declared = segments(route.path ?? '');
	const wanted = segments(path);

	return (
		declared.length === wanted.length &&
		declared.every((part, at) => part === wanted[at])
	);
}

/**
 * The route the app has for the page a walkthrough belongs to.
 *
 * A page under a lazily loaded branch — the wishlist's own module, the bands'
 * routes — is answered by the branch itself: the children are not there to
 * be read without loading them, and what matters here is that the app has
 * somewhere for that address to go.
 */
function routeOf(tour: PageTour): Route | undefined {
	return routes.find(
		(route) =>
			same(route, tour.path) ||
			(!!route.loadChildren &&
				segments(tour.path)[0] === segments(route.path ?? '')[0])
	);
}

/**
 * The walkthroughs are played against the running app, so nothing here can be
 * checked by running them: a renamed section, a missing dictionary key or a
 * page the app no longer has would only show up as a tour that dies halfway
 * through, in front of whoever was being shown around.
 */
describe('tours', () => {
	it('gives every page one walkthrough, and the home page two', () => {
		const paths = pageTours.map((tour) => tour.path);
		const twice = paths.filter((path, at) => paths.indexOf(path) !== at);

		expect(twice).toEqual(['home']);
	});

	it('talks about a page the app has', () => {
		const strangers = pageTours
			.filter((tour) => !routeOf(tour))
			.map((tour) => tour.path);

		expect(strangers).toEqual([]);
	});

	/**
	 * The home page is two pages, and the walkthroughs say different things —
	 * one ends at the way in, the other at the collector's own menu.
	 */
	it('tells the visiting home page from the collecting one', () => {
		expect(tourFor('/home', false)?.id).toBe(GUEST_TOUR_ID);
		expect(tourFor('/home', true)?.id).toBe(COLLECTOR_TOUR_ID);
	});

	/** One walkthrough per page, whichever record the page is drawing. */
	it('answers for a page whatever it holds', () => {
		expect(tourFor('/album/abc123', true)?.id).toBe('page-album');
		expect(tourFor('/album/abc/track/xyz', true)?.id).toBe('page-track');
		expect(tourFor('/collection', true)?.id).toBe('page-collection');
		expect(tourFor('/collection/copy/c1', true)?.id).toBe('page-copy');
	});

	/** The address carries more than the path, and none of it is the page. */
	it('reads past the query and the fragment', () => {
		expect(tourFor('/profile?tab=data', true)?.id).toBe('page-profile');
		expect(tourFor('/artist/a1#lineup', true)?.id).toBe('page-artist');
	});

	/**
	 * A page with nothing written for it is offered nothing, and the launcher
	 * hides itself rather than explaining somewhere else.
	 */
	it('keeps quiet on a page it has nothing to say about', () => {
		expect(tourFor('/admin/album', true)).toBeUndefined();
		expect(tourFor('/error', true)).toBeUndefined();
	});

	/**
	 * The profile is the one page that is not all on the screen at once: it
	 * draws one tab of four, and the other three are not in the document at
	 * all until something presses them open.
	 *
	 * That makes it the one page a walkthrough can quietly go half-blind on.
	 * A card left out of the script is a setting nothing else in the app ever
	 * mentions — the shelves the shelf view is drawn from, the listening log,
	 * what other collectors get to see. So the page's own markup is read here,
	 * and the script is held against it: every card has a stop, and every stop
	 * comes after the tab that draws it has been opened.
	 */
	describe('the profile, which is read a tab at a time', () => {
		const markup = readFileSync(
			join(__dirname, '../../page/profile/profile-page.component.html'),
			'utf-8'
		);

		/** The cards each tab draws, read off the page's own switch. */
		const drawn = [
			...markup.matchAll(/@case \('([\w-]+)'\) \{([\s\S]*?)\n\t{4}\}/g),
		].map(([, id, body]) => ({
			id,
			cards: [...body.matchAll(/<(mc-profile-(?!section)[\w-]+)/g)].map(
				([, card]) => card
			),
		}));

		const steps = tourFor('/profile', true)?.steps ?? [];

		it('reads the page as four tabs', () => {
			expect(drawn.map((tab) => tab.id)).toEqual([
				'account',
				'collection',
				'playback',
				'data',
			]);
		});

		/**
		 * The stops folded back into the groups the page keeps them in: a
		 * stop that presses a tab opens a group, and what follows belongs to
		 * it. Opening the same tab twice — which the walk does at the end,
		 * to leave the page where it found it — carries on where it left off.
		 */
		it('opens every tab and walks every card on it', () => {
			const walked = new Map<string, string[]>();
			let open = '';

			for (const step of steps) {
				const pressed = /^#mc-profile-tab-([\w-]+)$/.exec(
					step.action.type === 'click'
						? (step.action.selector ?? '')
						: ''
				)?.[1];

				if (pressed) {
					open = pressed;
					walked.set(open, walked.get(open) ?? []);
					continue;
				}

				const card = step.highlight?.selector ?? '';

				if (card.startsWith('mc-profile-')) {
					walked.get(open)?.push(card);
				}
			}

			expect(Object.fromEntries(walked)).toEqual(
				Object.fromEntries(drawn.map((tab) => [tab.id, tab.cards]))
			);
		});

		/**
		 * The walk changes the page under the reader, so it puts it back:
		 * the last tab it presses is the one a plain `/profile` opens on.
		 */
		it('leaves the page on the tab it found it on', () => {
			const pressed = steps
				.filter((step) => step.action.type === 'click')
				.map((step) => step.action.selector);

			expect(pressed.at(-1)).toBe('#mc-profile-tab-account');
		});
	});

	describe.each(
		pageTours.map((tour): [string, DemoScript] => [
			tour.script.id,
			tour.script,
		])
	)('%s', (_id, script) => {
		it.each(dictionaries)('is named in %s', (_language, dictionary) => {
			expect(typeof valueAt(dictionary, script.name)).toBe('string');
		});

		it.each(dictionaries)(
			'has words for every step in %s',
			(_language, dictionary) => {
				const missing = script.steps
					.flatMap((step) => [
						step.tooltip?.title ?? '',
						step.tooltip?.content ?? '',
					])
					.filter(
						(key) => typeof valueAt(dictionary, key) !== 'string'
					);

				expect(missing).toEqual([]);
			}
		);

		/**
		 * The spotlight is cut out of whatever the selector finds; a step
		 * with a tooltip and nothing to point at would dim the whole
		 * screen and leave the tooltip in the corner.
		 */
		it('points at something wherever it talks', () => {
			const pointless = script.steps
				.filter((step) => !step.highlight?.selector)
				.map((step) => step.id);

			expect(pointless).toEqual([]);
		});

		/**
		 * Every stop waits for the viewer, because the tooltip only draws
		 * its forward button on a step that does.
		 */
		it('waits for the viewer at every stop', () => {
			const impatient = script.steps
				.filter((step) => !step.tooltip?.requireConfirm)
				.map((step) => step.id);

			expect(impatient).toEqual([]);
		});

		/**
		 * The tour runs in the viewer's own account, on their own
		 * records: it looks, and the only thing it is ever allowed to
		 * press is a switch between two views of the same page.
		 *
		 * The profile's tabs are the only such switch in the app, and
		 * pressing one draws a different group of the same settings and
		 * writes nothing down. Anything else a stop could press would be
		 * a setting saved, a record changed or a form sent — on somebody
		 * else's behalf, while they sat and watched it happen.
		 */
		it('presses nothing but a tab', () => {
			const touching = script.steps
				.filter(
					(step) =>
						step.action.type !== 'highlight' &&
						!/^#mc-profile-tab-[\w-]+$/.test(
							step.action.selector ?? ''
						)
				)
				.map((step) => `${step.id}: ${step.action.type}`);

			expect(touching).toEqual([]);
		});

		/**
		 * A walkthrough is of the page it is offered on. One that opened
		 * another would take the screen out from under whoever pressed
		 * the launcher to ask about this one.
		 */
		it('opens no other page', () => {
			expect(script.setup?.initialRoute).toBeUndefined();
			expect(script.teardown?.finalRoute).toBeUndefined();
		});
	});
});
