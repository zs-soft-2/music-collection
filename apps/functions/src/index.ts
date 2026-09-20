/**
 * Music Collection — szerveroldali jogosultság-szinkron és Discogs-lekérdezés.
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
import { defineSecret } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import {
	CallableRequest,
	HttpsError,
	onCall,
} from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

import { DiscogsArtistProfile, fetchArtistProfile } from './discogs-artist';
import {
	DiscogsError,
	DiscogsVersion,
	fetchMasterVersions,
} from './discogs-versions';
import {
	createMusicCollection,
	deleteMusicCollection,
	updateMusicCollection,
} from './music-collection-write';
import { approveReleaseRequest as approve } from './release-request-approval';
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
/** A Discogs-válaszok cache-e; csak a function (Admin SDK) éri el. */
const DISCOGS_CACHE_COLLECTION = 'discogs-cache';
/**
 * Discogs personal access token (Secret Manager, infra/environments): 60
 * kérés/perc a token nélküli 25 helyett.
 */
const discogsToken = defineSecret('DISCOGS_TOKEN');
/** Ennyi ideig használjuk a cache-elt kiadáslistát. */
const DISCOGS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const USER_COLLECTION = 'user';

initializeApp();
// A service accountot és a szerepköreit az infra/environments hozza létre. Teljes
// címmel adjuk meg: a `functions-runtime@` rövidítést a CLI secret-hozzáférés
// ellenőrzése nem egészíti ki, és érvénytelen taggal hívná a setIamPolicy-t.
// A GCLOUD_PROJECT-et a CLI a deploy közbeni betöltéskor is beállítja.
setGlobalOptions({
	region: REGION,
	maxInstances: 10,
	serviceAccount: `functions-runtime@${process.env['GCLOUD_PROJECT']}.iam.gserviceaccount.com`,
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
		throw new HttpsError(
			'permission-denied',
			'ADMIN permission szükséges.'
		);
	}

	const roles = await loadRoles();
	const users = await database().collection(USER_COLLECTION).get();
	const changed = await Promise.all(
		users.docs.map((document) => syncUser(document.id, roles))
	);

	return { users: users.size, changed: changed.filter(Boolean).length };
});

/** A hívó effektív jogosultságai (üres, ha nincs dokumentuma). */
async function callerPermissions(uid: string): Promise<string[]> {
	const snapshot = await effectivePermissionsReference(uid).get();

	return (snapshot.data()?.permissions ?? []) as string[];
}

/**
 * Egy Discogs master kiadásai. Gyűjtő (createCollectionItemEntity) vagy ADMIN
 * hívhatja; az eredményt `discogs-cache/master-{id}` alatt egy hétig őrizzük.
 */
export const discogsMasterVersions = onCall(
	{ secrets: [discogsToken] },
	async (request) => {
		const uid = request.auth?.uid;

		if (!uid) {
			throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
		}

		const permissions = await callerPermissions(uid);

		if (
			!permissions.includes('ADMIN') &&
			!permissions.includes('createCollectionItemEntity')
		) {
			throw new HttpsError('permission-denied', 'Nincs jogosultság.');
		}

		const masterId = Number(request.data?.masterId);

		if (!Number.isSafeInteger(masterId) || masterId <= 0) {
			throw new HttpsError('invalid-argument', 'Érvénytelen masterId.');
		}

		const cacheReference = database()
			.collection(DISCOGS_CACHE_COLLECTION)
			.doc(`master-${masterId}`);
		const cached = await cacheReference.get();
		const fetchedAt = cached.data()?.fetchedAt as number | undefined;

		if (fetchedAt && Date.now() - fetchedAt < DISCOGS_CACHE_TTL_MS) {
			return {
				masterId,
				versions: cached.data()?.versions as DiscogsVersion[],
			};
		}

		try {
			const versions = await fetchMasterVersions(masterId, {
				token: discogsToken.value() || null,
			});

			await cacheReference.set({ fetchedAt: Date.now(), versions });

			return { masterId, versions };
		} catch (error) {
			logger.warn(`discogsMasterVersions ${masterId}`, error);

			if (error instanceof DiscogsError && error.status === 404) {
				throw new HttpsError(
					'not-found',
					'Nincs ilyen Discogs master.'
				);
			}
			if (error instanceof DiscogsError && error.status === 429) {
				throw new HttpsError(
					'resource-exhausted',
					'A Discogs most túlterhelt, próbáld újra egy perc múlva.'
				);
			}
			throw new HttpsError('unavailable', 'A Discogs nem érhető el.');
		}
	}
);

/**
 * Egy Discogs előadó profilja a zenész szerkesztőűrlapjának Load gombjához.
 * Csak ADMIN hívhatja; az eredményt `discogs-cache/artist-{id}` alatt egy
 * hétig őrizzük.
 */
export const discogsArtistProfile = onCall(
	{ secrets: [discogsToken] },
	async (request) => {
		const uid = request.auth?.uid;

		if (!uid) {
			throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
		}
		if (!(await callerPermissions(uid)).includes('ADMIN')) {
			throw new HttpsError(
				'permission-denied',
				'ADMIN permission szükséges.'
			);
		}

		const artistId = Number(request.data?.artistId);

		if (!Number.isSafeInteger(artistId) || artistId <= 0) {
			throw new HttpsError('invalid-argument', 'Érvénytelen artistId.');
		}

		const cacheReference = database()
			.collection(DISCOGS_CACHE_COLLECTION)
			.doc(`artist-${artistId}`);
		const cached = await cacheReference.get();
		const fetchedAt = cached.data()?.fetchedAt as number | undefined;

		if (fetchedAt && Date.now() - fetchedAt < DISCOGS_CACHE_TTL_MS) {
			return cached.data()?.profile as DiscogsArtistProfile;
		}

		try {
			const profile = await fetchArtistProfile(artistId, {
				token: discogsToken.value() || null,
			});

			if (!profile) {
				throw new DiscogsError('Üres Discogs-előadó.', 404);
			}

			await cacheReference.set({ fetchedAt: Date.now(), profile });

			return profile;
		} catch (error) {
			logger.warn(`discogsArtistProfile ${artistId}`, error);

			if (error instanceof DiscogsError && error.status === 404) {
				throw new HttpsError(
					'not-found',
					'Nincs ilyen Discogs-előadó.'
				);
			}
			if (error instanceof DiscogsError && error.status === 429) {
				throw new HttpsError(
					'resource-exhausted',
					'A Discogs most túlterhelt, próbáld újra egy perc múlva.'
				);
			}
			throw new HttpsError('unavailable', 'A Discogs nem érhető el.');
		}
	}
);

/**
 * Release-kérés jóváhagyása (ADMIN): a kiadás a katalógusba, egy példány a kérő
 * kollekciójába kerül. `{ requestId, releaseUid? }` — `releaseUid` nélkül a
 * kérés Discogs-kiadását importálja.
 */
export const approveReleaseRequest = onCall(
	{ secrets: [discogsToken] },
	async (request) => {
		const uid = request.auth?.uid;

		if (!uid) {
			throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
		}
		if (!(await callerPermissions(uid)).includes('ADMIN')) {
			throw new HttpsError(
				'permission-denied',
				'ADMIN permission szükséges.'
			);
		}

		const requestId = request.data?.requestId;
		const releaseUid = request.data?.releaseUid ?? null;

		if (typeof requestId !== 'string' || !requestId) {
			throw new HttpsError('invalid-argument', 'Hiányzó requestId.');
		}
		if (releaseUid !== null && typeof releaseUid !== 'string') {
			throw new HttpsError('invalid-argument', 'Érvénytelen releaseUid.');
		}

		try {
			return await approve(
				database(),
				{ requestId, releaseUid },
				{ adminUid: uid, token: discogsToken.value() || null }
			);
		} catch (error) {
			if (error instanceof HttpsError) throw error;

			logger.warn(`approveReleaseRequest ${requestId}`, error);

			if (error instanceof DiscogsError) {
				throw new HttpsError(
					error.status === 404 ? 'not-found' : 'unavailable',
					error.status === 404
						? 'Nincs ilyen Discogs-kiadás.'
						: 'A Discogs nem érhető el.'
				);
			}
			throw new HttpsError('internal', 'A jóváhagyás nem sikerült.');
		}
	}
);

/**
 * A hívó uid-je, ha megvan a permissionje. Az ADMIN mindent visz; a
 * bejelentkezés hiánya és a hiányzó jog szándékosan külön hiba.
 */
async function requireCaller(
	request: CallableRequest,
	permission: string
): Promise<string> {
	const uid = request.auth?.uid;

	if (!uid) {
		throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
	}

	const permissions = await callerPermissions(uid);

	if (!permissions.includes('ADMIN') && !permissions.includes(permission)) {
		throw new HttpsError('permission-denied', 'Nincs jogosultság.');
	}

	return uid;
}

/**
 * Egy collection-definíció létrehozása, módosítása és törlése. A
 * `firestore.rules` a `music-collection` írását a kliensnek tiltja, ezért a
 * szabály validálása és a kliens-cache szinkronja is itt történik.
 */
export const createMusicCollectionEntity = onCall(async (request) => {
	await requireCaller(request, 'createMusicCollectionEntity');

	return createMusicCollection(database(), request.data?.collection);
});

export const updateMusicCollectionEntity = onCall(async (request) => {
	await requireCaller(request, 'updateMusicCollectionEntity');

	return updateMusicCollection(
		database(),
		request.data?.uid,
		request.data?.collection
	);
});

export const deleteMusicCollectionEntity = onCall(async (request) => {
	await requireCaller(request, 'deleteMusicCollectionEntity');

	return deleteMusicCollection(database(), request.data?.uid);
});
