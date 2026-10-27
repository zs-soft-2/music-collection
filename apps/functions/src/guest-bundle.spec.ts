import { Timestamp } from 'firebase-admin/firestore';

import {
	GuestAlbum,
	GuestArtist,
	GuestCollection,
	collectionGenre,
	matchesAlbum,
	cardSlugs,
	needsBuild,
	pickFeatured,
	pickShowcase,
	toYear,
} from './guest-bundle';

const album = (overrides: Partial<GuestAlbum> = {}): GuestAlbum => ({
	uid: 'album',
	artistUid: 'artist',
	year: 1986,
	styles: ['Thrash'],
	format: 'lp',
	genre: 'rock',
	...overrides,
});

const collection = (
	overrides: Partial<GuestCollection> = {}
): GuestCollection => ({
	uid: 'collection',
	slug: 'collection',
	status: 'published',
	parentUid: null,
	group: null,
	criteria: {},
	...overrides,
});

const noArtists = new Map<string, GuestArtist>();

describe('toYear', () => {
	it('minden tárolt alakból az évet adja', () => {
		expect(toYear(Date.UTC(1986, 2, 3))).toBe(1986);
		expect(toYear('1986-03-03')).toBe(1986);
		expect(toYear(Timestamp.fromMillis(Date.UTC(1986, 2, 3)))).toBe(1986);
		expect(toYear(null)).toBeNull();
		expect(toYear('')).toBeNull();
	});
});

describe('matchesAlbum', () => {
	it('a mezők ÉS-kapcsolatban vannak', () => {
		const criteria = {
			styles: { includesAny: ['Thrash'] },
			years: { from: 1980, to: 1989 },
		};

		expect(matchesAlbum(album(), criteria, noArtists)).toBe(true);
		expect(matchesAlbum(album({ year: 1991 }), criteria, noArtists)).toBe(
			false
		);
		expect(
			matchesAlbum(album({ styles: ['Doom'] }), criteria, noArtists)
		).toBe(false);
	});

	it('évet kérő szabály nem illeszkedik ismeretlen évre', () => {
		expect(
			matchesAlbum(
				album({ year: null }),
				{ years: { from: 1980 } },
				noArtists
			)
		).toBe(false);
	});

	it('a formátum és az előadó hivatkozás', () => {
		const criteria = {
			albumFormats: { includesAny: ['lp'] },
			artists: { includesAny: ['megadeth'] },
		};

		expect(
			matchesAlbum(album({ artistUid: 'megadeth' }), criteria, noArtists)
		).toBe(true);
		expect(
			matchesAlbum(
				album({ artistUid: 'megadeth', format: 'ep' }),
				criteria,
				noArtists
			)
		).toBe(false);
		expect(
			matchesAlbum(
				album({ artistUid: 'megadeth', format: null }),
				criteria,
				noArtists
			)
		).toBe(false);
	});

	it('az előadóra vonatkozó szabályhoz kell az előadó', () => {
		const artists = new Map<string, GuestArtist>([
			[
				'artist',
				{ uid: 'artist', styles: ['Thrash'], country: 'GERMANY' },
			],
		]);
		const criteria = { artistCountries: { includesAny: ['GERMANY'] } };

		expect(matchesAlbum(album(), criteria, artists)).toBe(true);
		expect(
			matchesAlbum(album({ artistUid: 'unknown' }), criteria, artists)
		).toBe(false);
		expect(
			matchesAlbum(
				album(),
				{ artistStyles: { excludes: ['Thrash'] } },
				artists
			)
		).toBe(false);
	});
});

describe('collectionGenre', () => {
	it('az albumok többsége dönt', () => {
		expect(
			collectionGenre([
				album({ genre: 'funk-soul' }),
				album({ genre: 'rock' }),
				album({ genre: 'rock' }),
			])
		).toBe('rock');
	});

	it('döntetlennél az ábécé, műfaj nélkül semmi', () => {
		expect(
			collectionGenre([
				album({ genre: 'rock' }),
				album({ genre: 'jazz' }),
			])
		).toBe('jazz');
		expect(collectionGenre([album({ genre: null })])).toBeNull();
		expect(collectionGenre([])).toBeNull();
	});
});

describe('pickShowcase', () => {
	const albums = [
		album({ uid: 'r1', styles: ['Thrash'], genre: 'rock' }),
		album({ uid: 'r2', styles: ['Doom'], genre: 'rock' }),
		album({ uid: 'j1', styles: ['Hard Bop'], genre: 'jazz' }),
	];
	const style = (uid: string, wanted: string, extra = {}) =>
		collection({
			uid,
			slug: uid,
			criteria: { styles: { includesAny: [wanted] } },
			...extra,
		});

	it('műfajonként csoportosít, és legfeljebb ennyit vesz', () => {
		const collections = [
			style('thrash-1', 'Thrash'),
			style('thrash-2', 'Thrash'),
			style('doom', 'Doom'),
			style('hard-bop', 'Hard Bop'),
		];
		const showcase = pickShowcase(
			collections,
			albums,
			noArtists,
			'2026-W42',
			2
		);

		expect([...showcase.keys()]).toEqual(['jazz', 'rock']);
		expect(showcase.get('rock')).toHaveLength(2);
		expect(
			showcase.get('jazz')?.map((entry) => entry.collection.uid)
		).toEqual(['hard-bop']);
	});

	it('kihagyja a draftot, a kísérőt, a credits-szabályút és az üreset', () => {
		const showcase = pickShowcase(
			[
				style('draft', 'Thrash', { status: 'draft' }),
				style('beyond', 'Thrash', { parentUid: 'parent' }),
				style('credits', 'Thrash', {
					criteria: {
						styles: { includesAny: ['Thrash'] },
						credits: { musicians: ['x'] },
					},
				}),
				style('empty', 'Polka'),
			],
			albums,
			noArtists,
			'2026-W42'
		);

		expect(showcase.size).toBe(0);
	});

	it('a diszkográfiák a stílus-collectionök után jönnek', () => {
		const collections = [
			style('disco-a', 'Thrash', { group: 'discography' }),
			style('disco-b', 'Thrash', { group: 'discography' }),
			style('scene', 'Thrash'),
		];

		for (const week of ['2026-W40', '2026-W41', '2026-W42', '2026-W43']) {
			const picked = pickShowcase(
				collections,
				albums,
				noArtists,
				week,
				1
			).get('rock');

			expect(picked?.[0].collection.uid).toBe('scene');
		}
	});

	it('ugyanaz a hét ugyanazt adja, a sorrendtől függetlenül', () => {
		const collections = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((uid) =>
			style(uid, 'Thrash')
		);
		const pick = (list: GuestCollection[], week: string) =>
			pickShowcase(list, albums, noArtists, week, 3)
				.get('rock')
				?.map((entry) => entry.collection.uid);

		expect(pick(collections, '2026-W42')).toEqual(
			pick([...collections].reverse(), '2026-W42')
		);

		const weeks = ['2026-W40', '2026-W41', '2026-W42', '2026-W43'].map(
			(week) => pick(collections, week)?.join()
		);

		expect(new Set(weeks).size).toBeGreaterThan(1);
	});
});

describe('needsBuild', () => {
	const at = (ms: number) => Timestamp.fromMillis(ms);

	it('épít, ha még nincs, vagy más hét van', () => {
		expect(needsBuild(null, '2026-W42', at(1))).toBe(true);
		expect(
			needsBuild(
				{ path: 'p', week: '2026-W41', catalogAt: at(1) },
				'2026-W42',
				at(1)
			)
		).toBe(true);
	});

	it('ugyanazon a héten csak katalógus-változásra', () => {
		const existing = { path: 'p', week: '2026-W42', catalogAt: at(5) };

		expect(needsBuild(existing, '2026-W42', at(5))).toBe(false);
		expect(needsBuild(existing, '2026-W42', at(4))).toBe(false);
		expect(needsBuild(existing, '2026-W42', at(6))).toBe(true);
	});

	it('akkor is, ha a kártyák más collectiont neveznek meg', () => {
		const existing = {
			path: 'p',
			week: '2026-W42',
			catalogAt: at(5),
			cardSlugs: ['doom', 'funk'],
		};

		expect(needsBuild(existing, '2026-W42', at(5), ['doom', 'funk'])).toBe(
			false
		);
		expect(
			needsBuild(existing, '2026-W42', at(5), ['doom', 'funk', 'soul'])
		).toBe(true);
	});
});

describe('cardSlugs', () => {
	it('a jelvények és a vadászatok slugjai, régi és új alakban', () => {
		expect(
			cardSlugs([
				{
					badges: [{ slug: 'funk', name: 'On the One' }],
					collecting: [{ slug: 'soul', name: 'Soul' }, 'doom'],
				},
				{ badges: [{ slug: 'funk' }, { name: 'slug nélkül' }] },
				{ badges: 'nem lista', collecting: null },
			])
		).toEqual(['doom', 'funk', 'soul']);
	});
});

describe('pickFeatured', () => {
	const thrash = { styles: { includesAny: ['Thrash'] } };
	const albums = [album({ uid: 'a1' })];

	it('a kártyán megnevezett, ki nem húzott collectiont felveszi', () => {
		const featured = pickFeatured(
			[
				collection({
					uid: 'named',
					slug: 'named',
					parentUid: 'p',
					criteria: thrash,
				}),
				collection({ uid: 'drawn', slug: 'drawn', criteria: thrash }),
				collection({ uid: 'other', slug: 'other', criteria: thrash }),
			],
			albums,
			noArtists,
			['named', 'drawn'],
			new Set(['drawn'])
		);

		expect(featured.map((entry) => entry.collection.uid)).toEqual([
			'named',
		]);
		expect(featured[0].albums.map((entry) => entry.uid)).toEqual(['a1']);
	});

	it('a draftot, a credits-szabályút és az üreset nem', () => {
		const featured = pickFeatured(
			[
				collection({
					uid: 'd',
					slug: 'd',
					status: 'draft',
					criteria: thrash,
				}),
				collection({
					uid: 'k',
					slug: 'k',
					criteria: { ...thrash, credits: {} },
				}),
				collection({
					uid: 'e',
					slug: 'e',
					criteria: { styles: { includesAny: ['Polka'] } },
				}),
			],
			albums,
			noArtists,
			['d', 'k', 'e'],
			new Set()
		);

		expect(featured).toEqual([]);
	});
});
