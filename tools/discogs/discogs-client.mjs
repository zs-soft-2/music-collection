/**
 * Minimal Discogs API client with rate limiting.
 *
 * Discogs allows 25 requests/minute unauthenticated and 60 with a personal
 * access token (DISCOGS_TOKEN). The client spaces requests evenly and, when
 * the server reports the budget is spent or answers 429, waits a full minute.
 */

const API = 'https://api.discogs.com';
const USER_AGENT = 'MusicCollectionImporter/1.0 +https://github.com/zsagia';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class DiscogsClient {
	#token;
	#minIntervalMs;
	#lastRequestAt = 0;

	constructor(token = process.env.DISCOGS_TOKEN) {
		this.#token = token || null;
		this.#minIntervalMs = this.#token ? 1100 : 2500;
	}

	get authenticated() {
		return !!this.#token;
	}

	async get(path, params = {}) {
		const url = new URL(API + path);
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined && value !== null && value !== '') {
				url.searchParams.set(key, String(value));
			}
		}

		for (let attempt = 1; attempt <= 5; attempt++) {
			const wait = this.#lastRequestAt + this.#minIntervalMs - Date.now();
			if (wait > 0) {
				await sleep(wait);
			}
			this.#lastRequestAt = Date.now();

			const response = await fetch(url, {
				headers: {
					'User-Agent': USER_AGENT,
					...(this.#token
						? { Authorization: `Discogs token=${this.#token}` }
						: {}),
				},
			});

			if (response.status === 429) {
				console.warn(
					`  rate limited, waiting 60s (attempt ${attempt})`
				);
				await sleep(60_000);
				continue;
			}
			if (response.status === 404) {
				return null;
			}
			if (!response.ok) {
				if (response.status >= 500 && attempt < 5) {
					await sleep(5_000 * attempt);
					continue;
				}
				throw new Error(`Discogs ${response.status} for ${url}`);
			}

			const remaining = Number(
				response.headers.get('x-discogs-ratelimit-remaining')
			);
			if (!Number.isNaN(remaining) && remaining <= 1) {
				await sleep(60_000);
			}
			return response.json();
		}
		throw new Error(`Discogs: giving up on ${url}`);
	}
}
