#!/usr/bin/env node
/**
 * Szerepkört ad egy felhasználónak a dev projektben — és kiszámolja hozzá az
 * effektív jogosultságokat, hogy a jogosultság-szinkron function nélkül is
 * működjön (bootstrap: az első ADMIN-t senki más nem tudja kiosztani).
 *
 *   node tools/sync/grant-permissions.mjs --uid <uid>
 *     [--role admin] [--permissions ADMIN] [--confirm]
 *
 * Amit ír:
 *   - `role/{roleId}`: a permission-lista (ha még nincs ilyen szerepkör),
 *   - `user/{uid}.roleIds`: a szerepkör hozzáadása,
 *   - `security/users/{uid}/effective_permissions`: ugyanaz az eredmény, amit
 *     a function számolna (apps/functions — calculateEffectivePermissions).
 *
 * Ez az egy igazságforrás: a firestore.rules és a storage.rules is ezt a
 * dokumentumot olvassa. Custom claimet nem használunk (1000 bájtos limit), a
 * korábban kiírt `permissions` claimet a script le is szedi.
 *
 * Prodot nem bánt. --confirm nélkül csak kiírja, mit tenne. Firebase Admin
 * hitelesítés kell hozzá, az Auth API-hoz kvótaprojekt is:
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
		role: { type: 'string', default: 'admin' },
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
	`${projectId}: ${options.uid} → ${options.role} szerepkör (${permissions.join(', ')})` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to write')
);

if (!options.confirm) process.exit(0);

const app = initializeApp({ credential: applicationDefault(), projectId });
const database = getFirestore(app);

// 1. Szerepkör. Ha már létezik, a permissionjeit nem írjuk felül — az a
//    szerepkör-adminisztráció dolga.
const roleReference = database.doc(`role/${options.role}`);
const roleSnapshot = await roleReference.get();

if (!roleSnapshot.exists) {
	await roleReference.set({
		uid: options.role,
		name: options.role.toUpperCase(),
		permissions,
	});
	console.log(`role/${options.role}: létrehozva`);
} else {
	console.log(
		`role/${options.role}: már létezik, a permissionjeit nem írom felül`
	);
}

// 2. A szerepkör hozzáadása a userhez.
await database
	.doc(`user/${options.uid}`)
	.set({ roleIds: FieldValue.arrayUnion(options.role) }, { merge: true });
console.log(`user/${options.uid}.roleIds: ${options.role} hozzáadva`);

// 3. Effektív jogosultságok — ugyanaz az eredmény, mint a functioné.
const user = await database.doc(`user/${options.uid}`).get();
const roles = await database.collection('role').get();
const references = new Set([
	...(user.get('roleIds') ?? []),
	...(user.get('roles') ?? []).flatMap((role) =>
		[role?.uid, role?.name].filter(Boolean)
	),
]);
const matched = roles.docs.filter(
	(role) => references.has(role.id) || references.has(role.get('name'))
);
const effective = {
	permissions: [
		...new Set(matched.flatMap((role) => role.get('permissions') ?? [])),
	].sort(),
	roles: [...new Set(matched.map((role) => role.get('name') || role.id))].sort(),
};

await database
	.doc(`security/users/${options.uid}/effective_permissions`)
	.set({ ...effective, updatedAt: FieldValue.serverTimestamp() });
console.log(
	`security/users/${options.uid}/effective_permissions: ${effective.permissions.length} permission (${effective.roles.join(', ')})`
);

// 4. A régi claim eltakarítása — a szabályok már nem nézik.
const auth = getAuth(app);
const { permissions: legacyClaim, ...claims } =
	(await auth.getUser(options.uid)).customClaims ?? {};

if (legacyClaim) {
	await auth.setCustomUserClaims(options.uid, claims);
	console.log('a régi `permissions` custom claim eltávolítva');
}
