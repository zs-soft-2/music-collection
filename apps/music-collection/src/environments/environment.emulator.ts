/**
 * The end-to-end environment: the app talks to the Firebase emulators only
 * (`firebase.e2e.json`), never to the dev or the prod project. The `emulator`
 * build configuration swaps it in for `environment.ts`.
 *
 * The project id starts with `demo-`, which the emulators treat as a project
 * that does not exist: had anything been left unconnected, it would fail
 * rather than read or write a real project's data. The api key is a
 * placeholder for the same reason; the emulators do not check it.
 *
 * No App Check (the site key is empty) and no analytics: neither has an
 * emulator, and both would reach Google's servers.
 */
import type { EmulatorHosts } from './emulator-hosts';
import { PRIMEUI_LICENSE } from './primeui-license';
import { VERSION } from './version';

export const environment = {
	production: false,
	firebase: {
		apiKey: 'demo-api-key',
		authDomain: 'demo-music-collection.firebaseapp.com',
		projectId: 'demo-music-collection',
		storageBucket: 'demo-music-collection.appspot.com',
		messagingSenderId: '0',
		appId: '1:0:web:0',
		measurementId: '',
	},
	appCheck: {
		recaptchaSiteKey: '',
		debugToken: '',
	},
	analytics: {
		enabled: false,
	},
	primeui: {
		license: PRIMEUI_LICENSE,
	},
	/** The ports of `firebase.e2e.json`; keep the two in step. */
	emulators: {
		host: '127.0.0.1',
		auth: 9511,
		firestore: 9512,
		storage: 9513,
		functions: 9514,
	} as EmulatorHosts | null,
	type: 'emulator',
	/** Base version + per-build suffix (tools/version/generate-version.mjs). */
	version: VERSION.version,
	buildTime: VERSION.buildTime,
};
