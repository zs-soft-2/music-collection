import { FetchResponse } from './discogs-api';
import {
	fetchLabelProfile,
	searchLabels,
	toLabelCandidate,
	toLabelProfile,
} from './discogs-label';

const response = (status: number, body: unknown) =>
	({
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	}) as FetchResponse;

describe('toLabelProfile', () => {
	it('a Discogs mezőit a kiadó űrlapjának formátumára képezi', () => {
		expect(
			toLabelProfile({
				id: 895,
				name: 'Noise (2)',
				profile: ' German label. ',
				urls: ['https://example.com', 'example.org', ''],
				images: [
					{ type: 'secondary', uri: 'https://img/2.jpg' },
					{ type: 'primary', uri: 'https://img/1.jpg' },
				],
				parent_label: { name: 'Sanctuary Records Group (3)' },
			})
		).toEqual({
			discogsId: 895,
			name: 'Noise',
			description: 'German label.',
			sites: ['https://example.com'],
			imageUrl: 'https://img/1.jpg',
			parentName: 'Sanctuary Records Group',
		});
	});

	it('hiányzó mezőkre null és üres lista', () => {
		expect(toLabelProfile({ id: 5, name: 'X' })).toEqual({
			discogsId: 5,
			name: 'X',
			description: null,
			sites: [],
			imageUrl: null,
			parentName: null,
		});
	});

	it('érvénytelen azonosítóra null', () => {
		expect(toLabelProfile({ name: 'X' })).toBeNull();
	});
});

describe('toLabelCandidate', () => {
	it('a találat azonosítóját és nevét adja', () => {
		expect(
			toLabelCandidate({
				id: 1,
				title: 'Planet E (2)',
				thumb: 'https://img/thumb.jpg',
			})
		).toEqual({
			discogsId: 1,
			name: 'Planet E',
			thumbUrl: 'https://img/thumb.jpg',
		});
	});

	it('név nélküli találatot elhagy', () => {
		expect(toLabelCandidate({ id: 1 })).toBeNull();
	});
});

describe('fetchLabelProfile', () => {
	it('a /labels/{id} útvonalat kéri le', async () => {
		const fetchImpl = jest.fn(async () =>
			response(200, { id: 7, name: 'Y' })
		);

		const profile = await fetchLabelProfile(7, { fetchImpl });

		expect(fetchImpl).toHaveBeenCalledWith(
			'https://api.discogs.com/labels/7',
			expect.anything()
		);
		expect(profile?.name).toBe('Y');
	});

	it('a Discogs hibáját továbbadja', async () => {
		const fetchImpl = jest.fn(async () => response(404, {}));

		await expect(fetchLabelProfile(7, { fetchImpl })).rejects.toMatchObject(
			{ status: 404 }
		);
	});
});

describe('searchLabels', () => {
	it('kiadóra keres, és a használhatatlan találatokat elhagyja', async () => {
		const fetchImpl = jest.fn(async () =>
			response(200, {
				results: [
					{ id: 1, title: 'Noise' },
					{ id: 0, title: 'Broken' },
				],
			})
		);

		const candidates = await searchLabels('Noise', { fetchImpl });

		expect(fetchImpl).toHaveBeenCalledWith(
			'https://api.discogs.com/database/search?q=Noise&type=label&per_page=20',
			expect.anything()
		);
		expect(candidates).toEqual([
			{ discogsId: 1, name: 'Noise', thumbUrl: null },
		]);
	});
});
