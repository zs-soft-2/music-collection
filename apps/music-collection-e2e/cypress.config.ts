import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { defineConfig } from 'cypress';
import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';

/**
 * The emulators of `firebase.e2e.json`. `firebase emulators:exec` hands them
 * to this process; the fallbacks are the same ports, for a run against
 * emulators started by hand.
 */
const EMULATOR_HOSTS = {
	FIRESTORE_EMULATOR_HOST: '127.0.0.1:9512',
	FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9511',
};

async function emulatorTools() {
	for (const [name, value] of Object.entries(EMULATOR_HOSTS)) {
		process.env[name] ??= value;
	}

	// By its file URL: the script is a tool of the workspace, not a library.
	return import(
		pathToFileURL(join(__dirname, '../../tools/e2e/seed-emulator.mjs')).href
	);
}

export default defineConfig({
	e2e: {
		...nxE2EPreset(__dirname),
		// Please ensure you use `cy.origin()` when navigating between domains and remove this option.
		// See https://docs.cypress.io/app/references/migration-guide#Changes-to-cyorigin
		injectDocumentDomain: true,
		// The first visit has the whole app to compile in the dev server and
		// nothing in the browser cache.
		defaultCommandTimeout: 15000,
		video: false,
		// Tall enough for the account menu under the media consent bar.
		viewportWidth: 1280,
		viewportHeight: 900,
		setupNodeEvents(on) {
			on('task', {
				/**
				 * Empties the emulators and writes the seed again
				 * (tools/e2e/seed-emulator.mjs). The script refuses to run
				 * against anything but an emulator.
				 */
				async seed() {
					return (await emulatorTools()).seed();
				},
				/**
				 * The documents of a collection, as the app left them, once
				 * one carries the fields of `where`.
				 */
				async documentsOf({
					path,
					where,
				}: {
					path: string;
					where: Record<string, unknown>;
				}) {
					return (await emulatorTools()).waitForDocuments(
						path,
						where
					);
				},
			});
		},
	},
});
