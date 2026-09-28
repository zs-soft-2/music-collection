import { FetchResponse } from './discogs-api';
import {
	fetchArtistAlbums,
	searchArtists,
	toArtistAlbums,
	toBandProfile,
	toMasterProfile,
	toMasterTracks,
} from './discogs-lookup';

const response = (status: number, body: unknown) =>
	({
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	}) as FetchResponse;

describe('toBandProfile', () => {
	it('a Discogs előadóját a kliens formájára képezi', () => {
		expect(
			toBandProfile({
				id: 152122,
				name: 'Testament (2)',
				profile: 'Thrash metal band from Berkeley.',
				urls: ['https://testamentlegions.com', 'nem url'],
				images: [
					{ type: 'secondary', uri: 'https://img/2.jpg' },
					{ type: 'primary', uri: 'https://img/1.jpg' },
				],
				members: [
					{ id: 1, name: 'Chuck Billy', active: true },
					{ id: 2, name: 'Alex Skolnick (2)', active: false },
					{ id: 3, name: '' },
				],
			})
		).toEqual({
			discogsId: 152122,
			name: 'Testament',
			description: 'Thrash metal band from Berkeley.',
			sites: ['https://testamentlegions.com'],
			imageUrl: 'https://img/1.jpg',
			styles: [],
			members: [
				{ discogsId: 1, name: 'Chuck Billy', active: true },
				{ discogsId: 2, name: 'Alex Skolnick', active: false },
			],
		});
	});

	it('azonosító nélküli előadóra null', () => {
		expect(toBandProfile({ name: 'Testament' })).toBeNull();
	});
});

describe('searchArtists', () => {
	it('a pontos névegyezéseket adja, utótag nélkül', async () => {
		const hits = await searchArtists('Nirvana', {
			fetchImpl: async () =>
				response(200, {
					results: [
						{
							id: 125246,
							title: 'Nirvana (2)',
							thumb: 'https://t/1',
						},
						{ id: 252122, title: 'Nirvana UK', thumb: '' },
						{ id: 99, title: 'Nirvana', thumb: '' },
					],
				}),
		});

		expect(hits).toEqual([
			{ discogsId: 125246, name: 'Nirvana', thumbUrl: 'https://t/1' },
			{ discogsId: 99, name: 'Nirvana', thumbUrl: null },
		]);
	});

	it('pontos egyezés nélkül a legelső találatot adja', async () => {
		// Ugyanaz, amit a MusicBrainz-út tesz: az admin a forráslapon dönt.
		const hits = await searchArtists('Sacrilege BC', {
			fetchImpl: async () =>
				response(200, {
					results: [
						{ id: 1, title: 'Sacrilege B.C.', thumb: '' },
						{ id: 2, title: 'Sacrilege', thumb: '' },
					],
				}),
		});

		expect(hits).toEqual([
			{ discogsId: 1, name: 'Sacrilege B.C.', thumbUrl: null },
		]);
	});
});

describe('toArtistAlbums', () => {
	it('csak a saját kiadványokat veszi, a régebbieket előre', () => {
		expect(
			toArtistAlbums([
				{
					id: 3,
					type: 'master',
					title: 'The Legacy',
					role: 'Main',
					year: 1987,
					thumb: 'https://t/3',
					format: 'LP, Album',
				},
				{
					id: 4,
					type: 'release',
					title: 'Thrash Anthology',
					role: 'Appearance',
					year: 1990,
				},
				{
					id: 5,
					type: 'master',
					title: 'Practice What You Preach',
					role: 'Main',
					year: 1989,
				},
			])
		).toEqual([
			{
				id: 3,
				type: 'master',
				name: 'The Legacy',
				year: 1987,
				thumbUrl: 'https://t/3',
				formats: ['LP', 'Album'],
			},
			{
				id: 5,
				type: 'master',
				name: 'Practice What You Preach',
				year: 1989,
				thumbUrl: null,
				formats: [],
			},
		]);
	});

	it('mester nélküli préselést is bevesz, de albumonként csak egyet', () => {
		const albums = toArtistAlbums([
			{
				id: 10,
				type: 'master',
				title: 'The Legacy',
				role: 'Main',
				year: 1987,
			},
			{
				id: 11,
				type: 'release',
				title: 'The Legacy',
				role: 'Main',
				year: 1987,
			},
			{
				id: 12,
				type: 'release',
				title: 'Demo 1985',
				role: 'Main',
				year: 1985,
			},
		]);

		expect(albums.map((album) => [album.id, album.type])).toEqual([
			[12, 'release'],
			[10, 'master'],
		]);
	});
});

describe('fetchArtistAlbums', () => {
	it('végigmegy a lapokon', async () => {
		const urls: string[] = [];
		const albums = await fetchArtistAlbums(152122, {
			fetchImpl: async (url) => {
				urls.push(url);

				return response(200, {
					pagination: { pages: 2 },
					releases: [
						{
							id: urls.length,
							type: 'master',
							title: `Album ${urls.length}`,
							role: 'Main',
							year: 1986 + urls.length,
						},
					],
				});
			},
		});

		expect(urls).toHaveLength(2);
		expect(urls[1]).toContain('page=2');
		expect(albums.map((album) => album.name)).toEqual([
			'Album 1',
			'Album 2',
		]);
	});
});

describe('toMasterTracks', () => {
	it('a fejezetcímeket és a gyűjtősorokat kihagyja', () => {
		expect(
			toMasterTracks([
				{ type_: 'heading', title: 'Side A' },
				{
					type_: 'track',
					position: 'A1',
					title: 'Over The Wall',
					duration: '4:04',
				},
				{ type_: 'index', title: 'Medley' },
				{
					type_: 'track',
					position: 'A2',
					title: 'The Haunting',
					duration: '',
				},
				{ type_: 'track', title: '' },
			])
		).toEqual([
			{ position: 'A1', name: 'Over The Wall', duration: '4:04' },
			{ position: 'A2', name: 'The Haunting', duration: null },
		]);
	});

	it('pozíció nélküli számnak sorszámot ad', () => {
		expect(toMasterTracks([{ title: 'Untitled' }])).toEqual([
			{ position: '1', name: 'Untitled', duration: null },
		]);
	});
});

describe('toMasterProfile', () => {
	it('a stílust a műfaj elé teszi', () => {
		expect(
			toMasterProfile({
				id: 21929,
				title: 'The Legacy',
				year: '1987',
				artists: [{ name: 'Testament (2)' }],
				styles: ['Thrash'],
				genres: ['Rock'],
				images: [{ type: 'primary', uri: 'https://img/cover.jpg' }],
				tracklist: [
					{
						type_: 'track',
						position: 'A1',
						title: 'Over The Wall',
						duration: '4:04',
					},
				],
			})
		).toEqual({
			masterId: 21929,
			name: 'The Legacy',
			artistName: 'Testament',
			year: 1987,
			styles: ['Thrash', 'Rock'],
			coverUrl: 'https://img/cover.jpg',
			tracks: [
				{ position: 'A1', name: 'Over The Wall', duration: '4:04' },
			],
		});
	});
});
