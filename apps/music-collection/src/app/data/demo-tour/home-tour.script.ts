import {
	DemoScript,
	DemoStep,
	TooltipPosition,
} from '@zssz-soft/demo-autopilot-core';

/** The ids the launcher and the tests know the two walkthroughs by. */
export const GUEST_TOUR_ID = 'home-guest';
export const COLLECTOR_TOUR_ID = 'home-collector';

/** Where the words live: the shared ones, and each audience's own. */
const SHARED = 'tour.home.steps';
const GUEST = 'tour.home.guest.steps';
const COLLECTOR = 'tour.home.collector.steps';

interface Stop {
	/** The step's id, and the leaf under its dictionary branch. */
	id: string;
	/** Which branch the words come from; the shared one unless given. */
	text?: string;
	/** What the spotlight cuts out. */
	selector: string;
	position?: TooltipPosition;
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
 * Every step scrolls its element into view, and what it points at is kept
 * small: the tooltip looks for a place beside the spotlight that does not
 * cover it, and a cut-out taller than half the screen leaves no such place.
 */
function look({ id, text, selector, position }: Stop): DemoStep {
	const key = `${text ?? SHARED}.${id}`;

	return {
		id,
		action: { type: 'highlight', selector },
		highlight: { selector, padding: 10, scrollIntoView: true },
		tooltip: {
			title: `${key}.title`,
			content: `${key}.content`,
			position: position ?? 'bottom',
			requireConfirm: true,
		},
		// The click is what moves the tour on; a delay after it would only be
		// a pause on a dimmed screen with nothing left to read.
		delayAfter: 0,
	};
}

/** The stops both walkthroughs share, in the order the page lays them out. */
const catalogStops: DemoStep[] = [
	look({ id: 'search', selector: 'mc-home-search' }),
	// The artist's own block rather than the whole hero: the hero is the width
	// of the page, so a tooltip has nowhere to stand beside it. The skeleton
	// stands in while the catalog is still arriving — the step has to find
	// something, or the tour dies here.
	look({
		id: 'spotlight',
		selector: 'mc-artist-spotlight .content, .spotlight-skeleton',
		position: 'right',
	}),
	// The heading, not the whole section: the numbers under it stay readable
	// through the veil, and the tooltip gets room below.
	look({
		id: 'catalog',
		selector: '[aria-labelledby="glance-title"] .section-head',
	}),
];

/**
 * The home page as a visitor meets it — which is all a visitor can meet. The
 * pages behind the sign-in are not shown off here: a tour that walked into
 * one would be turned back by the route guard in front of whoever was being
 * shown around, so what a guest is offered instead is the way in.
 */
export const homeGuestTour: DemoScript = {
	id: GUEST_TOUR_ID,
	name: 'tour.home.guest.name',
	description: 'tour.home.guest.description',
	category: 'home',
	setup: { initialRoute: '/home' },
	steps: [
		look({ id: 'welcome', text: GUEST, selector: 'mc-top-bar .brand' }),
		look({ id: 'bar', text: GUEST, selector: 'mc-top-bar .bar' }),
		...catalogStops,
		look({
			id: 'artists',
			selector: '[aria-labelledby="artists-title"] .section-head',
		}),
		// Both of these belong to a signed-out page and to no other: the
		// prompt says what is behind the sign-in, and the button is the way
		// in — which is where a visitor's tour should leave them.
		look({ id: 'join', text: GUEST, selector: 'mc-join-prompt' }),
		// To the left of the button rather than under it: the button is in the
		// right-hand corner, and a tooltip hung under it has the width of what
		// is left of the screen there — which is not enough, so it is squeezed
		// into a column.
		look({
			id: 'login',
			text: GUEST,
			selector: 'mc-top-bar .login-btn',
			position: 'left',
		}),
	],
};

/**
 * The same page for somebody who has a shelf. The catalog stops are the same
 * — the page is the same page — but the rows that only exist for a collector
 * are what the tour is for, and it ends under their own avatar, where the
 * rest of the app lives and where this walkthrough can be switched off.
 */
export const homeCollectorTour: DemoScript = {
	id: COLLECTOR_TOUR_ID,
	name: 'tour.home.collector.name',
	description: 'tour.home.collector.description',
	category: 'home',
	setup: { initialRoute: '/home' },
	steps: [
		look({ id: 'welcome', text: COLLECTOR, selector: 'mc-top-bar .brand' }),
		look({ id: 'bar', text: COLLECTOR, selector: 'mc-top-bar .bar' }),
		...catalogStops,
		look({
			id: 'recent',
			text: COLLECTOR,
			selector: '[aria-labelledby="recent-title"] .section-head',
		}),
		look({
			id: 'challenges',
			text: COLLECTOR,
			selector: '[aria-labelledby="collections-title"] .section-head',
		}),
		look({
			id: 'account',
			text: COLLECTOR,
			selector: 'mc-top-bar .avatar-btn',
		}),
	],
};
