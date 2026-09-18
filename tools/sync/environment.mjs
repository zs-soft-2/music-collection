/**
 * The projects the tool scripts work on. The default is dev
 * (`environment.ts`); prod needs `--env prod`, so no script touches the live
 * data by accident.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENVIRONMENTS = {
	dev: 'environment.ts',
	prod: 'environment.prod.ts',
};

/** The `--env` option, for the scripts' `parseArgs`. */
export const ENV_OPTION = { type: 'string', default: 'dev' };

/** `{ projectId, storageBucket, apiKey }` of the environment, dev by default. */
export async function readEnvironment(env = 'dev') {
	const file = ENVIRONMENTS[env];

	if (!file) {
		throw new Error(
			`unknown environment: ${env} (${Object.keys(ENVIRONMENTS).join(', ')})`
		);
	}

	const source = await readFile(
		join(ROOT, 'apps/music-collection/src/environments', file),
		'utf8'
	);
	const pick = (key) => source.match(new RegExp(`${key}:\\s*'([^']+)'`))?.[1];

	return {
		projectId: pick('projectId'),
		storageBucket: pick('storageBucket'),
		apiKey: pick('apiKey'),
	};
}
