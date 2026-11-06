/** A katalógus-bundle-ök: a vendég-bundle ütemezése és az admin callable-ök. */

import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { database } from './functions-runtime';
import { requireCaller } from './callable-caller';
import { composeGuestBundle } from './guest-bundle';
import {
	CatalogBundleError,
	CatalogBundleKind,
	catalogBundleStatus,
	rebuildCatalogBundle as rebuildBundle,
} from './catalog-bundles';

/**
 * A vendég-bundle (`guest-bundle.ts`): a katalógus kirakata annak, aki még
 * nem választott műfajt. Hetente cserél választást, de minden éjjel
 * ránéz: ha a katalógus változott az előző építés óta, ugyanazzal a
 * választással újraépíti, különben egyetlen olvasás után kilép.
 *
 * Napi ütemezés, mint a hét bandájánál: az első éjjel a deploy után már van
 * bundle, és egy kimaradt hétfő sem hagy régi kirakatot egész hétre. Kézi
 * frissítés katalógus-import után: `gcloud scheduler jobs run
 * firebase-schedule-composeGuestBundleDaily-europe-west4`.
 *
 * Fél GiB: a teljes előadó- és albumlista a memóriában áll, amíg a
 * választás készül — néhány ezer dokumentum, keresési előtagokkal együtt —,
 * plusz a zárt kirakat trackjei, közreműködései, tagságai és zenészei
 * (devben 2026-10-15-én ~9 600 dokumentum, helyben ~290 MB RSS).
 */
export const composeGuestBundleDaily = onSchedule(
	{
		schedule: '30 0 * * *',
		timeZone: 'Europe/Budapest',
		timeoutSeconds: 300,
		memory: '512MiB',
		enforceAppCheck: false,
	},
	async () => {
		const result = await composeGuestBundle(
			database(),
			getStorage().bucket()
		);

		logger.info(
			result.built
				? `Vendég-bundle (${result.week}): ${result.collections} collection, ` +
						`${result.count} dokumentum, ${Math.round(result.bytes / 1024)} KB → ${result.path}`
				: `Vendég-bundle (${result.week}): ${
						result.reason === 'current'
							? 'friss, nem kellett építeni'
							: 'nincs publikált collection, amiből építeni lehetne'
					}`
		);
	}
);

/**
 * Admin: minden katalógus-bundle állapota — mikor épült, mennyi dokumentum
 * van benne, és hány változott vagy törlődött azóta (`catalog-bundles.ts`).
 * Aggregációkból számol, nem tölt le dokumentumot: egy hívás pár tucat
 * olvasás.
 */
export const catalogBundleStatusNow = onCall(async (request) => {
	await requireCaller(request, 'ADMIN');

	return { bundles: await catalogBundleStatus(database()) };
});

const BUNDLE_KINDS: CatalogBundleKind[] = ['feature', 'genre', 'guest'];

/**
 * Admin: egy bundle újraépítése most, a scriptek és az éjszakai futás
 * helyett. `{ kind: 'feature' | 'genre' | 'guest', key }`.
 *
 * Egy GiB és fél CPU: a műfaj-bundle-höz az egész katalógust végig kell
 * olvasni (a tagság nem tudja magáról, melyik műfajé), és a rock szelete
 * harmincezer dokumentum. Kilenc perc: ennyi a callable felső határa, egy
 * rock építés ennek töredéke.
 */
export const rebuildCatalogBundle = onCall(
	{
		timeoutSeconds: 540,
		memory: '1GiB',
		// A Cloud Run 512 MiB fölött legalább fél CPU-t követel.
		cpu: 0.5,
	},
	async (request) => {
		await requireCaller(request, 'ADMIN');

		const input = (request.data ?? {}) as { kind?: unknown; key?: unknown };
		const kind = input.kind as CatalogBundleKind;
		const key = typeof input.key === 'string' ? input.key.trim() : '';

		if (!BUNDLE_KINDS.includes(kind) || (kind !== 'guest' && !key)) {
			throw new HttpsError(
				'invalid-argument',
				'A bundle fajtája (feature, genre, guest) és kulcsa kell.'
			);
		}

		try {
			const result = await rebuildBundle(
				database(),
				getStorage().bucket(),
				kind,
				key
			);

			logger.info(
				`Bundle újraépítve kézzel (${kind}/${result.key}): ` +
					`${result.count} dokumentum, ${Math.round(result.bytes / 1024)} KB → ${result.path}`
			);

			return result;
		} catch (error) {
			if (error instanceof CatalogBundleError) {
				throw new HttpsError(error.code, error.message);
			}
			throw error;
		}
	}
);
