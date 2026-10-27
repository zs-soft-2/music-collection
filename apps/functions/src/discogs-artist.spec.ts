import { FetchResponse } from './discogs-api';
import {
	fetchArtistProfile,
	stripDiscogsSuffix,
	toArtistProfile,
} from './discogs-artist';

const response = (status: number, body: unknown) =>
	({
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	}) as FetchResponse;

describe('stripDiscogsSuffix', () => {
	it('leveszi az egyértelműsítő utótagot', () => {
		expect(stripDiscogsSuffix('Dennis Dubeau (2)')).toBe('Dennis Dubeau');
		expect(stripDiscogsSuffix('Anthrax')).toBe('Anthrax');
	});
});

describe('toArtistProfile', () => {
	it('a Discogs mezőit a zenész űrlapjának formátumára képezi', () => {
		expect(
			toArtistProfile({
				id: 2166752,
				name: 'Dennis Dubeau (2)',
				realname: ' Dennis Dubeau ',
				profile: 'Canadian drummer. ',
				urls: ['https://example.com', 'example.org', ''],
				namevariations: ['D. Dubeau'],
				aliases: [{ name: 'Dubeau (3)' }, { name: 'Dubeau' }],
				images: [
					{ type: 'secondary', uri: 'https://img/2.jpg' },
					{ type: 'primary', uri: 'https://img/1.jpg' },
				],
			})
		).toEqual({
			id: 2166752,
			name: 'Dennis Dubeau',
			realName: 'Dennis Dubeau',
			description: 'Canadian drummer.',
			sites: ['https://example.com'],
			aliases: ['Dubeau'],
			nameVariations: ['D. Dubeau'],
			imageUrl: 'https://img/1.jpg',
		});
	});

	it('hiányzó mezőkre null és üres lista', () => {
		expect(toArtistProfile({ id: 5, name: 'X' })).toEqual({
			id: 5,
			name: 'X',
			realName: null,
			description: null,
			sites: [],
			aliases: [],
			nameVariations: [],
			imageUrl: null,
		});
	});

	it('érvénytelen azonosítóra null', () => {
		expect(toArtistProfile({ name: 'X' })).toBeNull();
	});
});

describe('fetchArtistProfile', () => {
	it('az /artists/{id} útvonalat kéri le', async () => {
		const fetchImpl = jest.fn(async () =>
			response(200, { id: 7, name: 'Y' })
		);

		const profile = await fetchArtistProfile(7, { fetchImpl });

		expect(fetchImpl).toHaveBeenCalledWith(
			'https://api.discogs.com/artists/7',
			expect.anything()
		);
		expect(profile?.name).toBe('Y');
	});

	it('a Discogs hibáját továbbadja', async () => {
		const fetchImpl = jest.fn(async () => response(404, {}));

		await expect(
			fetchArtistProfile(7, { fetchImpl })
		).rejects.toMatchObject({ status: 404 });
	});
});
