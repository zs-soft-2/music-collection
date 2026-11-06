/**
 * A callable-ök hívójának jogosultság-ellenőrzése: a hívó effektív
 * jogosultságai a `security/users/{uid}/effective_permissions`
 * dokumentumból.
 */

import { DocumentReference } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';

import { database } from './functions-runtime';

export function effectivePermissionsReference(uid: string): DocumentReference {
	return database().doc(`security/users/${uid}/effective_permissions`);
}

/** A hívó effektív jogosultságai (üres, ha nincs dokumentuma). */
export async function callerPermissions(uid: string): Promise<string[]> {
	const snapshot = await effectivePermissionsReference(uid).get();

	return (snapshot.data()?.permissions ?? []) as string[];
}

/**
 * A hívó uid-je, ha megvan a permissionje — többet felsorolva bármelyikkel.
 * Az ADMIN mindent visz; a bejelentkezés hiánya és a hiányzó jog
 * szándékosan külön hiba.
 */
export async function requireCaller(
	request: CallableRequest,
	permission: string | string[]
): Promise<string> {
	const uid = request.auth?.uid;

	if (!uid) {
		throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
	}

	const permissions = await callerPermissions(uid);
	const accepted = Array.isArray(permission) ? permission : [permission];

	if (
		!permissions.includes('ADMIN') &&
		!accepted.some((name) => permissions.includes(name))
	) {
		throw new HttpsError('permission-denied', 'Nincs jogosultság.');
	}

	return uid;
}
