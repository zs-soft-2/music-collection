/**
 * A katalógus és a kérések callable-jei: release-kérés jóváhagyása, általános
 * kiadás, kiadás- és albumtörlés, kérés elbírálása.
 */

import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { database, discogsToken } from './functions-runtime';
import { callerPermissions, requireCaller } from './callable-caller';
import { DiscogsError } from './discogs-versions';
import { approveReleaseRequest as approve } from './release-request-approval';
import { DeletionError, deleteAlbum, deleteRelease } from './catalog-deletion';
import { decideRequest as decide } from './request-decision';
import { RequestDecisionError } from './request-schema';
import {
	ensureGenericRelease as ensureGeneric,
	isGenericReleaseMedia,
} from './generic-release';

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
 * Az album általános kiadása egy hordozón (bakelit, CD, DVD, kazetta): a
 * meglévő, vagy most létrehozva. A gyűjtő ezzel vesz fel egy példányt,
 * amelynek csak a hordozóját tudja — a préselést nem.
 * `{ artistUid, albumUid, media }` → `{ release, created }`.
 */
export const ensureGenericRelease = onCall(async (request) => {
	await requireCaller(request, 'createCollectionItemEntity');

	const artistUid = request.data?.artistUid;
	const albumUid = request.data?.albumUid;
	const media = request.data?.media;

	if (
		typeof artistUid !== 'string' ||
		!artistUid ||
		typeof albumUid !== 'string' ||
		!albumUid
	) {
		throw new HttpsError('invalid-argument', 'Hiányzó album.');
	}
	if (!isGenericReleaseMedia(media)) {
		throw new HttpsError('invalid-argument', 'Érvénytelen hordozó.');
	}

	let result: Awaited<ReturnType<typeof ensureGeneric>>;

	try {
		result = await ensureGeneric(database(), {
			artistUid,
			albumUid,
			media,
		});
	} catch (error) {
		logger.warn(`ensureGenericRelease ${albumUid}/${media}`, error);
		throw new HttpsError(
			'internal',
			'Az általános kiadás létrehozása nem sikerült.'
		);
	}

	if (!result) {
		throw new HttpsError('not-found', 'Nincs ilyen album.');
	}

	return result;
});

/**
 * Egy kiadás törlése a katalógusból. `{ uid }` → `{ uid, deletedTracks,
 * releasedSerials }`.
 *
 * A rules a kliensnek tiltja a kiadás törlését, mert a feltételt csak itt
 * lehet megbízhatóan megnézni: ha bárkinek a gyűjteményében van példány a
 * kiadásból, a törlés `failed-precondition`, és a kliens az archiválást
 * (`active: false`) ajánlja fel helyette. A kiadás saját számai és az
 * elárvult sorszám-foglalások vele mennek.
 */
export const deleteReleaseEntity = onCall(async (request) => {
	await requireCaller(request, 'deleteReleaseEntity');

	try {
		return await deleteRelease(database(), request.data?.uid);
	} catch (error) {
		if (error instanceof DeletionError) {
			throw new HttpsError(error.code, error.message);
		}

		throw error;
	}
});

/**
 * Egy album törlése a katalógusból. `{ uid, artistUid? }` → `{ uid,
 * deletedReleases, deletedTracks, deletedCopies, deletedRatings }`.
 *
 * A préselései, a számai és a közreműködései vele mennek. A hívó saját
 * példányai és értékelései is — a kliens erre előbb rákérdez —, de ha más
 * gyűjtőnek van belőle példánya vagy értékelte, a törlés
 * `failed-precondition`.
 */
export const deleteAlbumEntity = onCall(async (request) => {
	const callerUid = await requireCaller(request, 'deleteAlbumEntity');

	try {
		return await deleteAlbum(
			database(),
			request.data?.uid,
			request.data?.artistUid,
			callerUid
		);
	} catch (error) {
		if (error instanceof DeletionError) {
			throw new HttpsError(error.code, error.message);
		}

		throw error;
	}
});

/**
 * Kérés elbírálása (ADMIN). A gyűjtő kérésének mezőiről az admin egyenként
 * dönt; az elfogadottak a katalógusba kerülnek, és megszületik a válasz
 * (`entity-response`), amiben minden elutasítás mellett ott az indoklás.
 * `{ requestId, verdicts: [{ field, kind, reason? }], adminNote? }`
 */
export const decideRequest = onCall(async (request) => {
	const uid = await requireCaller(request, 'ADMIN');
	const requestId = request.data?.requestId;

	if (typeof requestId !== 'string' || !requestId) {
		throw new HttpsError('invalid-argument', 'Hiányzó requestId.');
	}
	if (!Array.isArray(request.data?.verdicts)) {
		throw new HttpsError('invalid-argument', 'Hiányzó döntések.');
	}

	try {
		return await decide(
			database(),
			{
				requestId,
				verdicts: request.data.verdicts,
				adminNote: request.data?.adminNote ?? null,
			},
			{ adminUid: uid }
		);
	} catch (error) {
		if (error instanceof HttpsError) throw error;
		// A döntés logikája nem ismeri a callable hibáit (a
		// `firebase-functions` importja tesztelhetetlenné tenné); a sajátját
		// itt fordítjuk azzá, amit a kliens olvas.
		if (error instanceof RequestDecisionError) {
			throw new HttpsError(error.code, error.message);
		}

		logger.warn(`decideRequest ${requestId}`, error);

		throw new HttpsError('internal', 'Az elbírálás nem sikerült.');
	}
});
