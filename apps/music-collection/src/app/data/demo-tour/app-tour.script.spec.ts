import { readFileSync } from 'fs';
import { join } from 'path';

import { NavigatePayload } from '@zssz-soft/demo-autopilot-core';

import { routes } from '../../app-routing';
import { appTourScript } from './app-tour.script';

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

/** The value at `tour.app.steps.welcome.title`, or undefined. */
function valueAt(key: string): unknown {
	return key
		.split('.')
		.reduce<unknown>(
			(node, part) =>
				(node as Record<string, unknown> | undefined)?.[part],
			dictionary
		);
}

const steps = appTourScript.steps;

/**
 * The tour is played against the running app, so nothing here can be checked
 * by running it: a renamed route or a missing dictionary key would only show
 * up as a walkthrough that dies halfway through, in front of whoever was being
 * shown around. These are the three ways it can rot.
 */
describe('appTourScript', () => {
	it('names every step once', () => {
		const ids = steps.map((step) => step.id);

		expect(ids).toEqual([...new Set(ids)]);
	});

	it('is introduced in the dictionary', () => {
		expect(typeof valueAt(appTourScript.name)).toBe('string');
		expect(typeof valueAt(appTourScript.description ?? '')).toBe('string');
	});

	it('has words for every step that says something', () => {
		const missing = steps
			.filter((step) => step.tooltip)
			.flatMap((step) => [
				step.tooltip?.title ?? '',
				step.tooltip?.content ?? '',
			])
			.filter((key) => typeof valueAt(key) !== 'string');

		expect(missing).toEqual([]);
	});

	/**
	 * The spotlight is cut out of whatever the selector finds; a step with a
	 * tooltip and nothing to point at would dim the whole screen instead.
	 */
	it('points at something wherever it talks', () => {
		const pointless = steps
			.filter((step) => step.tooltip)
			.filter((step) => !step.highlight?.selector)
			.map((step) => step.id);

		expect(pointless).toEqual([]);
	});

	it('only walks to routes the app has', () => {
		const known = new Set(
			routes.map((route) => route.path).filter(Boolean)
		);

		const walked = [
			appTourScript.setup?.initialRoute ?? '',
			...steps
				.filter((step) => step.action.type === 'navigate')
				.map((step) => (step.action.payload as NavigatePayload).route),
		];

		const strangers = walked.filter(
			(route) => !known.has(route.replace(/^\//, ''))
		);

		expect(strangers).toEqual([]);
	});

	/**
	 * Every stop in the tour is a look at a page, never a click that writes
	 * something: the walkthrough runs in the collector's own account, on their
	 * own records, and it must leave them exactly as it found them.
	 */
	it('never touches anything', () => {
		const touching = steps
			.filter(
				(step) =>
					!['navigate', 'highlight', 'wait', 'scroll'].includes(
						step.action.type
					)
			)
			.map((step) => `${step.id}: ${step.action.type}`);

		expect(touching).toEqual([]);
	});
});
