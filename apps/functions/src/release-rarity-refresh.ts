/**
 * A kiadások ritkaságának kiszámolása és beírása: a Discogs megkérdezése és
 * a Firestore. A szint maga a `release-rarity.ts`-ben dől el.
 *
 * A `firebase-functions` szándékosan nincs behúzva, hogy a modul tesztelhető
 * maradjon; a callable-ök és az ütemezés a `release-rarity.functions.ts`-ben
 * vannak.
 *
 * A Discogs percenként 60 kérést enged (tokennel), ezért a katalógus nem egy
 * futásban megy végig: minden futás egy szeletet visz, és a `release-rarity/
 * state` dokumentumban hagyja, hol tart. Ha a végére ért, elölről kezdi.
 */

import {
	DocumentReference,
	FieldPath,
	Firestore,
	QueryDocumentSnapshot,
} from 'firebase-admin/firestore';

import { stamp, touchCatalog } from './catalog-sync';
import { DiscogsError, DiscogsRequestOptions, discogsGet } from './discogs-api';
import {
	RarityTier,
	ReleaseRarity,
	haveOf,
	rarityChanged,
	rateRelease,
	toRarityInput,
	toTier,
} from './release-rarity';

const RELEASE_COLLECTION = 'release';
const FEATURE_KEYS = [RELEASE_COLLECTION];
/** Csak az Admin SDK éri el: hol tart a katalógus bejárása. */
const STATE_DOCUMENT = 'release-rarity/state';
const CURSOR_FIELD = 'cursor';

/** Két Discogs-kérés között ennyit várunk: 60/perc alatt maradunk. */
const DISCOGS_PAUSE_MS = 1100;
/** Egy futás ennyi kiadást néz meg legfeljebb. */
const SLICE_SIZE = 400;
const MAX_NOTE_LENGTH = 500;

export class RarityError extends Error {
	public constructor(
		message: string,
		public readonly code:
			| 'invalid-argument'
			| 'not-found'
			| 'resource-exhausted' = 'invalid-argument'
	) {
		super(message);
	}
}

export interface RarityRefreshOptions extends DiscogsRequestOptions {
	now?: () => number;
	/** A várakozás; a teszt azonnal visszatérőt ad. */
	sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Hány Discogs-gyűjtőnek van meg a kiadás; null, ha a Discogs nem ismeri.
 * A válaszból csak ez az egy szám megy tovább.
 */
export async function readHave(
	discogsReleaseId: number,
	options: DiscogsRequestOptions = {}
): Promise<number | null> {
	try {
		return haveOf(
			await discogsGet<unknown>(`/releases/${discogsReleaseId}`, options)
		);
	} catch (error) {
		if (error instanceof DiscogsError && error.status === 404) {
			return null;
		}

		throw error;
	}
}

/** Kell-e a Discogs a szinthez: van azonosító, és nem döntött más. */
function discogsIdOf(release: Record<string, unknown>): number | null {
	const id = release['discogsReleaseId'];
	const override = (release['rarityOverride'] ?? {}) as Record<
		string,
		unknown
	>;

	return release['generic'] !== true &&
		toTier(override['tier']) === null &&
		typeof id === 'number' &&
		Number.isSafeInteger(id) &&
		id > 0
		? id
		: null;
}

export interface RefreshedRelease {
	rarity: ReleaseRarity;
	/** Írtunk-e: csak ha a szint vagy a forrása változott. */
	changed: boolean;
	/** Ment-e Discogs-kérés — ettől függ, kell-e utána várni. */
	asked: boolean;
}

/**
 * Egy kiadás szintje, frissen. Csak akkor ír, ha a szint vagy a forrása
 * változott: a „have" hétről hétre mozog, és ha minden mozdulása írás lenne,
 * minden kliens minden futás után újratöltené az egész katalógust.
 */
export async function refreshRelease(
	database: Firestore,
	reference: DocumentReference,
	options: RarityRefreshOptions = {}
): Promise<RefreshedRelease | null> {
	const snapshot = await reference.get();
	const release = snapshot.data();

	if (!release) {
		return null;
	}

	const discogsId = discogsIdOf(release);
	const have = discogsId === null ? null : await readHave(discogsId, options);
	const rarity = rateRelease(
		toRarityInput(release, have),
		(options.now ?? Date.now)()
	);
	const changed = rarityChanged(release['rarity'], rarity);

	if (changed) {
		await database.runTransaction(async (transaction) => {
			transaction.update(reference, stamp({ rarity }));
			touchCatalog(database, transaction, FEATURE_KEYS);
		});
	}

	return { rarity, changed, asked: discogsId !== null };
}

/** A kiadás dokumentumai uid alapján: a beágyazott és a régi, gyökérszintű is. */
async function releaseReferences(
	database: Firestore,
	uid: unknown
): Promise<DocumentReference[]> {
	if (typeof uid !== 'string' || !uid.trim()) {
		throw new RarityError('Hiányzó uid.');
	}

	const found = await database
		.collectionGroup(RELEASE_COLLECTION)
		.where('uid', '==', uid.trim())
		.get();

	if (found.empty) {
		throw new RarityError('Nincs ilyen kiadás.', 'not-found');
	}

	return found.docs.map((document) => document.ref);
}

/** Egy kiadás szintjének újraszámolása, azonnal. */
export async function refreshReleaseByUid(
	database: Firestore,
	uid: unknown,
	options: RarityRefreshOptions = {}
): Promise<{ uid: string; rarity: ReleaseRarity }> {
	const references = await releaseReferences(database, uid);
	let rarity: ReleaseRarity | null = null;

	for (const reference of references) {
		rarity =
			(await refreshRelease(database, reference, options))?.rarity ??
			rarity;
	}

	if (!rarity) {
		throw new RarityError('Nincs ilyen kiadás.', 'not-found');
	}

	return { uid: (uid as string).trim(), rarity };
}

/**
 * A kurátor szintje egy kiadásra, vagy annak visszavonása (`tier: null`).
 * Az indoklás kötelező: a következő kurátornak tudnia kell, hogy döntés
 * volt-e, vagy elírás.
 */
export async function setRarityOverride(
	database: Firestore,
	data: { uid?: unknown; tier?: unknown; note?: unknown },
	byUserId: string,
	options: RarityRefreshOptions = {}
): Promise<{ uid: string; rarity: ReleaseRarity }> {
	const tier: RarityTier | null =
		data.tier === null || data.tier === undefined
			? null
			: toTier(data.tier);

	if (data.tier !== null && data.tier !== undefined && tier === null) {
		throw new RarityError('Érvénytelen ritkasági szint.');
	}

	const note = typeof data.note === 'string' ? data.note.trim() : '';

	if (tier !== null && !note) {
		throw new RarityError('A felülbírálathoz indoklás kell.');
	}
	if (note.length > MAX_NOTE_LENGTH) {
		throw new RarityError('Túl hosszú indoklás.');
	}

	const references = await releaseReferences(database, data.uid);
	const now = (options.now ?? Date.now)();

	await database.runTransaction(async (transaction) => {
		for (const reference of references) {
			transaction.update(
				reference,
				stamp({
					rarityOverride:
						tier === null
							? null
							: { tier, note, byUserId, at: now },
				})
			);
		}
		touchCatalog(database, transaction, FEATURE_KEYS);
	});

	return refreshReleaseByUid(database, data.uid, options);
}

export interface RaritySliceResult {
	processed: number;
	changed: number;
	/** A végére ért, a következő futás elölről kezdi. */
	wrapped: boolean;
	/** A Discogs megálljt mondott; a következő futás innen folytatja. */
	throttled: boolean;
}

/**
 * A katalógus következő szelete. Időkeretet kap, mert a Discogs-várakozás
 * miatt a szelet hossza nem a kiadások számán múlik, hanem azon, hánynak
 * van Discogs-azonosítója.
 */
export async function refreshRaritySlice(
	database: Firestore,
	{ budgetMs, limit = SLICE_SIZE }: { budgetMs: number; limit?: number },
	options: RarityRefreshOptions = {}
): Promise<RaritySliceResult> {
	const now = options.now ?? Date.now;
	const sleep = options.sleep ?? defaultSleep;
	const startedAt = now();
	const state = database.doc(STATE_DOCUMENT);
	const cursor = (await state.get()).get(CURSOR_FIELD) as string | undefined;
	let query = database
		.collectionGroup(RELEASE_COLLECTION)
		.orderBy(FieldPath.documentId())
		.limit(limit);

	if (cursor) {
		query = query.startAfter(cursor);
	}

	const documents: QueryDocumentSnapshot[] = (await query.get()).docs;
	const result: RaritySliceResult = {
		processed: 0,
		changed: 0,
		wrapped: documents.length < limit,
		throttled: false,
	};
	let last = cursor ?? null;

	for (const document of documents) {
		if (now() - startedAt > budgetMs) {
			result.wrapped = false;
			break;
		}

		try {
			const refreshed = await refreshRelease(
				database,
				document.ref,
				options
			);

			result.processed += 1;
			result.changed += refreshed?.changed ? 1 : 0;
			last = document.ref.path;

			if (refreshed?.asked) {
				await sleep(DISCOGS_PAUSE_MS);
			}
		} catch (error) {
			// A keret kimerült: nem lépünk tovább, a kiadás a következő
			// futásban újra sorra kerül.
			if (error instanceof DiscogsError && error.status === 429) {
				result.throttled = true;
				result.wrapped = false;
				break;
			}

			// Egy hibás kiadás nem akaszthatja meg a többit.
			console.error(`Ritkaság: ${document.ref.path}`, error);
			last = document.ref.path;
		}
	}

	await state.set({ [CURSOR_FIELD]: result.wrapped ? null : last });

	return result;
}
