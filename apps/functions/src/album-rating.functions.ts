/** A lemez-értékelés közösségi összegének triggere (`album-rating.ts`). */

import { logger } from 'firebase-functions/v2';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

import { USER_COLLECTION, database } from './functions-runtime';
import {
	RATING_COLLECTION,
	syncAlbumRating as syncRatingSummary,
} from './album-rating';

/**
 * Egy gyűjtő értékelése megváltozott: a lemez közösségi átlaga újraszámolódik.
 *
 * A trigger a saját, privát értékelésre figyel — ezt a dokumentumot a
 * szabályok csak a tulajdonosának engedik el —, és kizárólag összeget ír ki
 * (`album-rating/{albumId}`): darabszámot, átlagot, megoszlást. Hogy ki mit
 * adott, nem hagyja el a user dokumentumát.
 *
 * Az ÍRÁS a kliensé, a SZÁMOLÁS a szerveré. Egy kliens-oldali átlaghoz
 * mindenki értékelését olvasni kellene, amit a szabályok helyesen nem
 * engednek; egy increment-alapú összeg pedig hamisan állna, amint a trigger
 * kétszer fut le ugyanarra az írásra. Lásd `album-rating.ts`.
 */
export const syncAlbumRating = onDocumentWritten(
	`${USER_COLLECTION}/{uid}/${RATING_COLLECTION}/{albumId}`,
	async (event) => {
		const { albumId } = event.params;
		const before = event.data?.before.get('stars');
		const after = event.data?.after.get('stars');

		// Semmi, ami az átlagot mozdítaná: a jegyzet átírása ugyanannyi
		// csillag mellett nem közösségi esemény.
		if (before === after) {
			return;
		}

		const result = await syncRatingSummary(database(), albumId);

		logger.info(
			`${albumId} értékelése: ${result.count} csillag (${result.read} olvasás)`
		);
	}
);
