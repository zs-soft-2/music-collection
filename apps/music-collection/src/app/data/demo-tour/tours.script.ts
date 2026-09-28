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
/** One branch per page the tour walks on to. */
const PAGE = 'tour.pages';

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

/** A section's heading, which is what most stops point at. */
const head = (id: string): string => `[aria-labelledby="${id}"] .section-head`;

/**
 * One page's walkthrough.
 *
 * A page is a script of its own rather than a run of steps inside a longer
 * one, and that is what makes walking on work. The route is the script's
 * setup, so starting it opens the page; the chain in `DemoTourService` starts
 * the next one when this one is through. Nothing invisible sits between two
 * stops, so stepping back lands on the words the viewer just read, and the
 * counter in the tooltip counts this page's stops rather than the app's.
 *
 * The name is the page's own menu label: the launcher only ever offers the
 * first of a chain, but a page named after itself reads properly if one of
 * them is ever offered on its own.
 */
function pageTour(
	id: string,
	route: string,
	name: string,
	stops: Stop[]
): DemoScript {
	return {
		id,
		name,
		category: 'page',
		setup: { initialRoute: route },
		steps: stops.map(look),
	};
}

/**
 * The stops both home walkthroughs share, in the order the page lays them
 * out. Everything the page draws gets a stop: a tour that skipped half the
 * rows would leave the reader wondering what the rest was.
 */
const homeCatalogStops: Stop[] = [
	{ id: 'search', selector: 'mc-home-search' },
	// The artist's own block rather than the whole hero: the hero is the width
	// of the page, so a tooltip has nowhere to stand beside it. The skeleton
	// stands in while the catalog is still arriving — the step has to find
	// something, or the tour dies here.
	{
		id: 'spotlight',
		selector: 'mc-artist-spotlight .content, .spotlight-skeleton',
		position: 'right',
	},
	// The headings, not the whole sections: what is under them stays readable
	// through the veil, and the tooltip gets room below.
	{ id: 'catalog', selector: head('glance-title') },
	// The chart is the second half of the same section. The fallback is the
	// heading of the row below it, which is further down the page — a comma
	// selector answers with whichever comes first in the document, so a
	// missing chart leaves the tour standing rather than killing it.
	{
		id: 'coverage',
		selector: `mc-catalog-coverage-chart, ${head('recent-title')}`,
		position: 'top',
	},
];

/** The ways through the catalog, at the foot of the home page. */
const homeWayStops: Stop[] = [
	{ id: 'styles', selector: head('styles-title') },
	{ id: 'decades', selector: head('decades-title') },
	{ id: 'acts', selector: head('acts-title') },
	{ id: 'albums', selector: head('albums-title') },
];

/** The home page as a visitor meets it. */
const homeGuestTour: DemoScript = {
	id: GUEST_TOUR_ID,
	name: 'tour.home.guest.name',
	description: 'tour.home.guest.description',
	category: 'page',
	setup: { initialRoute: '/home' },
	steps: [
		{ id: 'welcome', text: GUEST, selector: 'mc-top-bar .brand' },
		{ id: 'bar', text: GUEST, selector: 'mc-top-bar .bar' },
		...homeCatalogStops,
		{ id: 'recent', text: GUEST, selector: head('recent-title') },
		{ id: 'challenges', text: GUEST, selector: head('collections-title') },
		{ id: 'artists', selector: head('artists-title') },
		// Only a signed-out page has this one, and it says what the sign-in
		// is for — so it stands where the page puts it, halfway down.
		{ id: 'join', text: GUEST, selector: 'mc-join-prompt' },
		...homeWayStops,
	].map(look),
};

/** The same page for somebody who has a shelf. */
const homeCollectorTour: DemoScript = {
	id: COLLECTOR_TOUR_ID,
	name: 'tour.home.collector.name',
	description: 'tour.home.collector.description',
	category: 'page',
	setup: { initialRoute: '/home' },
	steps: [
		{ id: 'welcome', text: COLLECTOR, selector: 'mc-top-bar .brand' },
		{ id: 'bar', text: COLLECTOR, selector: 'mc-top-bar .bar' },
		...homeCatalogStops,
		{ id: 'recent', text: COLLECTOR, selector: head('recent-title') },
		{
			id: 'challenges',
			text: COLLECTOR,
			selector: head('collections-title'),
		},
		// The hunt list is only drawn where there is something to hunt. Its
		// fallback is the heading below it, for the same reason as the
		// chart's.
		{
			id: 'hunt',
			text: COLLECTOR,
			selector: `${head('hunt-title')}, ${head('artists-title')}`,
		},
		{ id: 'artists', selector: head('artists-title') },
		...homeWayStops,
	].map(look),
};

/** Every page's hero carries its title and what the page is for. */
const intro = (page: string, selector = '.page > .hero'): Stop => ({
	id: 'intro',
	text: `${PAGE}.${page}`,
	selector,
});

const on = (page: string, id: string, selector: string): Stop => ({
	id,
	text: `${PAGE}.${page}`,
	selector,
});

// --- The collector's own pages ---------------------------------------------

const collectionTour = pageTour(
	'page-collection',
	'/collection',
	'nav.collection',
	[
		intro('collection'),
		on('collection', 'stats', '.page > .glance-section .glance-title'),
		on('collection', 'filters', '.page > .toolbar'),
		on('collection', 'views', '.page > .toolbar .view-toggle'),
	]
);

const scanTour = pageTour('page-scan', '/scan', 'nav.scan', [intro('scan')]);

const shelfScanTour = pageTour(
	'page-shelf-scan',
	'/shelf-scan',
	'nav.shelf-scan',
	[intro('shelfScan')]
);

const wishlistTour = pageTour('page-wishlist', '/wishlist', 'nav.wishlist', [
	intro('wishlist'),
	on('wishlist', 'filters', '.page > .toolbar'),
]);

const radioTour = pageTour('page-radio', '/radio', 'nav.radio', [
	intro('radio'),
]);

const dailyQuestionTour = pageTour(
	'page-daily-question',
	'/daily-question',
	'nav.daily-question',
	[
		intro('dailyQuestion'),
		on('dailyQuestion', 'history', '.page > section.history'),
	]
);

const mapTour = pageTour('page-map', '/map', 'nav.map', [intro('map')]);

const requestsTour = pageTour(
	'page-requests',
	'/my-requests',
	'nav.my-requests',
	[
		intro('requests', '.page > .head'),
		on('requests', 'propose', '.page > .add'),
	]
);

const profileTour = pageTour('page-profile', '/profile', 'nav.profile', [
	intro('profile'),
	on('profile', 'switch', 'mc-profile-demo-tour'),
]);

// --- Pages open to everybody ------------------------------------------------

const challengesTour = pageTour(
	'page-challenges',
	'/collections',
	'nav.collections',
	[intro('challenges')]
);

const upcomingTour = pageTour('page-upcoming', '/upcoming', 'nav.upcoming', [
	intro('upcoming'),
]);

/**
 * The last of a visitor's chain, so it carries the way in: the sign-in button
 * sits in the bar, which is on every page, and that is where a tour a visitor
 * has followed to the end should leave them.
 */
const networkTour = pageTour('page-network', '/network', 'nav.network', [
	intro('network', '.page > .intro'),
	{
		id: 'login',
		text: GUEST,
		selector: 'mc-top-bar .login-btn',
		position: 'left',
	},
]);

/**
 * The chains, in the order they are walked. The first is what the launcher
 * offers; the rest follow it, one page at a time, as each is finished.
 *
 * A visitor is only taken through pages a visitor may open — the guarded ones
 * would turn the tour back in front of whoever was being shown around.
 */
export const guestTours: readonly DemoScript[] = [
	homeGuestTour,
	challengesTour,
	upcomingTour,
	networkTour,
];

export const collectorTours: readonly DemoScript[] = [
	homeCollectorTour,
	collectionTour,
	scanTour,
	shelfScanTour,
	wishlistTour,
	challengesTour,
	radioTour,
	dailyQuestionTour,
	upcomingTour,
	mapTour,
	requestsTour,
	profileTour,
];
