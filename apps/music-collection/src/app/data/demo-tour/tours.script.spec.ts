import { readFileSync } from 'fs';
import { join } from 'path';

import { DemoScript } from '@zssz-soft/demo-autopilot-core';
import { Route } from '@angular/router';

import { routes } from '../../app-routing';
import { collectorTours, guestTours } from './tours.script';

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

/** The value at `tour.pages.scan.intro.title`, or undefined. */
function valueAt(key: string): unknown {
	return key
		.split('.')
		.reduce<unknown>(
			(node, part) =>
				(node as Record<string, unknown> | undefined)?.[part],
			dictionary
		);
}

/** The route the app has for a path the tour walks to, if it has one. */
function routeOf(script: DemoScript): Route | undefined {
	const path = (script.setup?.initialRoute ?? '').replace(/^\//, '');

	return routes.find((route) => route.path === path);
}

const chains: [string, readonly DemoScript[]][] = [
	['guest', guestTours],
	['collector', collectorTours],
];

/**
 * The walkthroughs are played against the running app, so nothing here can be
 * checked by running them: a renamed section, a missing dictionary key or a
 * guarded route would only show up as a tour that dies halfway through, in
 * front of whoever was being shown around.
 */
describe('tours', () => {
	it('gives the two audiences a chain each, starting on different scripts', () => {
		expect(guestTours[0].id).not.toEqual(collectorTours[0].id);
	});

	/**
	 * A visitor is only walked through pages a visitor may open. A guarded one
	 * would send them to the sign-in and leave the tour looking for a section
	 * on a page it never reached.
	 */
	it('walks a visitor through no guarded page', () => {
		const guarded = guestTours
			.filter((script) => routeOf(script)?.canActivate)
			.map((script) => script.id);

		expect(guarded).toEqual([]);
	});

	/** The collector's chain ends where the tour can be switched off. */
	it('leaves the collector in the profile', () => {
		const last = collectorTours[collectorTours.length - 1];

		expect(last.setup?.initialRoute).toBe('/profile');
		expect(last.steps.at(-1)?.highlight?.selector).toBe(
			'mc-profile-demo-tour'
		);
	});

	describe.each(chains)('%s chain', (_audience, chain) => {
		const scripts = [...chain];

		it('names every page once', () => {
			const ids = scripts.map((script) => script.id);

			expect(ids).toEqual([...new Set(ids)]);
		});

		it('opens a page the app has', () => {
			const strangers = scripts
				.filter((script) => !routeOf(script))
				.map((script) => script.setup?.initialRoute);

			expect(strangers).toEqual([]);
		});

		describe.each(scripts.map((s): [string, DemoScript] => [s.id, s]))(
			'%s',
			(_id, script) => {
				it('is named in the dictionary', () => {
					expect(typeof valueAt(script.name)).toBe('string');
				});

				it('has words for every step', () => {
					const missing = script.steps
						.flatMap((step) => [
							step.tooltip?.title ?? '',
							step.tooltip?.content ?? '',
						])
						.filter((key) => typeof valueAt(key) !== 'string');

					expect(missing).toEqual([]);
				});

				/**
				 * The spotlight is cut out of whatever the selector finds; a
				 * step with a tooltip and nothing to point at would dim the
				 * whole screen and leave the tooltip in the corner.
				 */
				it('points at something wherever it talks', () => {
					const pointless = script.steps
						.filter((step) => !step.highlight?.selector)
						.map((step) => step.id);

					expect(pointless).toEqual([]);
				});

				/**
				 * Every stop waits for the viewer, because the tooltip only
				 * draws its forward button on a step that does.
				 */
				it('waits for the viewer at every stop', () => {
					const impatient = script.steps
						.filter((step) => !step.tooltip?.requireConfirm)
						.map((step) => step.id);

					expect(impatient).toEqual([]);
				});

				/**
				 * The tour runs in the viewer's own account, on their own
				 * records: it looks, and touches nothing.
				 */
				it('never touches anything', () => {
					const touching = script.steps
						.filter((step) => step.action.type !== 'highlight')
						.map((step) => `${step.id}: ${step.action.type}`);

					expect(touching).toEqual([]);
				});
			}
		);
	});
});
