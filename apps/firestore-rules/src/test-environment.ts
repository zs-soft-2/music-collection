import {
	RulesTestEnvironment,
	initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

/** The Firestore emulator of `firebase.json`, which starts these tests. */
const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 9198;
const FIRESTORE = { host: EMULATOR_HOST, port: EMULATOR_PORT };

/**
 * The project id comes from `firebase emulators:exec`, because the emulator
 * runs in single project mode and refuses to be talked to under another name.
 */
const projectId = () =>
	process.env['GCLOUD_PROJECT'] ?? 'music-collection-16676';

/**
 * The emulator, under the rules of the repository.
 *
 * It deliberately sends no ruleset along. `emulators:exec` starts the emulator
 * from `firebase.json`, which names `firestore.rules`, so the rules are on it
 * before the first suite runs. Uploading them again in every `beforeAll` cost
 * about a second each time, and on the build server the first one outlasted
 * the five seconds Jest allows a hook — every test of that suite then failed
 * on the hook rather than on a rule. Should the emulator ever come up without
 * the rules, the suites say so loudly: the `assertFails` cases stop failing.
 */
export function createTestEnvironment(): Promise<RulesTestEnvironment> {
	return initializeTestEnvironment({
		projectId: projectId(),
		firestore: FIRESTORE,
	});
}

/**
 * One round trip before any suite is on the clock. The emulator compiles the
 * ruleset and opens its first connection only when asked, which is the
 * slowest half second of the run, so `globalSetup` pays it where Jest puts no
 * clock on it rather than leaving it to whichever suite happens to go first.
 */
export async function warmUpEmulator(): Promise<void> {
	const testEnv = await createTestEnvironment();

	await testEnv.clearFirestore();
	await testEnv.cleanup();
}
