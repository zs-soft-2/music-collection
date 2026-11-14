/** A zeneszám médiájának callable-je (`track-media.ts`). */

import { ZsAiError } from '@zssz-soft/zs-ai-sdk';

import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { database, gatewayApiKey, gatewaySettings } from './functions-runtime';
import { requireCaller } from './callable-caller';
import {
	TrackMediaError,
	drawTrackImage,
	estimateTrackClip,
	listImageModels,
	readTrackClipState,
	startTrackClip,
} from './track-media';
import {
	createArtifactDownloader,
	createGatewayClient,
} from './gateway-client';

/**
 * A zeneszám médiája: kép rajzolása, a klip ára, indítása és állapota — egy
 * végponton (`track-media.ts`).
 *
 * Egy function mindre: a régió CPU-kerete szűk (lásd a globális
 * beállítást), és az ár, a rajzolás, az indítás meg a visszakérdezés
 * ugyanarról a számról szól. Az `action` dönti el, melyik.
 *
 * A prompt a szerveren, a szám tárolt adataiból és a dalszövegéből készül —
 * a hívó a szám uid-jét küldi, a modellt, és legfeljebb egy rövid irányt. A
 * `timeoutSeconds` a jelenetíró és a képmodell miatt bőséges; a videóra nem
 * várunk, azt a gateway futtatja, és a `status` szedi össze.
 *
 * 512 MiB: a kész fájl a memórián át kerül a bucketbe (néhány MB), és ennél
 * többet a Cloud Run már csak fél CPU-val adna — a régiós CPU-keret pedig
 * szűk. Így ez a function is a globális negyeden fut.
 */
export const generateTrackMedia = onCall(
	{
		timeoutSeconds: 300,
		memory: '512MiB',
		secrets: [gatewayApiKey],
	},
	async (request) => {
		const uid = await requireCaller(request, 'updateTrackEntity');
		const trackUid = String(request.data?.trackUid ?? '');
		const action = String(request.data?.action ?? 'status');
		// A sávot a hívó választja — és ha nem választ, nem is kérünk egyet.
		// Egy bedrótozott alapértelmezés itt azt jelentette, hogy minden
		// hívás abba az egy sávba ment, amihez a gateway katalógusában nem
		// volt modell rendelve: a profil-router szándékosan nem esik vissza
		// egy másik sávra, hanem 409-cel megáll
		// (`QUALITY_PROFILE_UNAVAILABLE`). Profil nélkül a gateway a saját
		// alapértelmezését választja, és a kérés él.
		const quality =
			request.data?.qualityProfile === 'premium' ||
			request.data?.qualityProfile === 'normal' ||
			request.data?.qualityProfile === 'economy'
				? request.data.qualityProfile
				: undefined;
		// A rajzolás és a megrendelés is a gatewayen történik; itt a kérés
		// csak elindul és visszajön.
		const client = createGatewayClient(gatewaySettings(), 240_000);

		try {
			if (action === 'models') {
				return { models: await listImageModels(client) };
			}

			if (action === 'image') {
				return await drawTrackImage(
					database(),
					client,
					trackUid,
					{
						model:
							typeof request.data?.model === 'string'
								? request.data.model
								: undefined,
						hint: request.data?.hint,
						quality,
					},
					Date.now()
				);
			}

			if (action === 'estimate') {
				return await estimateTrackClip(
					database(),
					client,
					trackUid,
					quality,
					Date.now()
				);
			}

			if (action === 'start') {
				return await startTrackClip(
					database(),
					client,
					trackUid,
					uid,
					quality,
					Date.now()
				);
			}

			return await readTrackClipState(
				database(),
				client,
				createArtifactDownloader(gatewaySettings()),
				trackUid,
				Date.now()
			);
		} catch (error) {
			if (error instanceof TrackMediaError) {
				// A saját hibánk is a naplóba kerül: a klip állapotát a kliens
				// percenként kérdezi, és egy itt elakadó letöltés korábban
				// semmi nyomot nem hagyott a function naplójában.
				logger.warn(
					`A szám médiája (${action}, ${trackUid}): ${error.message}`
				);
				throw new HttpsError(
					error.reason === 'not-found'
						? 'not-found'
						: error.reason === 'quota'
							? 'resource-exhausted'
							: error.reason === 'running'
								? 'already-exists'
								: error.reason === 'no-lyrics'
									? 'failed-precondition'
									: 'internal',
					error.message,
					{ reason: error.reason }
				);
			}

			logger.error('A szám médiájának generálása elszállt', error);

			// A gateway hibakódja megmondja, hogy van-e értelme újrapróbálni.
			// Egy beállítatlan minőségi sáv, egy jogosulatlan modell vagy egy
			// kimerült keret ugyanúgy jön vissza, mint egy percnyi zavar —
			// „próbáld újra később" pedig mindháromra hazugság: a hívás
			// holnap is ugyanígy áll meg, amíg a gatewayen nem történik
			// valami. A kódot és a gateway saját mondatát ezért kiadjuk; a
			// kliens ezt az üzenetet mutatja a gomb mellett.
			if (error instanceof ZsAiError) {
				throw new HttpsError(
					'failed-precondition',
					`A gateway nem vállalta a hívást (${error.code}): ${error.message}`,
					{ reason: 'gateway-error', code: error.code }
				);
			}

			throw new HttpsError(
				'internal',
				'A generálás nem sikerült. Próbáld újra később.'
			);
		}
	}
);
