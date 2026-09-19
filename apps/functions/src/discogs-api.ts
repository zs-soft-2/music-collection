/**
 * A Discogs API közös része: kérés, hiba, szöveg-normalizálás. Token nélkül
 * 25, tokennel 60 kérés/perc a keret.
 */

const API = 'https://api.discogs.com';
const USER_AGENT = 'MusicCollection/1.0 +https://github.com/zsagia';

export class DiscogsError extends Error {
	public constructor(
		message: string,
		public readonly status: number
	) {
		super(message);
	}
}

export interface DiscogsRequestOptions {
	fetchImpl?: typeof fetch;
	/** Personal access token; nélküle is működik, csak kisebb kerettel. */
	token?: string | null;
}

/** GET egy API-útvonalra (pl. `/releases/123`), JSON válasszal. */
export async function discogsGet<T>(
	path: string,
	{ fetchImpl = fetch, token = null }: DiscogsRequestOptions = {}
): Promise<T> {
	const url = `${API}${path}`;
	const response = await fetchImpl(url, {
		headers: {
			'User-Agent': USER_AGENT,
			...(token ? { Authorization: `Discogs token=${token}` } : {}),
		},
	});

	if (!response.ok) {
		throw new DiscogsError(
			`Discogs ${response.status}: ${url}`,
			response.status
		);
	}

	return (await response.json()) as T;
}

export const text = (value: unknown): string | null =>
	typeof value === 'string' && value.trim() ? value.trim() : null;

/** "1987", "1987-04-20" → 1987; "0" vagy hiány → null. */
export function releasedYear(value: unknown): number | null {
	const match = String(value ?? '').match(/^(\d{4})/);
	const year = match ? Number(match[1]) : 0;

	return year > 0 ? year : null;
}
