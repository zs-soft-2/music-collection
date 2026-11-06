/** A fotós azonosítás callable-jei: egy lemez és egy polcrekesz. */

import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
	DISCOGS_CACHE_COLLECTION,
	DISCOGS_CACHE_TTL_MS,
	database,
	discogsToken,
	gatewayApiKey,
	gatewaySettings,
} from './functions-runtime';
import { callerPermissions } from './callable-caller';
import { DiscogsSearchHit } from './discogs-search';
import { DiscogsError } from './discogs-versions';
import { ScanAlbumContext, scanPhoto } from './photo-scan';
import { ScanQuotaError, reserveVisionRequests } from './photo-scan-quota';
import {
	MAX_SHELF_PHOTOS,
	SHELF_REQUEST_TIMEOUT_MS,
	ShelfPhotoContext,
	mergeShelfReads,
	readShelfSignals,
} from './shelf-signals';
import {
	PHOTO_MEDIA_TYPES,
	PHOTO_REQUEST_TIMEOUT_MS,
	PhotoInput,
} from './photo-signals';
import { VisionError, createVisionClient } from './vision-client';

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
 * Az elfogyott fotós keret callable-hibája. A `source` azért kell, mert a
 * `resource-exhausted` a fotós végpontokon háromfélét jelenthet — túlterhelt
 * Discogs, túlterhelt modell, elfogyott keret —, és a gyűjtőnek csak az első
 * kettőnél érdemes újra megpróbálnia.
 */
function scanQuotaFailure(error: ScanQuotaError): HttpsError {
	return new HttpsError(
		error.reason === 'off' ? 'failed-precondition' : 'resource-exhausted',
		error.message,
		{ source: 'quota' }
	);
}

/**
 * Egy lemez azonosítása fotóról: a kliens vonalkódja, majd — ha az nem dönt —
 * a képről kiolvasott jelek alapján keres a Discogson. Gyűjtő
 * (createCollectionItemEntity) vagy ADMIN hívhatja.
 *
 * A katalógussal a kliens veti össze a jelölteket; ez a function csak azt
 * mondja meg, mi van a fotón. A vonalkódos kereséseket
 * `discogs-cache/barcode-{ean}` alatt egy hétig őrizzük.
 *
 * A modell hívása napi keretbe fér (`photo-scan-quota.ts`), gyűjtőnként: a
 * jogosultság azt mondja meg, hogy a hívó gyűjthet, nem azt, hogy mennyit
 * költhet.
 */
export const identifyRecordFromPhoto = onCall(
	{
		secrets: [discogsToken, gatewayApiKey],
		memory: '512MiB',
		// A globális negyednél több: a kép base64-be csomagolása és a válasz
		// feldolgozása számol, nem csak vár. Egész CPU-t akkor kapott, amikor
		// a modellt még innen hívtuk — azóta a gateway hívja, és a fél elég.
		cpu: 0.5,
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
					client: createVisionClient(
						gatewaySettings(),
						PHOTO_REQUEST_TIMEOUT_MS
					),
					discogs: { token: discogsToken.value() || null },
					barcodeCache: firestoreBarcodeCache(),
					// A napi keret: a kép elolvasása előtt fogy, a vonalkóddal
					// eldőlt keresés tehát ingyen van.
					reserveVision: async () => {
						await reserveVisionRequests(
							database(),
							uid,
							1,
							Date.now()
						);
					},
				}
			);
		} catch (error) {
			// Az elfogyott keret nem a mi hibánk és nem is múló baj: pontos
			// üzenet tartozik hozzá, nem az alábbi „valami hiba történt".
			if (error instanceof ScanQuotaError) throw scanQuotaFailure(error);

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
 *
 * A két kérés a gyűjtő napi fotós keretéből megy (`photo-scan-quota.ts`) —
 * ugyanabból, amiből az egy lemezt azonosító hívás.
 */
export const identifyShelfFromPhotos = onCall(
	{
		secrets: [gatewayApiKey],
		memory: '512MiB',
		// Mint az `identifyRecordFromPhoto`, csak két képpel.
		cpu: 0.5,
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
		const client = createVisionClient(
			gatewaySettings(),
			SHELF_REQUEST_TIMEOUT_MS
		);

		try {
			// Minden fotó egy-egy modellkérés, és mindegyik el is indul — a
			// keretet ezért egyben, előre vonjuk le. Ha nincs benne mind, egy
			// sem fut le: egy félig elolvasott rekesz a gyűjtőnek semmit nem ér.
			await reserveVisionRequests(
				database(),
				uid,
				photos.length,
				Date.now()
			);

			const reads = await Promise.all(
				photos.map((photo) => readShelfSignals(photo, client, context))
			);

			return { ...mergeShelfReads(reads), usedVision: true };
		} catch (error) {
			if (error instanceof ScanQuotaError) throw scanQuotaFailure(error);

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
