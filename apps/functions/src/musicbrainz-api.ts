/**
 * A MusicBrainz API közös része a functionsben. Kulcs nem kell hozzá, de a
 * keret szigorú: IP-nként 1 kérés/másodperc, és a User-Agentnek azonosítania
 * kell minket — enélkül 403-at ad.
 *
 * A `libs/api` `MusicBrainzClient`-je ugyanezt csinálja a böngészőben; a
 * functions külön npm-projekt, onnan nem tud importálni, ezért a kettőt
 * együtt kell tartani.
 */

const API = 'https://musicbrainz.org/ws/2';
const USER_AGENT =
	'MusicCollection/1.0 (https://github.com/zsagia/music-collection)';
/** A MusicBrainz másodpercenként egy kérést enged IP-nként. */
export const MUSICBRAINZ_INTERVAL_MS = 1100;
/** 503-ra (keret vagy terhelés) ennyiszer próbálkozunk újra. */
const RETRIES = 4;

export class MusicBrainzError extends Error {
	public constructor(
		message: string,
		public readonly status: number
	) {
		super(message);
	}
}

/** Amit a hívás a `fetch` válaszából használ. */
export interface FetchResponse {
	ok: boolean;
	status: number;
	json(): Promise<unknown>;
}

/**
 * A Node 22 globális `fetch`-e, ennyi a típusából. A típust nem a
 * `@types/node`-ból vesszük: a CI a gyökér (régebbi) `@types/node`-jával
 * fordít, abban a `fetch` még nincs benne.
 */
export type Fetch = (
	url: string,
	init: { headers: Record<string, string> }
) => Promise<FetchResponse>;

const globalFetch: Fetch = (url, init) =>
	(globalThis as unknown as { fetch: Fetch }).fetch(url, init);

const wait = (ms: number): Promise<void> =>
	ms > 0
		? new Promise((resolve) => setTimeout(resolve, ms))
		: Promise.resolve();

export interface MusicBrainzRequestOptions {
	fetchImpl?: Fetch;
	/** Szünet a kérések között; a teszt nullázza. */
	intervalMs?: number;
	/** Csak a teszt kapcsolja ki, hogy ne várjon a 503-újrapróbákra. */
	retries?: number;
}

/**
 * A kerethez tartott legkorábbi indulási idő. Modul-szintű, mert egy
 * function-példányon belül minden hívás ugyanazt az IP-t terheli.
 */
let nextSlot = 0;

/** GET egy API-útvonalra (pl. `/release-group/{id}`), JSON válasszal. */
export async function musicBrainzGet<T>(
	path: string,
	params: Record<string, string | number>,
	{
		fetchImpl = globalFetch,
		intervalMs = MUSICBRAINZ_INTERVAL_MS,
		retries = RETRIES,
	}: MusicBrainzRequestOptions = {}
): Promise<T> {
	const query = new URLSearchParams({ fmt: 'json' });

	for (const [key, value] of Object.entries(params)) {
		query.set(key, String(value));
	}

	const url = `${API}${path}?${query.toString()}`;

	for (let attempt = 0; ; attempt += 1) {
		const now = Date.now();
		const pause = Math.max(0, nextSlot - now);

		nextSlot = now + pause + intervalMs;

		await wait(pause);

		const response = await fetchImpl(url, {
			headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
		});

		if (response.ok) {
			return (await response.json()) as T;
		}

		// 503 a keret túllépése és a terhelés is — mindkettő múlik magától.
		if (response.status === 503 && attempt < retries) {
			await wait((attempt + 1) * 2000);

			continue;
		}

		throw new MusicBrainzError(
			`MusicBrainz ${response.status}: ${url}`,
			response.status
		);
	}
}
