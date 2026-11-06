/** A koncertek és a helyszínek: MusicBrainz-betöltés, modell-javaslatok, beállítások. */

import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { database, gatewayApiKey, gatewaySettings } from './functions-runtime';
import { requireCaller } from './callable-caller';
import { syncVenues } from './concert-venue';
import { syncConcerts } from './concert-event';
import {
	ConcertAiError,
	readConcertAiSettings as readConcertSettings,
	sanitizeConcertAiSettings,
	suggestConcerts as askForConcerts,
} from './concert-suggestion';
import { suggestVenues as askForVenues } from './venue-suggestion';
import { createGatewayClient } from './gateway-client';

/**
 * Koncerthelyszínek egy országból, a MusicBrainz `place` entitásából.
 *
 * Ez a feature egyetlen igazán gazdag forrása: Magyarországra 249 hely, száz
 * közülük koordinátával és címmel. Lassú hívás — a MusicBrainz másodpercenként
 * egy kérést enged, és a böngészés százas lapokban megy —, de ritka: a hall
 * ott marad, ahol volt.
 */
export const loadConcertVenues = onCall(
	{ timeoutSeconds: 540, memory: '512MiB' },
	async (request) => {
		await requireCaller(request, 'createVenueEntity');

		return syncVenues(
			database(),
			typeof request.data?.countryCode === 'string'
				? request.data.countryCode
				: 'HU'
		);
	}
);

/**
 * Koncertek a MusicBrainzről, a katalógus előadóira: kötegenként tizenöt
 * MusicBrainz-azonosító egy keresésben.
 *
 * Amit ez a betöltés hoz, az kevés, de biztos: minden koncert mögött ott van
 * egy mbid, ezért jóváhagyás nélkül is kimehet a nyilvános lapra. A lap
 * tartalmát a modell javaslatai adják — azokat a `suggestConcerts` kéri.
 */
export const loadConcertsFromMusicBrainz = onCall(
	{ timeoutSeconds: 900, memory: '512MiB' },
	async (request) => {
		await requireCaller(request, 'createConcertEntity');

		return syncConcerts(
			database(),
			typeof request.data?.countryCode === 'string'
				? request.data.countryCode
				: 'HU',
			{
				windowDays:
					typeof request.data?.days === 'number'
						? request.data.days
						: undefined,
			}
		);
	}
);

/**
 * Koncert-javaslatok egy Vertex modelltől, keresésre támaszkodva.
 *
 * Fizetős hívás, helyszínenként egy kérés, ezért a napi keret a modell előtt
 * fogy (`concert-suggestion.ts`). Amit a modell ad, az a `concert-suggestion`
 * kollekcióba kerül, `pending` állapotban — a nyilvános lapra csak azután jut
 * ki, hogy valaki megnyitotta a hivatkozott forrást és jóváhagyta.
 */
export const suggestConcerts = onCall(
	{ timeoutSeconds: 900, memory: '512MiB', secrets: [gatewayApiKey] },
	async (request) => {
		await requireCaller(request, 'createConcertEntity');

		try {
			return await askForConcerts(
				database(),
				typeof request.data?.countryCode === 'string'
					? request.data.countryCode
					: 'HU',
				// Egy futás több helyszínt kérdez végig, helyszínenként egy
				// keresésre támaszkodó hívással; a keret a function idejéből jön.
				createGatewayClient(gatewaySettings(), 120_000),
				{
					venueUids: Array.isArray(request.data?.venueUids)
						? (request.data.venueUids as string[])
						: undefined,
					windowDays:
						typeof request.data?.days === 'number'
							? request.data.days
							: undefined,
				}
			);
		} catch (error) {
			if (error instanceof ConcertAiError) {
				// Ugyanaz a minta, mint a fotós keretnél: a kód a
				// `details`-ben utazik, a mondat marad mondatnak.
				throw new HttpsError(
					error.reason === 'off'
						? 'failed-precondition'
						: 'resource-exhausted',
					error.message,
					{
						source: 'quota',
						code:
							error.reason === 'off'
								? 'concert-ai-disabled'
								: 'concert-ai-quota',
					}
				);
			}

			throw error;
		}
	}
);

/**
 * Helyszín-javaslatok egy modelltől, keresésre támaszkodva — más országokra.
 *
 * Ugyanaz a keret és ugyanaz a gateway, mint a koncert-javaslatnál: egy
 * kérdés egy kérés, és a kérdés vagy az egész országra megy, vagy a
 * megnevezett városokra, városonként egy kéréssel. Amit a modell ad, az a
 * `venue-suggestion` kollekcióba kerül `pending` állapotban — a katalógus
 * helyszínei közé csak az kerül, amit valaki megnyitott és jóváhagyott.
 */
export const suggestVenues = onCall(
	{ timeoutSeconds: 540, memory: '512MiB', secrets: [gatewayApiKey] },
	async (request) => {
		await requireCaller(request, 'createVenueEntity');

		try {
			return await askForVenues(
				database(),
				typeof request.data?.countryCode === 'string'
					? request.data.countryCode
					: 'HU',
				createGatewayClient(gatewaySettings(), 120_000),
				{
					cities: Array.isArray(request.data?.cities)
						? (request.data.cities as string[])
						: undefined,
				}
			);
		} catch (error) {
			if (error instanceof ConcertAiError) {
				// Ugyanaz a minta, mint a koncert-javaslatnál: a kód a
				// `details`-ben utazik, a mondat marad mondatnak.
				throw new HttpsError(
					error.reason === 'off'
						? 'failed-precondition'
						: 'resource-exhausted',
					error.message,
					{
						source: 'quota',
						code:
							error.reason === 'off'
								? 'concert-ai-disabled'
								: 'concert-ai-quota',
					}
				);
			}

			throw error;
		}
	}
);

export const readConcertAiSettings = onCall(async (request) => {
	await requireCaller(request, 'createConcertEntity');

	return readConcertSettings(database());
});

export const updateConcertAiSettings = onCall(async (request) => {
	await requireCaller(request, 'createConcertEntity');

	const settings = sanitizeConcertAiSettings(request.data?.settings);

	await database()
		.collection('app-setting')
		.doc('concert-ai')
		.set(settings, { merge: true });

	return settings;
});
