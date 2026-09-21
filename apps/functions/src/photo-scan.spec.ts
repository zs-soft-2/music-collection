import Anthropic from '@anthropic-ai/sdk';

import { FetchResponse } from './discogs-api';
import { PhotoSignals } from './photo-signals';
import { ScanDependencies, scanPhoto } from './photo-scan';

const photo = { data: 'AAAA', mediaType: 'image/jpeg' } as const;

const searchResult = (overrides: Record<string, unknown> = {}) => ({
	id: 1,
	type: 'release',
	title: 'Mercyful Fate - Melissa',
	format: ['Vinyl', 'LP', 'Album'],
	label: ['Roadrunner Records'],
	catno: 'RR 9862',
	country: 'Netherlands',
	barcode: ['7 2064 24425 2 4'],
	year: '1983',
	thumb: null,
	master_id: 42,
	...overrides,
});

const signals = (overrides: Partial<PhotoSignals> = {}): PhotoSignals => ({
	artist: 'Mercyful Fate',
	albumTitle: 'Melissa',
	label: 'Roadrunner Records',
	catalogNumber: 'RR 9862',
	barcode: null,
	media: 'vinyl',
	country: null,
	year: 1983,
	confidence: 'high',
	...overrides,
});

/** A modell helyett: a megadott jeleket adja vissza, és számolja a hívásait. */
function visionClient(value: PhotoSignals) {
	const calls: number[] = [];
	const client = {
		beta: {
			messages: {
				create: async () => {
					calls.push(Date.now());

					return {
						stop_reason: 'end_turn',
						content: [
							{ type: 'text', text: JSON.stringify(value) },
						],
					};
				},
			},
		},
	} as unknown as Anthropic;

	return { client, calls };
}

/** A Discogs helyett: útvonal-részlet → találatok. */
function discogs(routes: Record<string, unknown[]>) {
	const urls: string[] = [];
	const fetchImpl = async (url: string): Promise<FetchResponse> => {
		urls.push(url);

		const match = Object.entries(routes).find(([fragment]) =>
			url.includes(fragment)
		);

		return {
			ok: true,
			status: 200,
			json: async () => ({ results: match?.[1] ?? [] }),
		};
	};

	return { urls, options: { fetchImpl, token: 'secret' } };
}

describe('scanPhoto', () => {
	it('a kliens vonalkódja eldönti — a modell nem is fut', async () => {
		const vision = visionClient(signals());
		const api = discogs({ 'barcode=720642442524': [searchResult()] });

		const result = await scanPhoto(
			{ photo, barcode: '7 2064 24425 2 4' },
			{ client: vision.client, discogs: api.options }
		);

		expect(vision.calls).toHaveLength(0);
		expect(result.usedVision).toBe(false);
		expect(result.signals).toBeNull();
		expect(result.candidates[0]).toMatchObject({
			discogsReleaseId: 1,
			match: 'exact',
		});
	});

	it('vonalkód nélkül a katalógusszám dönt', async () => {
		const vision = visionClient(signals());
		const api = discogs({ 'catno=RR+9862': [searchResult()] });

		const result = await scanPhoto(
			{ photo, barcode: null },
			{ client: vision.client, discogs: api.options }
		);

		expect(vision.calls).toHaveLength(1);
		expect(result.usedVision).toBe(true);
		expect(result.candidates[0].match).toBe('exact');
		expect(api.urls.some((url) => url.includes('label='))).toBe(true);
	});

	it('katalógusszám nélkül az albumig jut el', async () => {
		const vision = visionClient(signals({ catalogNumber: null }));
		const api = discogs({
			'type=master': [
				searchResult({ id: 42, type: 'master', catno: null }),
			],
		});

		const result = await scanPhoto(
			{ photo, barcode: null },
			{ client: vision.client, discogs: api.options }
		);

		expect(result.candidates[0]).toMatchObject({
			discogsReleaseId: null,
			discogsMasterId: 42,
			match: 'likely',
		});
	});

	it('megtartja a gyengébb találatot, ha a következő lépés semmit nem ad', async () => {
		const vision = visionClient(signals());
		// A katalógusszámra más kiadó préselése jön; az albumkeresés üres.
		const api = discogs({
			'catno=RR+9862': [
				searchResult({ id: 7, catno: 'RR-0001', barcode: [] }),
			],
		});

		const result = await scanPhoto(
			{ photo, barcode: null },
			{ client: vision.client, discogs: api.options }
		);

		expect(result.candidates).toHaveLength(1);
		expect(result.candidates[0].discogsReleaseId).toBe(7);
		expect(result.candidates[0].match).toBe('likely');
	});

	it('a cache-elt vonalkód-keresés nem fordul a Discogshoz', async () => {
		const vision = visionClient(signals());
		const api = discogs({ 'barcode=': [searchResult()] });
		const cached = [
			{
				id: 5,
				type: 'release' as const,
				title: 'Mercyful Fate - Melissa',
				artist: 'Mercyful Fate',
				album: 'Melissa',
				formats: ['Vinyl'],
				label: 'Roadrunner Records',
				catno: 'RR 9862',
				country: null,
				barcodes: ['720642442524'],
				year: 1983,
				thumbUrl: null,
				masterId: 42,
			},
		];
		const dependencies: ScanDependencies = {
			client: vision.client,
			discogs: api.options,
			barcodeCache: {
				read: async () => cached,
				write: async () => undefined,
			},
		};

		const result = await scanPhoto(
			{ photo, barcode: '720642442524' },
			dependencies
		);

		expect(api.urls).toHaveLength(0);
		expect(result.candidates[0].discogsReleaseId).toBe(5);
	});

	it('kép nélkül, találat nélküli vonalkódra üres kézzel tér vissza', async () => {
		const vision = visionClient(signals());
		const api = discogs({});

		const result = await scanPhoto(
			{ photo: null, barcode: '720642442524' },
			{ client: vision.client, discogs: api.options }
		);

		expect(result).toEqual({
			signals: null,
			candidates: [],
			usedVision: false,
		});
	});

	it('kép nélkül a vonalkód bizonytalan találatát is megtartja', async () => {
		const vision = visionClient(signals());
		// A vonalkódra más préselés jön: nem pontos egyezés, de jelölt.
		const api = discogs({
			'barcode=': [searchResult({ id: 3, barcode: ['111'] })],
		});

		const result = await scanPhoto(
			{ photo: null, barcode: '720642442524' },
			{ client: vision.client, discogs: api.options }
		);

		expect(result.usedVision).toBe(false);
		expect(result.candidates[0].discogsReleaseId).toBe(3);
		expect(result.candidates[0].match).not.toBe('exact');
	});
});
