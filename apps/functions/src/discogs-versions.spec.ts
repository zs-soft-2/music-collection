import { FetchResponse } from './discogs-api';
import {
	DiscogsError,
	fetchMasterVersions,
	formatText,
	releasedYear,
	toDiscogsVersion,
} from './discogs-versions';

const response = (status: number, body: unknown) =>
	({
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	}) as FetchResponse;

describe('releasedYear', () => {
	it('az évet veszi a dátum elejéről', () => {
		expect(releasedYear('1987-04-20')).toBe(1987);
		expect(releasedYear('2016')).toBe(2016);
	});

	it('ismeretlen dátumra null', () => {
		expect(releasedYear('0')).toBeNull();
		expect(releasedYear(undefined)).toBeNull();
	});
});

describe('formatText', () => {
	it('a hordozót a leírás elé teszi, ismétlés nélkül', () => {
		expect(formatText(['CD'], 'Album')).toBe('CD, Album');
		expect(formatText(['Vinyl'], 'Vinyl, LP')).toBe('Vinyl, LP');
		expect(formatText([], null)).toBeNull();
	});
});

describe('toDiscogsVersion', () => {
	it('a Discogs mezőit a kliens formátumára képezi', () => {
		expect(
			toDiscogsVersion({
				id: 123,
				title: 'Among The Living',
				format: 'LP, Album',
				major_formats: ['Vinyl'],
				label: 'Megaforce Worldwide',
				catno: '81741-1',
				country: 'US',
				released: '1987-03-22',
				thumb: '',
			})
		).toEqual({
			id: 123,
			title: 'Among The Living',
			format: 'Vinyl, LP, Album',
			majorFormats: ['Vinyl'],
			label: 'Megaforce Worldwide',
			catno: '81741-1',
			country: 'US',
			year: 1987,
			thumbUrl: null,
		});
	});

	it('azonosító nélküli elemet eldob', () => {
		expect(toDiscogsVersion({ title: 'x' })).toBeNull();
	});
});

describe('fetchMasterVersions', () => {
	it('minden lapot lekér, és év szerint rendez', async () => {
		const fetchImpl = jest
			.fn()
			.mockResolvedValueOnce(
				response(200, {
					pagination: { pages: 2 },
					versions: [{ id: 2, released: '2016' }],
				})
			)
			.mockResolvedValueOnce(
				response(200, {
					pagination: { pages: 2 },
					versions: [{ id: 1, released: '1987' }],
				})
			);

		const versions = await fetchMasterVersions(42, { fetchImpl });

		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(fetchImpl.mock.calls[1][0]).toContain('/masters/42/versions');
		expect(versions.map((version) => version.id)).toEqual([1, 2]);
	});

	it('hibás válasznál a státusszal együtt dob', async () => {
		const fetchImpl = jest.fn().mockResolvedValue(response(404, {}));

		await expect(fetchMasterVersions(42, { fetchImpl })).rejects.toEqual(
			expect.objectContaining({ status: 404 })
		);
		await expect(
			fetchMasterVersions(42, { fetchImpl })
		).rejects.toBeInstanceOf(DiscogsError);
	});
});
