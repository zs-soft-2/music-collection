import {
	DemoScript,
	DemoStep,
	TooltipPosition,
} from '@zssz-soft/demo-autopilot-core';

/** The id the launcher and the tests know the tour by. */
export const APP_TOUR_ID = 'app-tour';

/** Where every step's words live in the dictionaries. */
const TEXT = 'tour.app.steps';

interface Stop {
	/** The step's id, and the leaf under `tour.app.steps` that names it. */
	id: string;
	/** What the spotlight cuts out. */
	selector: string;
	position?: TooltipPosition;
	/** Off by default only where the element cannot be scrolled to. */
	scroll?: boolean;
}

/**
 * A step that says something about one part of the screen: the spotlight goes
 * up, the tooltip with it, and there it stays until the viewer clicks on.
 *
 * Every stop waits for that click rather than timing itself out. Whoever is
 * being shown around reads at their own speed — and the tooltip only offers a
 * way forward on a step that waits for one, so a tour that ran itself left
 * them with a way back and a way out and nothing else.
 *
 * Every step scrolls its element into view, and this is not optional decor:
 * the router leaves the scroll position where the last page had it, so a page
 * the tour opens after scrolling down opens scrolled down too — with its own
 * heading above the top of the screen, where neither the spotlight nor the
 * tooltip beside it could be read.
 *
 * What a step points at is kept small for the same reason. The tooltip looks
 * for a place beside the spotlight that does not cover it; a cut-out taller
 * than half the screen leaves no such place, and the tooltip ends up jammed
 * against the bottom edge, under whatever else lives down there.
 */
function look({ id, selector, position, scroll }: Stop): DemoStep {
	return {
		id,
		action: { type: 'highlight', selector },
		highlight: { selector, padding: 10, scrollIntoView: scroll ?? true },
		tooltip: {
			title: `${TEXT}.${id}.title`,
			content: `${TEXT}.${id}.content`,
			position: position ?? 'bottom',
			requireConfirm: true,
		},
		// The click is what moves the tour on; a delay after it would only be
		// a pause on a dimmed screen with nothing to read.
		delayAfter: 0,
	};
}

/**
 * A step that only opens another page. It carries no words of its own: the
 * step that follows waits for the page's own landmark to appear (the element
 * finder polls for it), so the dark moment in between is as short as the
 * route takes to load.
 */
function visit(route: string): DemoStep {
	return {
		id: `open${route.replace(/\//g, '-')}`,
		action: { type: 'navigate', payload: { route } },
		delayAfter: 400,
	};
}

/**
 * The guided tour of musiCollection: one pass through what a collector can do
 * here, in the order they would come to need it — find a record, see what is
 * already on the shelf, put a new one there, and then everything the catalog
 * gives back.
 *
 * It only ever looks. No step clicks something that would write to the
 * account, so there is nothing to seed before it and nothing to tidy up after
 * it — a viewer who closes the overlay halfway through is left on a page they
 * could have walked to themselves. That is also why the pages are shown
 * through their own landmarks (`.hero`, `.toolbar`) rather than through
 * whatever record happens to be on the shelf today: the tour must not depend
 * on any one album being in the catalog.
 *
 * The last stop is the profile, at the switch that turns this tour off — the
 * one thing a viewer who has seen enough of it needs to know where to find.
 */
export const appTourScript: DemoScript = {
	id: APP_TOUR_ID,
	name: 'tour.app.name',
	description: 'tour.app.description',
	category: 'app',
	setup: {
		initialRoute: '/home',
	},
	steps: [
		// --- Where everything is -------------------------------------------
		look({ id: 'welcome', selector: 'mc-top-bar .brand' }),
		look({ id: 'bar', selector: 'mc-top-bar .bar' }),
		look({ id: 'search', selector: 'mc-home-search' }),
		// The artist's own block rather than the whole hero: the hero is the
		// width of the page, so a tooltip has nowhere to stand beside it. The
		// skeleton stands in while the catalog is still arriving — the step
		// has to find something, or the tour dies here.
		look({
			id: 'spotlight',
			selector: 'mc-artist-spotlight .content, .spotlight-skeleton',
			position: 'right',
		}),
		// The heading, not the whole section: the numbers under it stay
		// readable through the veil, and the tooltip gets room below.
		look({
			id: 'catalog',
			selector: '[aria-labelledby="glance-title"] .section-head',
		}),

		// --- The collector's own shelf --------------------------------------
		visit('/collection'),
		look({
			id: 'collection',
			selector: '.page > .glance-section .glance-title',
		}),
		look({ id: 'filters', selector: '.page > .toolbar' }),
		look({ id: 'views', selector: '.page > .toolbar .view-toggle' }),

		// --- Putting a record on it -----------------------------------------
		visit('/scan'),
		look({ id: 'scan', selector: '.page > .hero' }),
		visit('/shelf-scan'),
		look({ id: 'shelfScan', selector: '.page > .hero' }),
		visit('/wishlist'),
		look({ id: 'wishlist', selector: '.page > .hero' }),

		// --- What the catalog gives back ------------------------------------
		visit('/collections'),
		look({ id: 'collections', selector: '.page > .hero' }),
		visit('/radio'),
		look({ id: 'radio', selector: '.page > .hero' }),
		visit('/daily-question'),
		look({ id: 'dailyQuestion', selector: '.page > .hero' }),
		visit('/upcoming'),
		look({ id: 'upcoming', selector: '.page > .hero' }),
		visit('/map'),
		look({ id: 'map', selector: '.page > .hero' }),

		// --- And back into the catalog --------------------------------------
		visit('/my-requests'),
		look({ id: 'requests', selector: '.page > .add' }),

		// --- Where the tour itself lives ------------------------------------
		visit('/profile'),
		look({
			id: 'profile',
			selector: 'mc-profile-demo-tour',
			position: 'top',
		}),
	],
};
