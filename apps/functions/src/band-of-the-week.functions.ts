/** A hét bandájának ütemezett összeállítása (`band-of-the-week.ts`). */

import { logger } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { database } from './functions-runtime';
import { composeBandOfTheWeek } from './band-of-the-week';

/**
 * A hét bandája. Minden éjjel fut, de hetente egyszer ír: idempotens, tehát
 * ha a hét zenekara megvan, a futás nem nyúl hozzá — nem cserélheti le a
 * bandát az alól, aki már hallgatja.
 *
 * Miért napi az ütemezés egy heti dologhoz: így a hétfői futás kimaradása
 * nem visz bandátlan hetet (kedden pótolja), és az első futás sem várat a
 * következő hétfőig — az első éjjel a deploy után már lesz kit mutatni a
 * home főhelyén. Hétfő hajnalban ugyanúgy megvan az új zenekar, mint egy
 * heti ütemezéssel.
 *
 * Tíz perccel a napi kérdés után: mindkettő a katalógusból húz, és semmi
 * értelme egyszerre terhelni vele a Firestore-t.
 */
export const composeBandOfTheWeekDaily = onSchedule(
	{
		schedule: '15 0 * * *',
		timeZone: 'Europe/Budapest',
		timeoutSeconds: 120,
		// Ütemezett futás, nem a böngészőből: App Check tokenje nincs.
		enforceAppCheck: false,
	},
	async () => {
		const result = await composeBandOfTheWeek(database());
		const outcome = {
			created:
				`${result.artistName} ` +
				`(${result.playableAlbums} lejátszható lemez, ` +
				`${result.candidates} jelöltből)`,
			exists: `már megvolt: ${result.artistName}`,
			'no-material':
				'nem akadt zenekar, aki megállná a helyét ' +
				`(${result.candidates} jelölt)`,
		};

		logger.info(
			`A hét bandája (${result.week}): ${outcome[result.reason]}`
		);
	}
);
