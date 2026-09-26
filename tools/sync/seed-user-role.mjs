#!/usr/bin/env node
/**
 * Gondoskodik róla, hogy a `USER` szerepkör létezzen, benne legyenek a
 * gyűjtő alapjogai, és minden user megkapja.
 *
 *   node tools/sync/seed-user-role.mjs [--env dev|prod] [--confirm]
 *
 * Az új user a dokumentuma létrejöttekor kapja meg a `USER` szerepkört
 * (apps/functions — syncUserPermissions); ez a script a már meglévő Auth
 * usereket pótolja — akinek nincs `user/{uid}` dokumentuma, annak létrehozza
 * —, és a szerepkör-dokumentumot hozza létre, ami nélkül a szerepkör semmit
 * nem ér.
 *
 * A szerepkört név vagy azonosító alapján keresi (az admin felületen létrehozott
 * szerepkör azonosítója generált). Ha nincs, `role/USER` néven létrehozza; ha
 * van, a hiányzó alapjogokat hozzáadja, a meglévőket nem veszi el. Utána
 * minden Auth user `roleIds`-ébe beírja, akinél még nincs. Az írásokat a
 * jogosultság-szinkron functionök követik: újraszámolják az effektív
 * jogosultságokat.
 *
 * --confirm nélkül csak kiírja, mit tenne. Firebase Admin hitelesítés kell
 * hozzá (GOOGLE_APPLICATION_CREDENTIALS vagy
 * `gcloud auth application-default login`), az Auth API-hoz kvótaprojekt is.
 */

import { parseArgs } from 'node:util';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import { stamp, touchCatalog } from './catalog-sync.mjs';
import { ENV_OPTION, readEnvironment } from './environment.mjs';

const ROLE = 'USER';

/** A gyűjtő alapjogai: saját példányok és kívánságlista. */
const PERMISSIONS = [
	'createCollectionItemEntity',
	'deleteCollectionItemEntity',
	'updateCollectionItemEntity',
	'viewCollectionItemEntity',
	'createWishlistItemEntity',
	'deleteWishlistItemEntity',
	'updateWishlistItemEntity',
	'viewWishlistItemEntity',
];

const { values: options } = parseArgs({
	options: {
		env: ENV_OPTION,
		confirm: { type: 'boolean', default: false },
	},
});

const { projectId } = await readEnvironment(options.env);

console.log(
	`${projectId}: ${ROLE} szerepkör` +
		(options.confirm ? '' : ' — DRY RUN, add --confirm to write')
);

const app = initializeApp({ credential: applicationDefault(), projectId });
const database = getFirestore(app);

const roles = await database.collection('role').get();
const existing = roles.docs.filter(
	(role) => role.id === ROLE || role.get('name') === ROLE
);

if (existing.length > 1) {
	throw new Error(
		`több ${ROLE} szerepkör is van (${existing.map((role) => role.id).join(', ')}) — előbb rendezd az admin felületen`
	);
}

/** A szerepkör azonosítója — ezt írjuk a userek `roleIds`-ébe. */
const roleId = existing[0]?.id ?? ROLE;

if (!existing.length) {
	console.log(`role/${ROLE}: létrehozás — ${PERMISSIONS.join(', ')}`);

	if (options.confirm) {
		await database
			.doc(`role/${ROLE}`)
			.set({ uid: ROLE, name: ROLE, permissions: PERMISSIONS });
	}
} else {
	const [role] = existing;
	const current = role.get('permissions') ?? [];
	const missing = PERMISSIONS.filter(
		(permission) => !current.includes(permission)
	);

	if (!missing.length) {
		console.log(`role/${role.id}: minden alapjog megvan, nincs teendő`);
	} else {
		console.log(`role/${role.id}: hozzáadás — ${missing.join(', ')}`);

		if (options.confirm) {
			await role.ref.update({
				permissions: FieldValue.arrayUnion(...missing),
			});
		}
	}
}

// A userek: minden Auth usernek legyen `user/{uid}` dokumentuma, és abban a
// `roleIds`-ben a szerepkör. Az Auth uid a kulcs — egy korábbi kliens-hiba
// generált azonosítóval írt user dokumentumokat, azok mögött nincs Auth
// fiók; ezeket csak kilistázzuk, nem nyúlunk hozzájuk.
const auth = getAuth(app);
const authUsers = [];
let pageToken;

do {
	const page = await auth.listUsers(1000, pageToken);

	authUsers.push(...page.users);
	pageToken = page.pageToken;
} while (pageToken);

const userDocuments = await database.collection('user').get();
const documentsById = new Map(
	userDocuments.docs.map((document) => [document.id, document])
);
const writes = [];

for (const authUser of authUsers) {
	const document = documentsById.get(authUser.uid);
	const label = `${authUser.uid} (${authUser.email ?? '—'})`;

	if (!document) {
		console.log(`user/${label}: létrehozás ${roleId} szerepkörrel`);
		writes.push(() =>
			document_(authUser.uid).set(
				stamp({
					uid: authUser.uid,
					displayName: authUser.displayName ?? null,
					email: authUser.email ?? null,
					photoURL: authUser.photoURL ?? null,
					entityType: 'User',
					firstName: '',
					lastName: '',
					phone: '',
					roleIds: [roleId],
				})
			)
		);
	} else if (!(document.get('roleIds') ?? []).includes(roleId)) {
		console.log(`user/${label}: ${roleId} hozzáadása`);
		writes.push(() =>
			document.ref.update(
				stamp({ roleIds: FieldValue.arrayUnion(roleId) })
			)
		);
	}
}

const authUids = new Set(authUsers.map((authUser) => authUser.uid));
const orphans = userDocuments.docs.filter(
	(document) => !authUids.has(document.id)
);

console.log(
	`user: ${writes.length} írás, ${authUsers.length} Auth user` +
		(orphans.length
			? `; ${orphans.length} dokumentum mögött nincs Auth fiók, érintetlen: ${orphans.map((document) => document.id).join(', ')}`
			: '')
);

if (options.confirm && writes.length) {
	for (const write of writes) await write();

	await touchCatalog(database, ['user']);
}

function document_(uid) {
	return database.collection('user').doc(uid);
}
