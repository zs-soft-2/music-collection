import {
	CatalogArtist,
	MusicBrainzSearchRelease,
	artistClause,
	creditedName,
	escapeLucene,
	fetchReleasesForArtists,
	fillFirstReleaseDates,
	foldUpcomingReleases,
	indexArtists,
	matchArtist,
	releaseWindow,
	toQueryBatches,
} from './upcoming-release';

const window = { from: '2026-09-22', to: '2026-10-27' };

const artists: CatalogArtist[] = [
	{
		uid: 'artist-metallica',
		name: 'Metallica',
		musicBrainzId: '65f4f0c5-ef9e-490c-aee3-909e7ae6b2ab',
		imageUrl: 'https://example.test/metallica.jpg',
	},
	{
		uid: 'artist-nirvana',
		name: 'Nirvana',
		musicBrainzId: null,
		imageUrl: null,
	},
	// Két azonos nevű előadó: a névre párosítás egyiküket sem hozhatja.
	{
		uid: 'artist-europe-1',
		name: 'Europe',
		musicBrainzId: null,
		imageUrl: null,
	},
	{
		uid: 'artist-europe-2',
		name: 'Europe',
		musicBrainzId: null,
		imageUrl: null,
	},
];

const index = indexArtists(artists);

const release = (
	overrides: Partial<MusicBrainzSearchRelease> = {}
): MusicBrainzSearchRelease => ({
	id: 'release-1',
	title: 'Something New',
	date: '2026-10-02',
	country: 'GB',
	'artist-credit': [
		{
			name: 'Metallica',
			artist: {
				id: '65f4f0c5-ef9e-490c-aee3-909e7ae6b2ab',
				name: 'Metallica',
			},
		},
	],
	'release-group': {
		id: 'group-1',
		title: 'Something New',
		'primary-type': 'Album',
	},
	'label-info': [{ label: { name: 'Blackened' } }],
	media: [{ format: 'Vinyl' }],
	...overrides,
});

describe('releaseWindow', () => {
	it('a mai naptól a megadott napig tart', () => {
		expect(releaseWindow(new Date('2026-09-22T10:00:00Z'), 35)).toEqual({
			from: '2026-09-22',
			to: '2026-10-27',
		});
	});
});

describe('indexArtists', () => {
	it('kihagyja a névből az azonos nevű előadókat', () => {
		expect(index.byName.has('europe')).toBe(false);
		expect(index.byName.get('nirvana')?.uid).toBe('artist-nirvana');
	});

	it('a MusicBrainz id-t kisbetűsen tartja', () => {
		expect(
			index.byMusicBrainzId.get('65f4f0c5-ef9e-490c-aee3-909e7ae6b2ab')
				?.uid
		).toBe('artist-metallica');
	});
});

describe('matchArtist', () => {
	it('előbb a MusicBrainz id-re párosít', () => {
		expect(matchArtist(release(), index)).toEqual({
			artist: artists[0],
			matchedBy: 'musicBrainzId',
		});
	});

	it('id nélkül a névre esik vissza', () => {
		const match = matchArtist(
			release({
				'artist-credit': [
					{
						name: 'Nirvana',
						artist: { id: 'other', name: 'Nirvana' },
					},
				],
			}),
			index
		);

		expect(match).toEqual({ artist: artists[1], matchedBy: 'name' });
	});

	it('az azonos nevű előadókat nem találja el', () => {
		expect(
			matchArtist(
				release({ 'artist-credit': [{ name: 'Europe' }] }),
				index
			)
		).toBeNull();
	});

	it('idegen előadóra nem ad találatot', () => {
		expect(
			matchArtist(
				release({ 'artist-credit': [{ name: 'Somebody Else' }] }),
				index
			)
		).toBeNull();
	});
});

describe('creditedName', () => {
	it('a közreműködőket a MusicBrainz kötőszavaival fűzi össze', () => {
		expect(
			creditedName(
				release({
					'artist-credit': [
						{ name: 'Metallica', joinphrase: ' & ' },
						{ name: 'Lou Reed' },
					],
				})
			)
		).toBe('Metallica & Lou Reed');
	});
});

describe('foldUpcomingReleases', () => {
	it('a katalógus előadóinak kiadásait tartja meg', () => {
		const folded = foldUpcomingReleases(
			[
				release(),
				release({ id: 'x', 'artist-credit': [{ name: 'Nobody' }] }),
			],
			index,
			window
		);

		expect(folded).toHaveLength(1);
		expect(folded[0]).toMatchObject({
			artistUid: 'artist-metallica',
			artistName: 'Metallica',
			artistImageUrl: 'https://example.test/metallica.jpg',
			countries: ['GB'],
			formats: ['Vinyl'],
			labels: ['Blackened'],
			matchedBy: 'musicBrainzId',
			primaryType: 'Album',
			releaseDate: '2026-10-02',
			releaseGroupId: 'group-1',
			title: 'Something New',
			uid: 'group-1',
		});
	});

	it('a pontatlan dátumú kiadást eldobja', () => {
		expect(
			foldUpcomingReleases([release({ date: '2026' })], index, window)
		).toHaveLength(0);
		expect(
			foldUpcomingReleases([release({ date: '2026-10' })], index, window)
		).toHaveLength(0);
	});

	it('az ablakon kívüli napot eldobja', () => {
		expect(
			foldUpcomingReleases(
				[release({ date: '2026-11-30' })],
				index,
				window
			)
		).toHaveLength(0);
	});

	it('egy albumba fésüli a nyomásokat, a legkorábbi nappal', () => {
		const folded = foldUpcomingReleases(
			[
				release({
					id: 'a',
					date: '2026-10-09',
					media: [{ format: 'CD' }],
				}),
				release({
					id: 'b',
					date: '2026-10-02',
					country: 'US',
					media: [{ format: 'Vinyl' }, { format: 'Vinyl' }],
					'label-info': [{ label: { name: 'Blackened' } }],
				}),
			],
			index,
			window
		);

		expect(folded).toHaveLength(1);
		expect(folded[0].releaseDate).toBe('2026-10-02');
		expect(folded[0].formats).toEqual(['CD', 'Vinyl']);
		expect(folded[0].countries).toEqual(['GB', 'US']);
		expect(folded[0].labels).toEqual(['Blackened']);
	});

	it('dátum, majd előadó szerint rendez', () => {
		const folded = foldUpcomingReleases(
			[
				release({
					id: 'a',
					date: '2026-10-09',
					'release-group': { id: 'group-late', title: 'Later' },
				}),
				release({
					id: 'b',
					date: '2026-09-25',
					'release-group': { id: 'group-early', title: 'Sooner' },
				}),
			],
			index,
			window
		);

		expect(folded.map((entry) => entry.uid)).toEqual([
			'group-early',
			'group-late',
		]);
	});
});

describe('fillFirstReleaseDates', () => {
	it('a már ismert dátumot nem kérdezi meg újra', async () => {
		const documents = foldUpcomingReleases([release()], index, window);
		const fetchImpl = jest.fn();

		await fillFirstReleaseDates(
			documents,
			new Map([['group-1', '1991-08-12']]),
			{ fetchImpl, intervalMs: 0 }
		);

		expect(fetchImpl).not.toHaveBeenCalled();
		expect(documents[0].firstReleaseDate).toBe('1991-08-12');
	});

	it('az ismeretlent lekérdezi, és a típusokat is átveszi', async () => {
		const documents = foldUpcomingReleases([release()], index, window);
		const fetchImpl = jest.fn(async () => ({
			ok: true,
			status: 200,
			json: async () => ({
				id: 'group-1',
				'first-release-date': '1984-07-27',
				'primary-type': 'Album',
				'secondary-types': ['Live'],
			}),
		}));

		await fillFirstReleaseDates(documents, new Map(), {
			fetchImpl,
			intervalMs: 0,
		});

		expect(documents[0].firstReleaseDate).toBe('1984-07-27');
		expect(documents[0].secondaryTypes).toEqual(['Live']);
	});

	it('a hibás lekérdezés nem viszi el a futást', async () => {
		const documents = foldUpcomingReleases([release()], index, window);
		const fetchImpl = jest.fn(async () => ({
			ok: false,
			status: 404,
			json: async () => ({}),
		}));

		await fillFirstReleaseDates(documents, new Map(), {
			fetchImpl,
			intervalMs: 0,
			retries: 0,
		});

		expect(documents[0].firstReleaseDate).toBeNull();
	});
});

describe('escapeLucene', () => {
	it('a lekérdezés-nyelv jeleit védi', () => {
		expect(escapeLucene('AC/DC')).toBe('AC\\/DC');
		expect(escapeLucene('!!!')).toBe('\\!\\!\\!');
		expect(escapeLucene('Sunn O)))')).toBe('Sunn O\\)\\)\\)');
	});
});

describe('artistClause', () => {
	it('a MusicBrainz id-t használja, ha van', () => {
		expect(artistClause(artists[0])).toBe(
			'arid:65f4f0c5-ef9e-490c-aee3-909e7ae6b2ab'
		);
	});

	it('id híján a névre keres', () => {
		expect(artistClause(artists[1])).toBe('artist:"Nirvana"');
	});

	it('a név nélküli előadót kihagyja', () => {
		expect(
			artistClause({
				uid: 'x',
				name: '   ',
				musicBrainzId: null,
				imageUrl: null,
			})
		).toBeNull();
	});
});

describe('toQueryBatches', () => {
	it('a megadott méretű kötegekre bontja a feltételeket', () => {
		const batches = toQueryBatches(artists, 3);

		expect(batches).toEqual([
			[
				'arid:65f4f0c5-ef9e-490c-aee3-909e7ae6b2ab',
				'artist:"Nirvana"',
				'artist:"Europe"',
			],
			['artist:"Europe"'],
		]);
	});

	it('üres listára nincs köteg', () => {
		expect(toQueryBatches([], 3)).toEqual([]);
	});
});

describe('fetchReleasesForArtists', () => {
	const respond = (releases: unknown[], count = releases.length) => ({
		ok: true,
		status: 200,
		json: async () => ({ count, releases }),
	});

	it('kötegenként egy keresést küld, a dátumablakkal együtt', async () => {
		const urls: string[] = [];
		const fetchImpl = jest.fn(async (url: string) => {
			urls.push(url);

			return respond([release()]);
		});

		const releases = await fetchReleasesForArtists(
			artists.slice(0, 2),
			window,
			{ fetchImpl, intervalMs: 0 }
		);

		expect(urls).toHaveLength(1);
		// A URLSearchParams a szóközt `+`-ra kódolja; a MusicBrainz így veszi.
		expect(decodeURIComponent(urls[0]).replace(/\+/g, ' ')).toContain(
			'(arid:65f4f0c5-ef9e-490c-aee3-909e7ae6b2ab OR artist:"Nirvana") AND date:[2026-09-22 TO 2026-10-27] AND status:official'
		);
		expect(releases).toHaveLength(1);
	});

	it('teli lapnál tovább lapoz, üresebbnél megáll', async () => {
		const full = Array.from({ length: 100 }, (_, index) =>
			release({ id: `r${index}` })
		);
		const fetchImpl = jest
			.fn()
			.mockResolvedValueOnce(respond(full, 150))
			.mockResolvedValue(respond([release({ id: 'last' })], 150));

		const releases = await fetchReleasesForArtists(
			artists.slice(0, 1),
			window,
			{ fetchImpl, intervalMs: 0 }
		);

		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(releases).toHaveLength(101);
	});
});
