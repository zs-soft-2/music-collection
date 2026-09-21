import { FetchResponse } from './discogs-api';
import { rankHits, searchByBarcode, toSearchHit } from './discogs-search';

const response = (status: number, body: unknown) =>
	({
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	}) as FetchResponse;

const hit = (overrides: Record<string, unknown> = {}) => ({
	id: 1,
	type: 'release',
	title: 'Mercyful Fate - Melissa',
	format: ['Vinyl', 'LP', 'Album'],
	label: ['Roadrunner Records'],
	catno: 'RR 9862',
	country: 'Netherlands',
	barcode: ['7 2064 24425 2 4'],
	year: '1983',
	thumb: 'https://img.discogs.com/thumb.jpg',
	master_id: 42,
	...overrides,
});

describe('toSearchHit', () => {
	it('a keresési találatot a fotós azonosítás mezőire képezi', () => {
		expect(toSearchHit(hit())).toEqual({
			id: 1,
			type: 'release',
			title: 'Mercyful Fate - Melissa',
			artist: 'Mercyful Fate',
			album: 'Melissa',
			formats: ['Vinyl', 'LP', 'Album'],
			label: 'Roadrunner Records',
			catno: 'RR 9862',
			country: 'Netherlands',
			barcodes: ['7 2064 24425 2 4'],
			year: 1983,
			thumbUrl: 'https://img.discogs.com/thumb.jpg',
			masterId: 42,
		});
	});

	it('az előadó és a cím nélküli címet albumnak veszi', () => {
		expect(toSearchHit(hit({ title: 'Melissa' }))).toMatchObject({
			artist: null,
			album: 'Melissa',
		});
	});

	it('eldobja az azonosító és a típus nélküli találatot', () => {
		expect(toSearchHit(hit({ id: 0 }))).toBeNull();
		expect(toSearchHit(hit({ type: 'artist' }))).toBeNull();
	});
});

describe('searchByBarcode', () => {
	it('a számjegyekre keres, tokennel', async () => {
		const calls: string[] = [];
		const hits = await searchByBarcode('720642442524', {
			token: 'secret',
			fetchImpl: async (url, init) => {
				calls.push(url);
				expect(init.headers['Authorization']).toBe(
					'Discogs token=secret'
				);

				return response(200, { results: [hit()] });
			},
		});

		expect(calls[0]).toContain('barcode=720642442524');
		expect(calls[0]).toContain('type=release');
		expect(hits).toHaveLength(1);
	});
});

describe('rankHits', () => {
	it('a vonalkód-egyezést pontos találatnak veszi', () => {
		const [best] = rankHits([toSearchHit(hit())!], {
			barcode: '720642442524',
		});

		expect(best.exact).toBe(true);
	});

	it('a katalógusszámot a tagolástól függetlenül egyezteti', () => {
		const [best] = rankHits([toSearchHit(hit({ catno: 'RR-9862' }))!], {
			catalogNumber: 'rr 9862',
		});

		expect(best.exact).toBe(true);
	});

	it('előadó- és cím-egyezésre pontot ad, de nem nevezi pontosnak', () => {
		const [best] = rankHits([toSearchHit(hit({ catno: null }))!], {
			artist: 'Mercyful Fate',
			albumTitle: 'Melissa',
			year: 1983,
		});

		expect(best.exact).toBe(false);
		expect(best.score).toBeGreaterThanOrEqual(4);
	});

	it('az ellentmondó előadó a katalógusszám-egyezést is felülírja', () => {
		// A katalógusszámokat a kiadók újrahasznosítják: ugyanaz a szám egy
		// válogatásé is lehet. Ilyenkor nem ez a lemez, akármit mond a szám.
		const [best] = rankHits(
			[toSearchHit(hit({ title: 'Various - Dutch Steel' }))!],
			{
				artist: 'Mercyful Fate',
				albumTitle: 'Melissa',
				catalogNumber: 'RR 9862',
			}
		);

		expect(best.exact).toBe(false);
	});

	it('a kiadás-utótag nem számít ellentmondásnak', () => {
		const [best] = rankHits(
			[toSearchHit(hit({ title: 'Mercyful Fate - Melissa (Reissue)' }))!],
			{
				artist: 'Mercyful Fate',
				albumTitle: 'Melissa',
				catalogNumber: 'RR 9862',
			}
		);

		expect(best.exact).toBe(true);
	});

	it('a nem hivatalos kiadást hátrasorolja', () => {
		const official = toSearchHit(hit({ id: 1 }))!;
		const bootleg = toSearchHit(
			hit({ id: 2, format: ['Vinyl', 'LP', 'Unofficial Release'] })
		)!;
		const ranked = rankHits([bootleg, official], {
			artist: 'Mercyful Fate',
			albumTitle: 'Melissa',
		});

		expect(ranked[0].id).toBe(1);
	});
});
