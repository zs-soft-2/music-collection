import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
	RulesTestEnvironment,
	initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

/** The Firestore emulator of `firebase.json`, which starts these tests. */
const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 9198;

/**
 * The rules of the repository, against the running emulator. The project id
 * comes from `firebase emulators:exec`, because the emulator runs in single
 * project mode and refuses to be talked to under another name.
 */
export function createTestEnvironment(): Promise<RulesTestEnvironment> {
	return initializeTestEnvironment({
		projectId: process.env['GCLOUD_PROJECT'] ?? 'music-collection-16676',
		firestore: {
			rules: readFileSync(RULES_PATH, 'utf8'),
			host: EMULATOR_HOST,
			port: EMULATOR_PORT,
		},
	});
}
