import { readFileSync } from 'fs';
import { join } from 'path';

import { DemoScript } from '@zssz-soft/demo-autopilot-core';

import { routes } from '../../app-routing';
import { homeCollectorTour, homeGuestTour } from './home-tour.script';

/**
 * The English dictionary, read rather than imported: the file belongs to the
 * i18n library rather than to the app, and a relative import across that line
 * is what the module boundaries forbid.
 */
const dictionary = JSON.parse(
	readFileSync(
		join(__dirname, '../../../../../../libs/core/i18n/assets/i18n/en.json'),
		'utf-8'
	)
) as Record<string, unknown>;

/** The value at `tour.home.steps.search.title`, or undefined. */
function valueAt(key: string): unknown {
	return key
		.split('.')
		.reduce<unknown>(
			(node, part) =>
				(node as Record<string, unknown> | undefined)?.[part],
			dictionary
		);
}

const tours: [string, DemoScript][] = [
	['guest', homeGuestTour],
	['collector', homeCollectorTour],
];

/**
 * The walkthroughs are played against the running app, so nothing here can be
 * checked by running them: a renamed section or a missing dictionary key would
 * only show up as a tour that dies halfway through, in front of whoever was
 * being shown around.
 */
describe('home tours', () => {
	it('gives the two audiences a walkthrough each', () => {
		expect(homeGuestTour.id).not.toEqual(homeCollectorTour.id);
	});

	/**
	 * Both stay on the home page. That is what makes stepping back work: the
	 * tour has no invisible navigation steps for the back button to land on,
	 * and no page the viewer would be turned back from.
	 */
	it('never leaves the home page', () => {
		const known = new Set(routes.map((route) => route.path));

		for (const [, tour] of tours) {
			expect(tour.setup?.initialRoute).toBe('/home');
			expect(known.has('home')).toBe(true);
			expect(
				tour.steps.filter((step) => step.action.type !== 'highlight')
			).toEqual([]);
		}
	});

	describe.each(tours)('%s', (_audience, tour) => {
		it('names every step once', () => {
			const ids = tour.steps.map((step) => step.id);

			expect(ids).toEqual([...new Set(ids)]);
		});

		it('is introduced in the dictionary', () => {
			expect(typeof valueAt(tour.name)).toBe('string');
			expect(typeof valueAt(tour.description ?? '')).toBe('string');
		});

		it('has words for every step', () => {
			const missing = tour.steps
				.flatMap((step) => [
					step.tooltip?.title ?? '',
					step.tooltip?.content ?? '',
				])
				.filter((key) => typeof valueAt(key) !== 'string');

			expect(missing).toEqual([]);
		});

		/**
		 * The spotlight is cut out of whatever the selector finds; a step with
		 * a tooltip and nothing to point at would dim the whole screen and
		 * leave the tooltip in the corner.
		 */
		it('points at something wherever it talks', () => {
			const pointless = tour.steps
				.filter((step) => step.tooltip)
				.filter((step) => !step.highlight?.selector)
				.map((step) => step.id);

			expect(pointless).toEqual([]);
		});

		/**
		 * Every stop waits for the viewer, because the tooltip only draws its
		 * forward button on a step that does.
		 */
		it('waits for the viewer at every stop', () => {
			const impatient = tour.steps
				.filter((step) => !step.tooltip?.requireConfirm)
				.map((step) => step.id);

			expect(impatient).toEqual([]);
		});
	});
});
