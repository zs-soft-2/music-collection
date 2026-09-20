/**
 * A kliens-cache (FirestoreSyncService, libs/api) szinkronja Admin SDK-s
 * írásoknál — ugyanaz, mint a tools/sync/catalog-sync.mjs:
 * - minden írt dokumentum `updatedAt`-et kap (szerveridő),
 * - a törölt dokumentum markert hagy a `sync/{featureKey}/deletion` alatt,
 * - az írással együtt a `sync/catalog.modifiedAt.{featureKey}` is frissül
 *   (ugyanabban a tranzakcióban).
 * A dokumentum feature key-e a gyűjteménye neve.
 */

import {
	DocumentReference,
	FieldValue,
	Firestore,
	Transaction,
} from 'firebase-admin/firestore';

const SYNC_COLLECTION = 'sync';
const CATALOG_SYNC_DOCUMENT = 'catalog';
const DELETION_COLLECTION = 'deletion';
const UPDATED_AT_FIELD = 'updatedAt';

export const stamp = <T extends object>(data: T) => ({
	...data,
	[UPDATED_AT_FIELD]: FieldValue.serverTimestamp(),
});

/** Az érintett feature-ök verziója a tranzakció részeként. */
export function touchCatalog(
	database: Firestore,
	transaction: Transaction,
	featureKeys: string[]
): void {
	transaction.set(
		database.collection(SYNC_COLLECTION).doc(CATALOG_SYNC_DOCUMENT),
		{
			modifiedAt: Object.fromEntries(
				featureKeys.map((key) => [key, FieldValue.serverTimestamp()])
			),
		},
		{ merge: true }
	);
}

/**
 * Törlési marker a `sync/{featureKey}/deletion` alatt: ebből tudja a kliens
 * cache, hogy a dokumentumot le kell vennie. A marker azonosítója a törölt
 * dokumentum path-ja, mint a tools/sync/catalog-sync.mjs-ben.
 */
export function tombstone(
	database: Firestore,
	reference: DocumentReference
): { reference: DocumentReference; data: Record<string, unknown> } {
	return {
		reference: database
			.collection(SYNC_COLLECTION)
			.doc(reference.parent.id)
			.collection(DELETION_COLLECTION)
			.doc(reference.path.split('/').join('~')),
		data: {
			path: reference.path,
			deletedAt: FieldValue.serverTimestamp(),
		},
	};
}

/** Kereső előtagok, mint az app `createSearchParameters`-e. */
export function searchParameters(name: string): string[] {
	const prefixes: string[] = [];
	let prefix = '';

	for (const character of name) {
		prefix += character.toLowerCase();
		prefixes.push(prefix);
	}

	return prefixes;
}

/** Beágyazáshoz: a szinkron-mezőt nem visszük át a másik dokumentumba. */
export function withoutUpdatedAt<T extends Record<string, unknown>>(
	data: T
): Omit<T, typeof UPDATED_AT_FIELD> {
	const { [UPDATED_AT_FIELD]: _updatedAt, ...rest } = data;

	return rest;
}
