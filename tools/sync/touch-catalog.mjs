#!/usr/bin/env node
/**
 * Forces the clients to download catalog collections in full.
 *
 *   node tools/sync/touch-catalog.mjs [--env dev|prod]
 *     [--collections artist,album] [--confirm]
 *
 * Needed once when the client cache is introduced (until then the features
 * have no version and the app downloads everything on every start), and after
 * data is changed outside the app and the importer, e.g. in the Firebase
 * console. Default: every catalog collection. Without --confirm it only
 * prints what it would do. Needs Firebase Admin credentials
 * (GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`).
 */

import { parseArgs } from 'node:util';

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { CATALOG_FEATURE_KEYS, touchCatalog } from './catalog-sync.mjs';
import { ENV_OPTION, readEnvironment } from './environment.mjs';

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		collections: { type: 'string' },
		confirm: { type: 'boolean', default: false },
	},
});

const featureKeys = options.collections
	? options.collections.split(',').map((key) => key.trim()).filter(Boolean)
	: CATALOG_FEATURE_KEYS;

const { projectId } = await readEnvironment(options.env);

console.log(
	`${projectId}: full refresh of ${featureKeys.join(', ')}` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to write')
);

if (options.confirm) {
	initializeApp({ credential: applicationDefault(), projectId });
	await touchCatalog(getFirestore(), featureKeys, { reset: true });
	console.log('sync/catalog updated');
}
