import {
	DemoScript,
	DemoStep,
	TooltipPosition,
} from '@zssz-soft/demo-autopilot-core';

/** The ids the launcher and the tests know the two home walkthroughs by. */
export const GUEST_TOUR_ID = 'home-guest';
export const COLLECTOR_TOUR_ID = 'home-collector';

/** Where the words live: the shared ones, and each audience's own. */
const SHARED = 'tour.home.steps';
const GUEST = 'tour.home.guest.steps';
const COLLECTOR = 'tour.home.collector.steps';
/** One branch per page that talks about itself. */
const PAGE = 'tour.pages';

interface Stop {
	/** The step's id, and the leaf under its dictionary branch. */
	id: string;
	/** Which branch the words come from; the shared one unless given. */
	text?: string;
	/** What the spotlight cuts out. */
	selector: string;
	position?: TooltipPosition;
	/**
	 * Whether the stop presses what it points at once it has been read.
	 *
	 * The runner acts after the tooltip rather than before it — the spotlight
	 * goes up, the viewer reads, and only when they press on does the step's
	 * action run. So a stop that opens something says what is behind the door
	 * while the door is still shut, and the next stop finds it open.
	 */
	opens?: boolean;
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
function look({ id, text, selector, position, opens }: Stop): DemoStep {
	const key = `${text ?? SHARED}.${id}`;

	return {
		id,
		// Looking is the whole of a stop unless it opens something, and the
		// only thing any stop is allowed to press is a switch between views —
		// a tab. Nothing here touches a record, a setting or a form.
		action: opens
			? { type: 'click', selector }
			: { type: 'highlight', selector },
		highlight: { selector, padding: 10, scrollIntoView: true },
		tooltip: {
			title: `${key}.title`,
			content: `${key}.content`,
			position: position ?? 'bottom',
			requireConfirm: true,
		},
		// The click is what moves the tour on; a delay after it would only be
		// a pause on a dimmed screen with nothing left to read. A stop that
		// opens a tab needs no delay either: the next stop looks for its
		// element until it finds it, which is a frame or two later.
		delayAfter: 0,
	};
}

/** A section's heading, which is what most stops point at. */
const head = (id: string): string => `[aria-labelledby="${id}"] .section-head`;

// --- The home page ---------------------------------------------------------

/**
 * The stops both home walkthroughs share, in the order the page lays them
 * out. Everything the page draws gets a stop: a tour that skipped half the
 * rows would leave the reader wondering what the rest was.
 */
const homeCatalogStops: Stop[] = [
	{ id: 'search', selector: 'mc-home-search' },
	// The artist's own block rather than the whole hero: the hero is the width
	// of the page, so a tooltip has nowhere to stand beside it. The skeleton
	// stands in while the catalog is still arriving.
	{
		id: 'spotlight',
		selector: 'mc-artist-spotlight .content, .spotlight-skeleton',
		position: 'right',
	},
	// The headings, not the whole sections: what is under them stays readable
	// through the veil, and the tooltip gets room below.
	{ id: 'catalog', selector: head('glance-title') },
	{
		id: 'coverage',
		selector: 'mc-catalog-coverage-chart',
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
	steps: (
		[
			{ id: 'welcome', text: GUEST, selector: 'mc-top-bar .brand' },
			{ id: 'bar', text: GUEST, selector: 'mc-top-bar .bar' },
			...homeCatalogStops,
			{ id: 'recent', text: GUEST, selector: head('recent-title') },
			{
				id: 'challenges',
				text: GUEST,
				selector: head('collections-title'),
			},
			{ id: 'artists', selector: head('artists-title') },
			// Only a signed-out page has this one, and it says what the sign-in
			// is for — so it stands where the page puts it, halfway down.
			{ id: 'join', text: GUEST, selector: 'mc-join-prompt' },
			...homeWayStops,
			// The way in, last: the button is in the bar rather than on this page,
			// so it is where a visitor who has heard the whole case should be left.
			{
				id: 'login',
				text: GUEST,
				selector: 'mc-top-bar .login-btn',
				position: 'left',
			},
		] as Stop[]
	).map(look),
};

/** The same page for somebody who has a shelf. */
const homeCollectorTour: DemoScript = {
	id: COLLECTOR_TOUR_ID,
	name: 'tour.home.collector.name',
	description: 'tour.home.collector.description',
	category: 'page',
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
		{ id: 'hunt', text: COLLECTOR, selector: head('hunt-title') },
		{ id: 'artists', selector: head('artists-title') },
		...homeWayStops,
		{ id: 'account', text: COLLECTOR, selector: 'mc-top-bar .account' },
	].map(look),
};

// --- Every other page ------------------------------------------------------

export type TourAudience = 'guest' | 'collector';

/** One page, and the walkthrough of it the launcher offers while it is open. */
export interface PageTour {
	/** The route, spelled exactly as `app-routing` spells its path. */
	readonly path: string;
	/** Who it is written for; everybody, unless given. */
	readonly audience?: TourAudience;
	readonly script: DemoScript;
}

/** A stop, as a page lists its own: an id, what it points at, and where. */
type Spot = Pointed | Opener;

type Pointed = readonly [
	id: string,
	selector: string,
	position?: TooltipPosition,
];

/**
 * A stop that opens what it points at, for the parts of a page that are kept
 * behind a switch.
 *
 * A page that draws one tab of four cannot be walked by pointing alone: three
 * quarters of it is not on the screen, and a stop whose element is missing
 * ends the run. So the walkthrough opens each group itself — it points at the
 * tab, says what is inside, and presses it when the viewer moves on.
 */
interface Opener {
	readonly id: string;
	/** The switch it points at, and presses once the stop has been read. */
	readonly opens: string;
	readonly position?: TooltipPosition;
}

/**
 * One page's walkthrough, named after the page and speaking only about it.
 *
 * A page says what it is for, then what each of its parts does, in the order
 * the page lays them out. Nothing here opens another page: whoever pressed
 * the launcher is reading *this* screen, and a tour that navigated away would
 * take it out from under them. Opening a tab of the same page is another
 * matter — that is still this screen, and the only thing a stop may press.
 *
 * Which of these stops are actually walked is decided when the run starts —
 * see `onThisPage` in the service. A page draws what the collector has, so
 * half of what is listed here may not be on the screen on any one visit.
 */
const pageTour = (
	page: string,
	path: string,
	spots: readonly Spot[],
	audience?: TourAudience
): PageTour => ({
	path,
	audience,
	script: {
		id: `page-${page}`,
		name: `${PAGE}.${page}.name`,
		category: 'page',
		steps: spots.map((spot) =>
			'opens' in spot
				? look({
						id: spot.id,
						text: `${PAGE}.${page}`,
						selector: spot.opens,
						position: spot.position,
						opens: true,
					})
				: look({
						id: spot[0],
						text: `${PAGE}.${page}`,
						selector: spot[1],
						position: spot[2],
					})
		),
	},
});

// --- The collector's own pages ---------------------------------------------

const collectionTour = pageTour('collection', 'collection', [
	['intro', '.page > .hero'],
	['stats', '.page > .glance-section .glance-title'],
	['decades', 'mc-decade-chart', 'top'],
	['styles', 'mc-style-bars', 'top'],
	['challenges', '[aria-labelledby="collections-title"] .collections-head'],
	['search', '.page > .toolbar .search'],
	['formats', '.page > .toolbar .chips'],
	['sort', '.page > .toolbar .controls .select'],
	['views', '.page > .toolbar .view-toggle'],
	['shelf', 'mc-record-shelf', 'top'],
]);

const copyTour = pageTour('copy', 'collection/copy/:itemId', [
	['intro', '.page > .hero'],
	['photos', 'mc-copy-photos'],
	['facts', '.page .copy-facts .section-head'],
	['form', 'mc-copy-details-form'],
]);

const scanTour = pageTour('scan', 'scan', [
	['intro', '.page > .hero'],
	['shot', '.page section.shot'],
	['results', '.page section.results'],
	['read', '.page section.read', 'top'],
]);

const shelfScanTour = pageTour('shelfScan', 'shelf-scan', [
	['intro', '.page > .hero'],
	['shots', '.page section.shots .thumbs, .page section.shots .shoot'],
	['controls', '.page section.shots .controls'],
	['review', '.page section.review'],
]);

const wishlistTour = pageTour('wishlist', 'wishlist', [
	['intro', '.page > .hero'],
	['stats', '.page > .hero .stats'],
	['search', '.page > .toolbar .search'],
	['formats', '.page > .toolbar .chips'],
	['found', '.page > .toolbar .chip.toggle'],
	['gotIt', '.page .got-it'],
]);

const wishlistItemTour = pageTour('wishlistItem', 'wishlist/:itemId', [
	['intro', '.page > .hero'],
	['facts', 'mc-entity-facts'],
]);

const radioTour = pageTour('radio', 'radio', [
	['intro', '.page > .hero'],
	['order', '.page > .hero .order'],
	['onAir', '.page section.on-air'],
	['stations', '.page ul.stations'],
]);

const dailyQuestionTour = pageTour('dailyQuestion', 'daily-question', [
	['intro', '.page > .hero'],
	['score', '.page > .hero .stats'],
	['question', '.page section.question .prompt, .page section.question'],
	['clock', '.page section.question .clock'],
	['options', '.page section.question .options', 'top'],
	['history', '.page section.history .history-toggle'],
	['leaderboard', '.page section.leaderboard .leaderboard-head'],
]);

const mapTour = pageTour('map', 'map', [
	['intro', '.page > .hero'],
	['stats', '.page > .hero .stats'],
	['world', '.page .map-card', 'top'],
	['countries', '.page .panel .countries'],
	['collectors', '.page .panel .collectors'],
]);

const requestsTour = pageTour('requests', 'my-requests', [
	['intro', '.page > .head'],
	['propose', '.page > .add'],
	['list', '.page > ul.requests'],
]);

const bandsTour = pageTour('bands', 'my-bands/list', [
	['intro', '.page > .head'],
	['list', '.page > ul.bands'],
]);

/** A profile tab's button, which is what opens the group behind it. */
const profileTab = (id: string): string => `#mc-profile-tab-${id}`;

/**
 * The profile: every setting the app has, and the switch that turns the tour
 * itself off.
 *
 * This is the one page a walkthrough has to drive rather than only point at.
 * The settings are read a tab at a time and only the open tab is drawn, so a
 * tour that pointed alone would explain the four cards the collector already
 * had in front of them and leave the other six — their shelves, their
 * playback, their listening log, what other collectors get to see — behind
 * three tabs nobody told them to press. Those are the settings that most need
 * saying out loud, because nothing else in the app mentions them.
 *
 * So the tour opens each tab in turn, in the order the strip draws them, and
 * walks what is inside. It ends where it started: back on the first tab, on
 * the switch that takes the tour away — which also leaves the page on the tab
 * the collector found it on rather than on whichever one the tour finished
 * with.
 */
const profileTour = pageTour('profile', 'profile', [
	['intro', '.page > .hero'],
	['tabs', '.page > .tabs'],

	{ id: 'accountTab', opens: profileTab('account') },
	['account', 'mc-profile-account'],
	['avatar', 'mc-profile-avatar'],
	['language', 'mc-profile-language'],
	['appearance', 'mc-profile-appearance'],

	{ id: 'collectionTab', opens: profileTab('collection') },
	['genres', 'mc-profile-genres'],
	['lists', 'mc-profile-lists'],
	['shelves', 'mc-profile-shelves'],

	{ id: 'playbackTab', opens: profileTab('playback') },
	['playback', 'mc-profile-playback'],
	['spotify', 'mc-profile-spotify'],

	{ id: 'dataTab', opens: profileTab('data') },
	['listening', 'mc-profile-listening'],
	['verdicts', 'mc-profile-verdicts'],
	['privacy', 'mc-profile-privacy'],
	['sharing', 'mc-profile-sharing'],

	// Back to the first tab for the last word, which is about the tour.
	{ id: 'back', opens: profileTab('account') },
	['switch', 'mc-profile-demo-tour'],
]);

// --- Pages open to everybody ------------------------------------------------

const challengesTour = pageTour('challenges', 'collections', [
	['intro', '.page > .hero'],
	['stats', '.page > .hero .stats'],
	['hunt', '[aria-labelledby="hunt-title"] .section-head'],
	['tabs', '.page > .toolbar .tabs'],
	['card', '.page ul.grid > li .card'],
	['progress', '.page ul.grid > li .card .progress'],
	['follow', '.page ul.grid > li .card .follow'],
]);

const challengeTour = pageTour('challenge', 'collections/:slug', [
	['intro', '.page > .hero'],
	['progress', '.page > .progress'],
	['score', '.page .score'],
	['badge', '.page aside.badge'],
	['filter', '.page > .toolbar'],
	['grid', '.page > ul.grid', 'top'],
]);

const upcomingTour = pageTour('upcoming', 'upcoming', [
	['intro', '.page > .hero'],
	['stats', '.page > .hero .stats'],
	['tabs', '.page > .toolbar .tabs'],
	['timeline', '.page > .timeline .month-label, .page > .timeline'],
]);

const networkTour = pageTour('network', 'network', [
	['intro', '.page > .intro'],
	['focus', '.page .toolbar .focus'],
	['search', 'mc-network-search'],
	['graph', '.page .graph-area', 'top'],
	['legend', '.page ul.legend', 'top'],
	['details', '.page aside.details'],
]);

// --- The catalog's own pages ------------------------------------------------

const artistTour = pageTour('artist', 'artist/:artistId', [
	['intro', '.page > .hero'],
	['stats', '.page > .stats'],
	['nav', '.page > .section-nav'],
	['about', '#about-title'],
	['lineup', '#lineup-title'],
	['discography', '#discography-title'],
	['collection', '#collection-title'],
	['similar', '#similar-title'],
]);

const albumTour = pageTour('album', 'album/:albumId', [
	['intro', '.page > .hero'],
	['collect', '.page .collect-button'],
	['wish', '.page .wish-button'],
	['challenges', 'mc-album-collections'],
	['original', '#original-title'],
	['listen', '#listen-title'],
	['tracklist', '#tracklist-title'],
	['credits', '#credits-title'],
	['copies', '#copies-title'],
	['more', '#more-title'],
]);

const trackTour = pageTour('track', 'album/:albumId/track/:trackId', [
	['intro', '.page > .hero'],
	['actions', '.page .hero-actions'],
	['lyrics', '#lyrics-title'],
	['credits', '#credits-title'],
	['neighbours', '.page nav.neighbours', 'top'],
]);

const releaseTour = pageTour('release', 'release/:releaseId', [
	['intro', '.page > .hero'],
	['facts', 'mc-entity-facts'],
	['tracks', '.page section.section'],
]);

const labelTour = pageTour('label', 'label/:labelId', [
	['intro', '.page > .hero'],
	['facts', 'mc-entity-facts'],
	['catalog', '.page section.section'],
]);

const musicianTour = pageTour('musician', 'musician/:musicianId', [
	['intro', '.page > .hero'],
	['stats', '.page > .stats'],
	['bands', '#bands-title'],
	['guest', '#guest-title'],
	['albums', '#albums-title'],
	['bandmates', '#bandmates-title'],
]);

/**
 * Every page that can talk about itself.
 *
 * The launcher offers the one page the collector is standing on, so the order
 * here decides nothing but which of two entries for the same path wins — and
 * only the home page has two.
 */
export const pageTours: readonly PageTour[] = [
	{ path: 'home', audience: 'guest', script: homeGuestTour },
	{ path: 'home', audience: 'collector', script: homeCollectorTour },
	collectionTour,
	copyTour,
	scanTour,
	shelfScanTour,
	wishlistTour,
	wishlistItemTour,
	radioTour,
	dailyQuestionTour,
	mapTour,
	requestsTour,
	bandsTour,
	profileTour,
	challengesTour,
	challengeTour,
	upcomingTour,
	networkTour,
	artistTour,
	albumTour,
	trackTour,
	releaseTour,
	labelTour,
	musicianTour,
];

/** The address as the router left it: no query, no fragment, no empty parts. */
function segmentsOf(url: string): string[] {
	return url.split(/[?#;]/)[0].split('/').filter(Boolean);
}

/**
 * Whether a route's path is the one the address is on.
 *
 * Matched a segment at a time against the app's own route paths rather than
 * against the address as typed, so one walkthrough serves every record in the
 * catalog: `album/:albumId` is the album page, whichever album it is drawing.
 * Two paths of different lengths never match the same address, which is what
 * keeps `collection` and `collection/copy/:itemId` apart.
 */
function matches(path: string, segments: readonly string[]): boolean {
	const pattern = segmentsOf(path);

	return (
		pattern.length === segments.length &&
		pattern.every(
			(part, at) => part.startsWith(':') || part === segments[at]
		)
	);
}

/** The walkthrough for the page at this address, if the app has one for it. */
export function tourFor(
	url: string,
	signedIn: boolean
): DemoScript | undefined {
	const segments = segmentsOf(url);

	return pageTours.find(
		(tour) =>
			matches(tour.path, segments) &&
			(!tour.audience || (tour.audience === 'collector') === signedIn)
	)?.script;
}
