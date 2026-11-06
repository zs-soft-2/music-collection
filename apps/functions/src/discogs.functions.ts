/** A Discogs-lekérdezések callable-jei, a `discogs-cache` kollekcióval. */

import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
	DISCOGS_CACHE_COLLECTION,
	DISCOGS_CACHE_TTL_MS,
	database,
	discogsToken,
} from './functions-runtime';
import { callerPermissions, requireCaller } from './callable-caller';
import { DiscogsRequestOptions } from './discogs-api';
import { DiscogsArtistProfile, fetchArtistProfile } from './discogs-artist';
import {
	DiscogsLabelCandidate,
	DiscogsLabelProfile,
	fetchLabelProfile,
	searchLabels,
} from './discogs-label';
import {
	fetchArtistAlbums,
	fetchBandProfile,
	fetchMasterProfile,
	searchArtists,
	searchMasters,
} from './discogs-lookup';
import {
	DiscogsError,
	DiscogsVersion,
	fetchMasterVersions,
} from './discogs-versions';

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
 * Egy `discogsLookup` kérés: honnan olvasható a cache-ből, mit kérdezzünk a
 * Discogstól, és mit jelent ott a 404.
 */
interface DiscogsLookupPlan {
	cacheKey: string;
	fetch: (options: DiscogsRequestOptions) => Promise<object>;
	missing: string;
}

/** Kötelező, pozitív egész a kérésből. */
function lookupId(value: unknown, name: string): number {
	const id = Number(value);

	if (!Number.isSafeInteger(id) || id <= 0) {
		throw new HttpsError('invalid-argument', `Érvénytelen ${name}.`);
	}

	return id;
}

/** Kötelező, nem üres szöveg a kérésből. */
function lookupText(value: unknown, name: string): string {
	const term = String(value ?? '').trim();

	if (!term) {
		throw new HttpsError('invalid-argument', `Hiányzó ${name}.`);
	}

	return term;
}

/**
 * Az üres profil ugyanaz a válasz, mint a nem létező: a Discogs 404-e és egy
 * azonosító nélküli előadó között a hívónak nincs mit választania.
 */
async function requirePresent<T>(profile: T | null, what: string): Promise<T> {
	if (!profile) {
		throw new DiscogsError(what, 404);
	}

	return profile;
}

/** Melyik lekérdezés melyik cache-kulcson és melyik Discogs-végponton fut. */
function discogsLookupPlan(kind: string, data: unknown): DiscogsLookupPlan {
	const request = data as Record<string, unknown> | undefined;

	switch (kind) {
		case 'artist-search': {
			const name = lookupText(request?.['name'], 'előadónév');

			return {
				cacheKey: `band-search-${searchCacheKey(name)}`,
				fetch: async (options) => ({
					candidates: await searchArtists(name, options),
				}),
				missing: 'Nincs ilyen Discogs-előadó.',
			};
		}
		case 'artist-profile': {
			const discogsId = lookupId(request?.['discogsId'], 'discogsId');

			return {
				cacheKey: `band-${discogsId}`,
				fetch: async (options) => ({
					profile: await requirePresent(
						await fetchBandProfile(discogsId, options),
						'Üres Discogs-előadó.'
					),
				}),
				missing: 'Nincs ilyen Discogs-előadó.',
			};
		}
		case 'artist-albums': {
			const discogsId = lookupId(request?.['discogsId'], 'discogsId');

			return {
				cacheKey: `band-albums-${discogsId}`,
				fetch: async (options) => ({
					albums: await fetchArtistAlbums(discogsId, options),
				}),
				missing: 'Nincs ilyen Discogs-előadó.',
			};
		}
		case 'master-search': {
			const artist = lookupText(request?.['artist'], 'előadónév');
			const album = lookupText(request?.['album'], 'albumcím');

			return {
				cacheKey: `master-search-${searchCacheKey(
					artist
				)}--${searchCacheKey(album)}`,
				fetch: async (options) => ({
					candidates: await searchMasters(artist, album, options),
				}),
				missing: 'Nincs ilyen Discogs-album.',
			};
		}
		case 'master-profile': {
			const masterId = lookupId(request?.['masterId'], 'masterId');

			return {
				// A `master-{id}` a kiadáslistát tartja (discogsMasterVersions).
				cacheKey: `master-profile-${masterId}`,
				fetch: async (options) => ({
					profile: await requirePresent(
						await fetchMasterProfile(masterId, options),
						'Üres Discogs-master.'
					),
				}),
				missing: 'Nincs ilyen Discogs-album.',
			};
		}
		default:
			throw new HttpsError(
				'invalid-argument',
				`Ismeretlen lekérdezés: ${kind || '—'}.`
			);
	}
}

/**
 * A katalógus-űrlapok Discogs-alternatívája, amikor a MusicBrainz nem ismeri a
 * bandát vagy a lemezt: banda keresése és profilja, diszkográfiája, album
 * (master) keresése és profilja a tracklistával.
 *
 * Öt kérdés egy végponton: a europe-west4-es Cloud Run régiós CPU-kerete (20
 * vCPU) minden új functionnel szűkül, és az öt lekérdezés ugyanazt a tokent,
 * cache-t és hibakezelést használja.
 *
 * `{ kind, … }` → a kind válasza. Előadó- vagy album-szerkesztő, illetve ADMIN
 * hívhatja; minden válasz `discogs-cache/{kulcs}` alatt egy hétig él.
 */
export const discogsLookup = onCall(
	{ secrets: [discogsToken] },
	async (request) => {
		await requireCaller(request, [
			'createArtistEntity',
			'updateArtistEntity',
			'createAlbumEntity',
			'updateAlbumEntity',
		]);

		const kind = String(request.data?.kind ?? '');
		const plan = discogsLookupPlan(kind, request.data);
		const cacheReference = database()
			.collection(DISCOGS_CACHE_COLLECTION)
			.doc(plan.cacheKey);
		const cached = await cacheReference.get();
		const fetchedAt = cached.data()?.fetchedAt as number | undefined;

		if (fetchedAt && Date.now() - fetchedAt < DISCOGS_CACHE_TTL_MS) {
			return cached.data()?.result as object;
		}

		try {
			const result = await plan.fetch({
				token: discogsToken.value() || null,
			});

			await cacheReference.set({ fetchedAt: Date.now(), result });

			return result;
		} catch (error) {
			logger.warn(`discogsLookup ${kind} ${plan.cacheKey}`, error);

			throw discogsFailure(error, plan.missing);
		}
	}
);
