#!/usr/bin/env node
/**
 * Grants permissions in the dev project, standing in for the server function
 * (`calculateEffectivePermissions`) that is not deployed there.
 *
 *   node tools/sync/grant-permissions.mjs --uid <uid> [--permissions ADMIN]
 *     [--confirm]
 *
 * Writes what firestore.rules reads: the `permissions` custom claim and the
 * cached `security/users/{uid}/effective_permissions` document. The rules
 * accept either, the storage rules only the claim. A new claim reaches the
 * client with the next token, so sign out and back in after it. Refuses to
 * touch prod, where the deployed rules are still the permissive ones. Without
 * --confirm it only prints what it would write. Needs Firebase Admin
 * credentials and a quota project for the Auth API:
 * `gcloud auth application-default set-quota-project music-collection-16676`.
 */

import { parseArgs } from 'node:util';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import { readEnvironment } from './environment.mjs';

const { values: options } = parseArgs({
	options: {
		uid: { type: 'string' },
		permissions: { type: 'string', default: 'ADMIN' },
		confirm: { type: 'boolean', default: false },
	},
});

if (!options.uid) throw new Error('--uid is required');

const permissions = options.permissions
	.split(',')
	.map((permission) => permission.trim())
	.filter(Boolean);

const { projectId } = await readEnvironment('dev');

console.log(
	`${projectId}: ${options.uid} → ${permissions.join(', ')}` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to write')
);

if (!options.confirm) process.exit(0);

const app = initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth(app);
const user = await auth.getUser(options.uid);

await auth.setCustomUserClaims(options.uid, {
	...user.customClaims,
	permissions,
});
console.log(`claim: ${user.email} — sign out and back in for a new token`);

await getFirestore(app)
	.doc(`security/users/${options.uid}/effective_permissions`)
	.set({
		permissions,
		roles: ['ADMIN'],
		updatedAt: FieldValue.serverTimestamp(),
	});
console.log(`security/users/${options.uid}/effective_permissions: written`);
