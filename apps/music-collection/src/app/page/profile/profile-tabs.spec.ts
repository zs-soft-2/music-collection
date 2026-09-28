import { readFileSync } from 'fs';
import { join } from 'path';

import { pageTours } from '../../data/demo-tour/tours.script';
import {
	DEFAULT_PROFILE_TAB,
	PROFILE_TABS,
	ProfileTabId,
	isProfileTabId,
} from './profile-tabs';

/**
 * The template is read rather than rendered: what is being checked here is
 * how the page is *grouped*, and a grouping mistake — a setting left out of
 * every tab, or the tour's switch filed under one the page does not open on —
 * shows up in the markup long before it shows up in a running app.
 */
const template = readFileSync(
	join(__dirname, 'profile-page.component.html'),
	'utf-8'
);

/** Every setting the page has, whichever tab it ends up under. */
const SECTIONS = [
	'mc-profile-account',
	'mc-profile-language',
	'mc-profile-appearance',
	'mc-profile-demo-tour',
	'mc-profile-lists',
	'mc-profile-shelves',
	'mc-profile-playback',
	'mc-profile-spotify',
	'mc-profile-listening',
	'mc-profile-privacy',
];

/** The markup one tab's panel draws, taken from its `@case` block. */
function panelOf(id: ProfileTabId): string {
	const block = template
		.split("@case ('")
		.find((part) => part.startsWith(`${id}')`));

	return block ?? '';
}

describe('profile tabs', () => {
	it('names every tab once, and opens on one of them', () => {
		const ids = PROFILE_TABS.map((tab) => tab.id);

		expect(ids).toEqual([...new Set(ids)]);
		expect(isProfileTabId(DEFAULT_PROFILE_TAB)).toBe(true);
	});

	it('gives every tab a panel with something in it', () => {
		const empty = PROFILE_TABS.filter(
			(tab) =>
				!SECTIONS.some((section) => panelOf(tab.id).includes(section))
		).map((tab) => tab.id);

		expect(empty).toEqual([]);
	});

	/**
	 * Grouping ten cards into four tabs is exactly the edit that loses one:
	 * a setting nobody can reach is a setting nobody can turn off.
	 */
	it('files every setting under exactly one tab', () => {
		const misplaced = SECTIONS.filter(
			(section) =>
				PROFILE_TABS.filter((tab) =>
					panelOf(tab.id).includes(`<${section} `)
				).length !== 1
		);

		expect(misplaced).toEqual([]);
	});

	/**
	 * The profile's walkthrough names a card per stop and keeps the ones the
	 * open tab is drawing, whichever tab that is. A stop naming a card no tab
	 * holds would never be walked at all — so the page and the walkthrough
	 * have to agree on what the profile is made of.
	 */
	it('talks about cards the page actually draws', () => {
		const profile = pageTours.find((tour) => tour.path === 'profile');
		const cards = (profile?.script.steps ?? [])
			.map((step) => step.highlight?.selector ?? '')
			.filter((selector) => selector.startsWith('mc-'));

		expect(cards).not.toEqual([]);
		expect(
			cards.filter(
				(card) =>
					!PROFILE_TABS.some((tab) =>
						panelOf(tab.id).includes(`<${card} `)
					)
			)
		).toEqual([]);
	});

	/**
	 * The switch that takes the launcher away is what a collector who has seen
	 * enough comes here for, so it sits under the tab the page opens on rather
	 * than behind a tab they have to guess at.
	 */
	it('draws the tour switch on the tab the page opens on', () => {
		expect(panelOf(DEFAULT_PROFILE_TAB)).toContain(
			'<mc-profile-demo-tour '
		);
	});
});
