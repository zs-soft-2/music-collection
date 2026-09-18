/**
 * Music Collection — szerveroldali jogosultság-szinkron.
 *
 * A `role/{roleId}.permissions` és a user szerepkör-hivatkozásai
 * (`user/{uid}.roleIds`, illetve a régi, beágyazott `roles`) alapján
 * karbantartja a `security/users/{uid}/effective_permissions` dokumentumot.
 * Ezt olvassa a firestore.rules ÉS a storage.rules (cross-service
 * `firestore.get()`) — egyetlen igazságforrás.
 *
 * Custom claimet SZÁNDÉKOSAN nem írunk: a claimek együtt 1000 bájtba férnek,
 * amit a teljes permission-lista (`createMusicianEntity` és társai) túllépné.
 *
 * A trigger régiója a Firestore adatbázis helye (europe-west4) — eltérő
 * régióval a deploy elszáll.
 */

import { initializeApp } from 'firebase-admin/app';
import {
	DocumentReference,
	FieldValue,
	getFirestore,
} from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

import {
	CatalogRole,
	EffectivePermissions,
	UserDocument,
	calculateEffectivePermissions,
	isSameEffectivePermissions,
	roleReferences,
} from './effective-permissions';

/** A Firestore adatbázis helye; a triggereknek ide kell kerülniük. */
const REGION = 'europe-west4';

const ROLE_COLLECTION = 'role';
const USER_COLLECTION = 'user';

initializeApp();
// A `functions-runtime@` rövidítést a Firebase a projekt azonosítójával egészíti
// ki; a service accountot és a szerepköreit az infra/environments hozza létre.
setGlobalOptions({
	region: REGION,
	maxInstances: 10,
	serviceAccount: 'functions-runtime@',
});

const database = () => getFirestore();

function effectivePermissionsReference(uid: string): DocumentReference {
	return database().doc(`security/users/${uid}/effective_permissions`);
}

async function loadRoles(): Promise<CatalogRole[]> {
	const snapshot = await database().collection(ROLE_COLLECTION).get();

	return snapshot.docs.map((document) => ({
		id: document.id,
		...(document.data() as Omit<CatalogRole, 'id'>),
	}));
}

/**
 * Egy user effektív jogosultságait hozza szinkronba. Csak akkor ír, ha
 * változott valami; a törölt userről a dokumentumot is leveszi.
 */
async function syncUser(uid: string, roles: CatalogRole[]): Promise<boolean> {
	const reference = effectivePermissionsReference(uid);
	const [userSnapshot, currentSnapshot] = await Promise.all([
		database().collection(USER_COLLECTION).doc(uid).get(),
		reference.get(),
	]);

	if (!userSnapshot.exists) {
		if (!currentSnapshot.exists) return false;

		await reference.delete();
		logger.info(`effective_permissions törölve: ${uid}`);

		return true;
	}

	const effective = calculateEffectivePermissions(
		userSnapshot.data() as UserDocument,
		roles
	);
	const current = currentSnapshot.data() as EffectivePermissions | undefined;

	if (isSameEffectivePermissions(current, effective)) return false;

	await reference.set({
		...effective,
		updatedAt: FieldValue.serverTimestamp(),
	});
	logger.info(
		`effective_permissions frissítve: ${uid} — ${effective.permissions.length} permission, szerepkörök: ${effective.roles.join(', ') || '—'}`
	);

	return true;
}

/** Ugyanazokra a szerepkörökre hivatkozik-e a két állapot. */
function sameReferences(before?: UserDocument, after?: UserDocument): boolean {
	const a = roleReferences(before);
	const b = roleReferences(after);

	return a.size === b.size && [...a].every((reference) => b.has(reference));
}

/** A user szerepkör-hivatkozásainak változása. */
export const syncUserPermissions = onDocumentWritten(
	`${USER_COLLECTION}/{uid}`,
	async (event) => {
		const before = event.data?.before.data() as UserDocument | undefined;
		const after = event.data?.after.data() as UserDocument | undefined;

		// A user saját adatainak (név, kép) írása nem érinti a jogosultságot.
		if (
			event.data?.before.exists &&
			event.data?.after.exists &&
			sameReferences(before, after)
		) {
			return;
		}

		await syncUser(event.params.uid, await loadRoles());
	}
);

/** Egy szerepkör permissionjeinek változása minden érintett usert érint. */
export const syncRolePermissions = onDocumentWritten(
	`${ROLE_COLLECTION}/{roleId}`,
	async (event) => {
		const roles = await loadRoles();
		const users = await database().collection(USER_COLLECTION).get();
		// A szerepkör átnevezése is számít, ezért a régi és az új név is
		// hivatkozásnak minősül — egyszerűbb minden usert újraszámolni.
		const changed = await Promise.all(
			users.docs.map((document) => syncUser(document.id, roles))
		);

		logger.info(
			`${event.params.roleId} változott: ${changed.filter(Boolean).length}/${users.size} user frissült`
		);
	}
);

/**
 * Teljes újraszámolás (backfill). ADMIN permission kell hozzá — pont abból a
 * dokumentumból, amit karbantart.
 */
export const resyncEffectivePermissions = onCall(async (request) => {
	const uid = request.auth?.uid;

	if (!uid) {
		throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
	}

	const caller = await effectivePermissionsReference(uid).get();
	const permissions = (caller.data()?.permissions ?? []) as string[];

	if (!permissions.includes('ADMIN')) {
		throw new HttpsError('permission-denied', 'ADMIN permission szükséges.');
	}

	const roles = await loadRoles();
	const users = await database().collection(USER_COLLECTION).get();
	const changed = await Promise.all(
		users.docs.map((document) => syncUser(document.id, roles))
	);

	return { users: users.size, changed: changed.filter(Boolean).length };
});
