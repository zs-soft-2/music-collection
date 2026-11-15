/** A kiadások ritkaságának callable-jei és ütemezett frissítése. */

import { logger } from 'firebase-functions/v2';
import {
	FirestoreEvent,
	Change,
	DocumentSnapshot,
	onDocumentWritten,
} from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { requireCaller } from './callable-caller';
import { database, discogsToken } from './functions-runtime';
import { rarityInputsChanged } from './release-rarity';
import {
	RarityError,
	refreshRaritySlice,
	refreshRelease,
	refreshReleaseByUid,
	setRarityOverride,
} from './release-rarity-refresh';

/** A kiadás szerkesztésének joga: aki a kiadást írhatja, a szintjéről is dönthet. */
const PERMISSION = 'updateReleaseEntity';
/** Az ütemezett futás időkerete; a function ennél valamivel tovább élhet. */
const SLICE_BUDGET_MS = 8 * 60 * 1000;

const discogsOptions = () => ({ token: discogsToken.value() || null });

async function answer<T>(work: () => Promise<T>): Promise<T> {
	try {
		return await work();
	} catch (error) {
		if (error instanceof RarityError) {
			throw new HttpsError(error.code, error.message);
		}

		throw error;
	}
}

/**
 * A katalógus következő szelete, minden éjjel. A Discogs percenkénti kerete
 * miatt egy futás néhány száz kiadást visz; a teljes katalóguson így néhány
 * hét alatt ér körbe, ami egy lassan mozgó számhoz bőven elég.
 */
export const refreshReleaseRarityNightly = onSchedule(
	{
		schedule: '20 2 * * *',
		timeZone: 'Europe/Budapest',
		timeoutSeconds: 540,
		secrets: [discogsToken],
		// Ütemezett futás, nem a böngészőből: App Check tokenje nincs.
		enforceAppCheck: false,
	},
	async () => {
		const result = await refreshRaritySlice(
			database(),
			{ budgetMs: SLICE_BUDGET_MS },
			discogsOptions()
		);

		logger.info(
			`Ritkaság: ${result.processed} kiadás, ${result.changed} változott${
				result.wrapped ? ', a katalógus végére ért' : ''
			}${result.throttled ? ', a Discogs megállított' : ''}`
		);
	}
);

/**
 * Újraszámolás kézzel. `{ uid }` → egy kiadás, azonnal; uid nélkül a katalógus
 * következő szelete, mint az éjszakai futásban — az egész katalógus egy
 * hívásba nem fér bele, a hívó addig ismétli, amíg `wrapped` nem lesz.
 */
export const refreshReleaseRarityNow = onCall(
	{ secrets: [discogsToken], timeoutSeconds: 540 },
	async (request) => {
		await requireCaller(request, PERMISSION);

		return answer<unknown>(() =>
			request.data?.uid
				? refreshReleaseByUid(
						database(),
						request.data.uid,
						discogsOptions()
					)
				: refreshRaritySlice(
						database(),
						{ budgetMs: SLICE_BUDGET_MS },
						discogsOptions()
					)
		);
	}
);

/**
 * A kurátor szintje egy kiadásra. `{ uid, tier, note }`; `tier: null`
 * visszavonja. A `rarity` és a `rarityOverride` a kliensnek nem írható — a
 * gyűjtő pontja múlik rajta —, ezért megy callable-ön át.
 */
export const setReleaseRarityOverride = onCall(
	{ secrets: [discogsToken] },
	async (request) => {
		const uid = await requireCaller(request, PERMISSION);

		return answer(() =>
			setRarityOverride(
				database(),
				request.data ?? {},
				uid,
				discogsOptions()
			)
		);
	}
);

/**
 * Egy kiadás létrejött, vagy változott rajta valami, amiből a szint adódik:
 * a szintje most számolódik ki, nem az éjszakai körben — az hetekig is
 * eltarthat, mire odaér, és addig a kiadás gyakorinak számítana.
 *
 * A saját írására nem fut újra: a `rarity` beírása nem bemenet.
 */
async function rateWrittenRelease(
	event: FirestoreEvent<Change<DocumentSnapshot> | undefined>
): Promise<void> {
	const change = event.data;

	if (
		!change ||
		!rarityInputsChanged(change.before.data(), change.after.data())
	) {
		return;
	}

	const refreshed = await refreshRelease(
		database(),
		change.after.ref,
		discogsOptions()
	);

	logger.info(
		`Ritkaság (${change.after.ref.path}): ${refreshed?.rarity.tier ?? '—'}`
	);
}

/** A kiadások két helyen élnek; mindkettőre ugyanaz a trigger figyel. */
export const rateReleaseOnWrite = onDocumentWritten(
	{
		document: 'artist/{artistId}/album/{albumId}/release/{releaseId}',
		secrets: [discogsToken],
	},
	rateWrittenRelease
);

export const rateRootReleaseOnWrite = onDocumentWritten(
	{ document: 'release/{releaseId}', secrets: [discogsToken] },
	rateWrittenRelease
);
