/** A megjelenés előtt álló lemezek frissítése: ütemezve és kézzel. */

import { logger } from 'firebase-functions/v2';
import { onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { database } from './functions-runtime';
import { requireCaller } from './callable-caller';
import { syncUpcomingReleases } from './upcoming-release';

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
