/** A collection-definíciók és a badge-ek callable-jei. */

import { onCall } from 'firebase-functions/v2/https';

import { database, gatewayApiKey, gatewaySettings } from './functions-runtime';
import { requireCaller } from './callable-caller';
import {
	adoptBadgeDocument,
	adoptBadgeImage,
	generateBadgeCandidates,
	listSceneModels,
	probeSceneCandidates,
	setBadgeImage,
} from './badge-generation';
import { describeLocks } from './scene-probe-prompt';
import { readBadgeSettings, writeBadgeSettings } from './badge-settings';
import {
	createMusicCollection,
	deleteMusicCollection,
	updateMusicCollection,
} from './music-collection-write';
import { createGatewayClient } from './gateway-client';

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
	// A jelölteket base64-ben mozgatjuk, ezért a nagyobb memória-keret. CPU-ból
	// a globális fél elég: a rajzolás a gatewayen történik, itt a kép csak
	// megérkezik és továbbmegy.
	{
		timeoutSeconds: 300,
		memory: '1GiB',
		// A Cloud Run 512 MiB fölötti memóriához legalább fél CPU-t követel,
		// ezért ez a function nem követi a globális negyedet.
		cpu: 0.5,
		secrets: [gatewayApiKey],
	},
	async (request) => {
		await requireCaller(request, 'updateMusicCollectionEntity');

		// IDEIGLENES: a kollekciók háttérképéhez keressük a stíluszárat, és a
		// próba ezen a function-ön utazik, nem sajáton — a dev régió
		// CPU-kvótája szűk, és egy kísérlet nem vehet el helyet egy valódi
		// funkciótól. A nyertes zárral ez az ág kikerül innen.
		if (request.data?.probe) {
			const client = createGatewayClient(gatewaySettings(), 240_000);

			// A modell-lista nem rajzol, tehát nem kerül semmibe — és ez az
			// egyetlen forrás arra, hogy ez a tenant mihez jogosult. Enélkül
			// a próba vagy találgat, vagy marad a sáv-routing legolcsóbb
			// modelljénél, ami ma mindent rajzol, badge-et is.
			if (request.data.probe.list) {
				// A zárak szövege is innen megy: a lap ebből rakja össze
				// élőben a kimenő promptot, és így nem fordulhat elő, hogy
				// egy beillesztett, kész prompt elé csendben odaragad egy
				// előtag, amiről csak a kész kép árulkodik.
				return {
					models: await listSceneModels(client),
					locks: describeLocks(),
				};
			}

			return probeSceneCandidates(
				database(),
				client,
				request.data.probe,
				Date.now()
			);
		}

		return generateBadgeCandidates(
			database(),
			// A rajzolás a function idejének a java része; a keret a
			// `timeoutSeconds` alatt marad, hogy a hiba a miénk legyen.
			createGatewayClient(gatewaySettings(), 240_000),
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
 * A szerkesztőből feltöltött kép beiktatása jelvénynek. A fájl már a
 * Storage-ban van; innentől dokumentum is van fölötte, a galériában is ott
 * áll, és ez a collection pinje.
 *
 * Két út, egy hívás. A frissen feltöltött kép a fájl útvonalával érkezik —
 * dokumentumot is itt kap. Amire viszont már van dokumentum (egy korábbi
 * collection pinje, egy rajzolt jelölt, egy adminban feltöltött kép), az az
 * azonosítójával: azt nem kell sem feltölteni, sem újra beiktatni.
 */
export const adoptMusicCollectionBadgeImage = onCall(async (request) => {
	await requireCaller(request, 'updateMusicCollectionEntity');

	return request.data?.documentUid
		? adoptBadgeDocument(
				database(),
				request.data?.uid,
				request.data?.documentUid,
				Date.now()
			)
		: adoptBadgeImage(
				database(),
				request.data?.uid,
				request.data?.storagePath,
				request.data?.fileName,
				Date.now()
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

// A `listBadgeGenerationModels` innen kivezetve: a modellt a gateway
// választja, nem az admin. Amíg a régi revízió él, a kliens hívhatná — a
// felület viszont már nem kéri. A Cloud Run szolgáltatást kézzel kell
// eltüntetni: `firebase functions:delete security:listBadgeGenerationModels`.
