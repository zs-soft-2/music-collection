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
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';

import { DiscogsArtistProfile, fetchArtistProfile } from './discogs-artist';
import {
	DiscogsLabelCandidate,
	DiscogsLabelProfile,
	fetchLabelProfile,
	searchLabels,
} from './discogs-label';
import {
	DiscogsError,
	DiscogsVersion,
	fetchMasterVersions,
} from './discogs-versions';
import {
	generateBadgeCandidates,
	listBadgeModels,
	readBadgeSettings,
	setBadgeImage,
	writeBadgeSettings,
} from './badge-generation';
import {
	createMusicCollection,
	deleteMusicCollection,
	updateMusicCollection,
} from './music-collection-write';
import { DiscogsSearchHit } from './discogs-search';
import { ScanAlbumContext, scanPhoto } from './photo-scan';
import {
	MAX_SHELF_PHOTOS,
	ShelfPhotoContext,
	mergeShelfReads,
	readShelfSignals,
} from './shelf-signals';
import {
	PHOTO_MEDIA_TYPES,
	PhotoInput,
	VisionError,
	createVisionClient,
} from './photo-signals';
import { approveReleaseRequest as approve } from './release-request-approval';
import { syncUpcomingReleases } from './upcoming-release';
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
/**
 * Anthropic API kulcs (Secret Manager, infra/environments) a fotós
 * azonosításhoz. Egy AI-gateway mögé állva a kulcs helyett a gateway tokenje
 * kerül ide, a végpontot pedig az `AI_GATEWAY_URL` környezeti változó adja.
 */
const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');
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
	// Minden callable csak a saját appunkból hívható. A jogosultság-ellenőrzés
	// önmagában nem elég: egy ID token a böngészőből kimásolható, és onnantól a
	// végpontok scriptből, tetszőleges ütemben hívhatók — az
	// `identifyRecordFromPhoto` esetében hívásonként egy modell-kérés árán. Az
	// App Check token azt igazolja, hogy a hívás a mi appunkból jön; a kliens
	// oldali párja a `provideAppCheck` az app.config.ts-ben.
	//
	// Globálisan állítjuk, hogy egy új callable is védetten szülessen.
	enforceAppCheck: true,
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
 * Ekkora base64-képet fogadunk el (kb. 4 MB kép). A kliens 1600 képpontra
 * méretez, ennél nagyobb kép a felismerésen már nem javít.
 */
const MAX_PHOTO_BASE64_LENGTH = 6_000_000;

/** A kliens képe, ha érvényes; `null`, ha nem küldött. */
function readPhotoInput(value: unknown): PhotoInput | null {
	if (!value || typeof value !== 'object') return null;

	const { data, mediaType } = value as Record<string, unknown>;

	if (typeof data !== 'string' || !data) return null;

	if (data.length > MAX_PHOTO_BASE64_LENGTH) {
		throw new HttpsError('invalid-argument', 'A kép túl nagy.');
	}
	if (!PHOTO_MEDIA_TYPES.includes(mediaType as PhotoInput['mediaType'])) {
		throw new HttpsError('invalid-argument', 'Nem támogatott képformátum.');
	}

	return { data, mediaType: mediaType as PhotoInput['mediaType'] };
}

/** Az ismert album, ha a gyűjtő az album oldaláról fotóz. */
function readAlbumContext(value: unknown): ScanAlbumContext | null {
	if (!value || typeof value !== 'object') return null;

	const { name, artistName } = value as Record<string, unknown>;

	if (typeof name !== 'string' || !name.trim()) return null;

	return {
		name: name.trim(),
		artistName:
			typeof artistName === 'string' && artistName.trim()
				? artistName.trim()
				: null,
	};
}

/** A vonalkódos Discogs-keresés cache-e, a master-kiadások mintájára. */
function firestoreBarcodeCache() {
	const reference = (barcode: string) =>
		database()
			.collection(DISCOGS_CACHE_COLLECTION)
			.doc(`barcode-${barcode}`);

	return {
		async read(barcode: string): Promise<DiscogsSearchHit[] | null> {
			const cached = await reference(barcode).get();
			const fetchedAt = cached.data()?.fetchedAt as number | undefined;

			if (!fetchedAt || Date.now() - fetchedAt >= DISCOGS_CACHE_TTL_MS) {
				return null;
			}

			return cached.data()?.hits as DiscogsSearchHit[];
		},
		async write(barcode: string, hits: DiscogsSearchHit[]): Promise<void> {
			await reference(barcode).set({ fetchedAt: Date.now(), hits });
		},
	};
}

/**
 * A Discogs hibájának megfelelő callable-hiba. A `missing` az, amit a 404
 * jelent az adott végponton — másra a hívó nem tud mit lépni.
 */
function discogsFailure(error: unknown, missing: string): HttpsError {
	if (error instanceof DiscogsError && error.status === 404) {
		return new HttpsError('not-found', missing);
	}
	if (error instanceof DiscogsError && error.status === 429) {
		return new HttpsError(
			'resource-exhausted',
			'A Discogs most túlterhelt, próbáld újra egy perc múlva.'
		);
	}

	return new HttpsError('unavailable', 'A Discogs nem érhető el.');
}

/**
 * Keresett szöveg → dokumentum-azonosító. Nem ékezettelenítünk és nem
 * szűkítünk latin betűkre: a nem latin betűs kiadónevek abból csupa
 * kötőjelre fogynának, és egymás találatait olvasnák. A `/` a Firestore-ban
 * útelválasztó, ezért kódoljuk.
 */
function searchCacheKey(term: string): string {
	return encodeURIComponent(term.toLowerCase()).slice(0, 200);
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
 * Egy Discogs kiadó profilja a kiadó szerkesztőűrlapjának Load gombjához.
 * A kiadó szerkesztője (vagy ADMIN) hívhatja; az eredményt
 * `discogs-cache/label-{id}` alatt egy hétig őrizzük.
 */
export const discogsLabelProfile = onCall(
	{ secrets: [discogsToken] },
	async (request) => {
		await requireCaller(request, [
			'createLabelEntity',
			'updateLabelEntity',
		]);

		const labelId = Number(request.data?.labelId);

		if (!Number.isSafeInteger(labelId) || labelId <= 0) {
			throw new HttpsError('invalid-argument', 'Érvénytelen labelId.');
		}

		const cacheReference = database()
			.collection(DISCOGS_CACHE_COLLECTION)
			.doc(`label-${labelId}`);
		const cached = await cacheReference.get();
		const fetchedAt = cached.data()?.fetchedAt as number | undefined;

		if (fetchedAt && Date.now() - fetchedAt < DISCOGS_CACHE_TTL_MS) {
			return cached.data()?.profile as DiscogsLabelProfile;
		}

		try {
			const profile = await fetchLabelProfile(labelId, {
				token: discogsToken.value() || null,
			});

			if (!profile) {
				throw new DiscogsError('Üres Discogs-kiadó.', 404);
			}

			await cacheReference.set({ fetchedAt: Date.now(), profile });

			return profile;
		} catch (error) {
			logger.warn(`discogsLabelProfile ${labelId}`, error);

			throw discogsFailure(error, 'Nincs ilyen Discogs-kiadó.');
		}
	}
);

/**
 * A névre illő Discogs-kiadók: a katalógus kiadói a kiadásokból, névre
 * jönnek létre, így a Load első lépése a keresés. A találatokat
 * `discogs-cache/label-search-{név}` alatt egy hétig őrizzük.
 */
export const discogsLabelSearch = onCall(
	{ secrets: [discogsToken] },
	async (request) => {
		await requireCaller(request, [
			'createLabelEntity',
			'updateLabelEntity',
		]);

		const name = String(request.data?.name ?? '').trim();

		if (!name) {
			throw new HttpsError('invalid-argument', 'Hiányzó kiadónév.');
		}

		const cacheReference = database()
			.collection(DISCOGS_CACHE_COLLECTION)
			.doc(`label-search-${searchCacheKey(name)}`);
		const cached = await cacheReference.get();
		const fetchedAt = cached.data()?.fetchedAt as number | undefined;

		if (fetchedAt && Date.now() - fetchedAt < DISCOGS_CACHE_TTL_MS) {
			return {
				candidates: cached.data()
					?.candidates as DiscogsLabelCandidate[],
			};
		}

		try {
			const candidates = await searchLabels(name, {
				token: discogsToken.value() || null,
			});

			await cacheReference.set({ fetchedAt: Date.now(), candidates });

			return { candidates };
		} catch (error) {
			logger.warn(`discogsLabelSearch ${name}`, error);

			throw discogsFailure(error, 'Nincs ilyen Discogs-kiadó.');
		}
	}
);

/**
 * Egy lemez azonosítása fotóról: a kliens vonalkódja, majd — ha az nem dönt —
 * a képről kiolvasott jelek alapján keres a Discogson. Gyűjtő
 * (createCollectionItemEntity) vagy ADMIN hívhatja.
 *
 * A katalógussal a kliens veti össze a jelölteket; ez a function csak azt
 * mondja meg, mi van a fotón. A vonalkódos kereséseket
 * `discogs-cache/barcode-{ean}` alatt egy hétig őrizzük.
 */
export const identifyRecordFromPhoto = onCall(
	{
		secrets: [discogsToken, anthropicApiKey],
		memory: '512MiB',
		// A képolvasás újrapróbálkozásai is ebbe a keretbe férnek bele.
		timeoutSeconds: 180,
	},
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

		const photo = readPhotoInput(request.data?.photo);
		const barcode = String(request.data?.barcode ?? '').replace(/\D+/g, '');

		if (!photo && !barcode) {
			throw new HttpsError('invalid-argument', 'Kép vagy vonalkód kell.');
		}

		try {
			return await scanPhoto(
				{
					photo,
					barcode: barcode || null,
					album: readAlbumContext(request.data?.album),
				},
				{
					client: createVisionClient(anthropicApiKey.value()),
					discogs: { token: discogsToken.value() || null },
					barcodeCache: firestoreBarcodeCache(),
				}
			);
		} catch (error) {
			logger.warn(`identifyRecordFromPhoto ${uid}`, error);

			// A `details.source` mondja meg a kliensnek, mi akadt el: a
			// modell túlterheltségét „a Discogs nem érhető el"-nek fordítani
			// rossz okot mutat a gyűjtőnek, és rossz megoldást keres hozzá.
			if (error instanceof DiscogsError) {
				throw new HttpsError(
					error.status === 429 ? 'resource-exhausted' : 'unavailable',
					error.status === 429
						? 'A Discogs most túlterhelt, próbáld újra egy perc múlva.'
						: 'A Discogs nem érhető el.',
					{ source: 'discogs' }
				);
			}
			if (error instanceof VisionError) {
				throw new HttpsError(
					error.retryable ? 'resource-exhausted' : 'internal',
					error.message,
					{ source: 'vision' }
				);
			}
			throw new HttpsError(
				'internal',
				'A fotó feldolgozása nem sikerült.',
				{ source: 'unknown' }
			);
		}
	}
);

/** A rekesz hordozója, ha a gyűjtő megadta — csak a kép olvasását szűkíti. */
function readShelfMedia(value: unknown): ShelfPhotoContext['media'] {
	const media = ['vinyl', 'cd', 'cassette', 'dvd'] as const;

	return media.find((known) => known === value) ?? null;
}

/**
 * Egy polcrekesz gerinceinek kiolvasása egy vagy két fotóról. Gyűjtő
 * (createCollectionItemEntity) vagy ADMIN hívhatja.
 *
 * A két fotó két külön modellkérésbe megy: egy kérésben a modell összefésülné
 * őket, és egyetlen magabiztos választ adna — pont az veszne el, amiért a
 * második kép készült. A két független olvasatból derül ki, melyik mezőben
 * nem értenek egyet, és a gyűjtőnek csak azokat kell átnéznie.
 *
 * Préselést itt nem keresünk: rekeszenként tíz-húsz Discogs-kérés belefutna a
 * percenkénti keretbe, és a sorok nagy része a kliensnél lévő katalógusból is
 * megválaszolható. A Discogs a beküldött soroké, a review után.
 */
export const identifyShelfFromPhotos = onCall(
	{
		secrets: [anthropicApiKey],
		memory: '512MiB',
		// Két kép, egyenként egy modellkérés, újrapróbálkozásokkal.
		timeoutSeconds: 300,
	},
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

		const sent = request.data?.photos;
		const photos = (Array.isArray(sent) ? sent : [])
			.map((photo) => readPhotoInput(photo))
			.filter((photo): photo is PhotoInput => !!photo);

		if (!photos.length) {
			throw new HttpsError('invalid-argument', 'Legalább egy kép kell.');
		}
		if (photos.length > MAX_SHELF_PHOTOS) {
			throw new HttpsError(
				'invalid-argument',
				`Legfeljebb ${MAX_SHELF_PHOTOS} kép küldhető egy rekeszről.`
			);
		}

		const context = { media: readShelfMedia(request.data?.media) };
		const client = createVisionClient(anthropicApiKey.value());

		try {
			const reads = await Promise.all(
				photos.map((photo) => readShelfSignals(photo, client, context))
			);

			return { ...mergeShelfReads(reads), usedVision: true };
		} catch (error) {
			logger.warn(`identifyShelfFromPhotos ${uid}`, error);

			if (error instanceof VisionError) {
				throw new HttpsError(
					error.retryable ? 'resource-exhausted' : 'internal',
					error.message,
					{ source: 'vision' }
				);
			}
			throw new HttpsError(
				'internal',
				'A polc feldolgozása nem sikerült.',
				{ source: 'unknown' }
			);
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
 * A hívó uid-je, ha megvan a permissionje — többet felsorolva bármelyikkel.
 * Az ADMIN mindent visz; a bejelentkezés hiánya és a hiányzó jog
 * szándékosan külön hiba.
 */
async function requireCaller(
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

/**
 * Badge-generálás. A prompt a szerveren épül a collection tárolt adataiból —
 * a hívó a uid-et küldi, és a feloldott pontszámot, ami csak a perem
 * gazdagságát mozdítja. A `timeoutSeconds` a képmodell miatt bőséges, a
 * memória a base64 képek miatt.
 */
export const generateMusicCollectionBadge = onCall(
	{ timeoutSeconds: 300, memory: '1GiB' },
	async (request) => {
		await requireCaller(request, 'updateMusicCollectionEntity');

		return generateBadgeCandidates(
			database(),
			process.env['GCLOUD_PROJECT'] ?? '',
			request.data?.uid,
			request.data?.points,
			Date.now()
		);
	}
);

/**
 * A galéria egyik darabjának megjelölése jelvénynek. Kép nem utazik: a
 * rajzolás óta mindegyik fájl, így ide elég a dokumentum azonosítója.
 */
export const setMusicCollectionBadgeImage = onCall(async (request) => {
	await requireCaller(request, 'updateMusicCollectionEntity');

	return setBadgeImage(
		database(),
		request.data?.uid,
		request.data?.documentUid
	);
});

/**
 * A generálás beállításai. A stíluszár szándékosan nincs köztük: az tartja
 * egy készletben a badge-eket, és kódban marad, verziózva.
 */
export const updateBadgeGenerationSettings = onCall(async (request) => {
	await requireCaller(request, 'updateBadgeGenerationSettings');

	return writeBadgeSettings(database(), request.data?.settings);
});

export const readBadgeGenerationSettings = onCall(async (request) => {
	await requireCaller(request, 'updateBadgeGenerationSettings');

	return readBadgeSettings(database());
});

/**
 * A választható képmodellek, a Vertex katalógusából, élőben — hogy a
 * felület ne a mi emlékezetünkből kínáljon modellnevet.
 */
export const listBadgeGenerationModels = onCall(
	{ timeoutSeconds: 60 },
	async (request) => {
		await requireCaller(request, 'updateBadgeGenerationSettings');

		return listBadgeModels(database(), process.env['GCLOUD_PROJECT'] ?? '');
	}
);

/**
 * Ami még nem jelent meg: a katalógus előadóinak következő lemezei a
 * MusicBrainzről, naponta egyszer. A hajnali időpont a MusicBrainz
 * kedvéért is jó — a keret másodpercenként egy kérés, és a futás
 * lapozás közben percekig tart.
 *
 * A `timeoutSeconds` ezért bőséges: egy hónap néhány ezer kiadás, százas
 * lapokban, minden lap után egy másodperc várakozással.
 *
 * Az időzítéshez a Cloud Scheduler API kell (infra/environments
 * `services`); enélkül a deploy elszáll.
 */
export const refreshUpcomingReleases = onSchedule(
	{
		schedule: '30 3 * * *',
		timeZone: 'Europe/Budapest',
		timeoutSeconds: 900,
		memory: '512MiB',
		// Ütemezett futás, nem a böngészőből: App Check tokenje nincs.
		enforceAppCheck: false,
	},
	async () => {
		const result = await syncUpcomingReleases(database());

		logger.info(
			`Upcoming releases: ${result.scanned} kiadásból ${result.matched} a katalógus előadóié (${result.written} írva, ${result.deleted} törölve)`
		);
	}
);

/**
 * Ugyanaz kézzel, az adminnak: az ütemezett futás előtt, vagy ha valami
 * félbemaradt. Drága hívás (percekig fut), ezért ADMIN kell hozzá.
 */
export const syncUpcomingReleasesNow = onCall(
	{ timeoutSeconds: 900, memory: '512MiB' },
	async (request) => {
		await requireCaller(request, 'ADMIN');

		return syncUpcomingReleases(database());
	}
);
