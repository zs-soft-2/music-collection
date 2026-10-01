import { WishlistItemEntity } from '@music-collection/api';
import { EntityTypeEnum, MediaEnum } from '@music-collection/common/api';
import {
	MusicCollectionEntity,
	MusicCollectionMembership,
	MusicCollectionProgress,
} from '@music-collection/domain/music-collection/api';
import { MusicCollectionStanding } from '@music-collection/domain/music-collection/core';
import { scoreCollection } from '@music-collection/domain/music-collection/engine';
import { ReleaseView } from '@music-collection/ui/music-view';

import { PublicUserLocation } from '../user-location';
import {
	ALBUM_LIST_LIMIT,
	CollectorProfileSource,
	SHOWCASE_LIMIT,
	collectorProfileFingerprint,
	toPublicCollectorAlbums,
	toPublicCollectorProfile,
} from './collector-profile.model';

/** 2026 in epoch milliseconds, so the age of a record is fixed here. */
const NOW = Date.UTC(2026, 0, 1);

const owner = {
	uid: 'u1',
	displayName: 'Zsolt',
	photoURL: 'https://e.test/z.jpg',
};

function release(changes: Partial<ReleaseView> = {}): ReleaseView {
	return {
		id: 'item-1',
		albumId: 'album-1',
		artistId: 'artist-1',
		title: 'Reign in Blood',
		artistName: 'Slayer',
		coverUrl: 'https://e.test/cover.jpg',
		format: 'vinyl',
		year: 1986,
		editions: [],
		weight: null,
		addedAt: Date.UTC(2019, 4, 2),
		placement: { unitId: 'kallax', row: 1, column: 1, position: 1 },
		...changes,
	} as ReleaseView;
}

function membership(albumUid: string): MusicCollectionMembership {
	return {
		albumUid,
		albumName: `Album ${albumUid}`,
		artistUid: `artist-${albumUid}`,
		artistName: `Artist ${albumUid}`,
		year: 1988,
		coverUrl: null,
	};
}

function collection(
	overrides: Partial<MusicCollectionEntity> = {}
): MusicCollectionEntity {
	return {
		entityType: EntityTypeEnum.MusicCollection,
		uid: 'bay-area',
		name: 'Bay Area Thrash',
		slug: 'bay-area',
		description: null,
		coverImageUrl: null,
		icon: null,
		criteria: {},
		badge: null,
		basePoints: 100,
		parentUid: null,
		group: null,
		status: 'published',
		visibility: 'public',
		createdAt: 0,
		criteriaVersion: 1,
		...overrides,
	};
}

function standing(
	albums: MusicCollectionMembership[],
	ownedAlbumUids: string[],
	overrides: Partial<MusicCollectionEntity> = {}
): MusicCollectionStanding {
	const owned = new Set(ownedAlbumUids);
	const missingAlbumUids = albums
		.map(({ albumUid }) => albumUid)
		.filter((albumUid) => !owned.has(albumUid));
	const definition = collection(overrides);
	const progress: MusicCollectionProgress = {
		collectionUid: definition.uid,
		total: albums.length,
		owned: ownedAlbumUids.length,
		missing: missingAlbumUids.length,
		percentage: albums.length
			? Math.round((ownedAlbumUids.length / albums.length) * 100)
			: 0,
		completed: albums.length > 0 && missingAlbumUids.length === 0,
		ownedAlbumUids,
		missingAlbumUids,
	};
	const resolved = {
		collectionUid: definition.uid,
		criteriaVersion: 1,
		albums,
		total: albums.length,
		calculatedAt: 0,
	};

	return {
		collection: definition,
		resolved,
		progress,
		score: scoreCollection(
			resolved,
			ownedAlbumUids.map((albumUid) => ({
				albumUid,
				disposedAt: null,
				releaseYear: null,
				editions: [],
			})),
			definition.basePoints,
			progress.completed
		),
	};
}

function wish(changes: Partial<WishlistItemEntity> = {}): WishlistItemEntity {
	return {
		uid: 'wish-1',
		albumReference: {
			uid: 'album-9',
			name: 'Peace Sells',
			coverImage: { filePath: 'https://e.test/peace.jpg' },
		},
		artistReference: { uid: 'artist-9', name: 'Megadeth' },
		medias: [MediaEnum.vinyl],
		sourceLink: 'https://shop.test/peace',
		...changes,
	} as WishlistItemEntity;
}

function source(
	changes: Partial<CollectorProfileSource> = {}
): CollectorProfileSource {
	return {
		settings: { shared: true, shareWishlist: false },
		owner,
		releases: [release()],
		standings: [],
		wishes: [],
		location: null,
		now: NOW,
		...changes,
	};
}

describe('toPublicCollectorProfile: the consents', () => {
	it('publishes nothing while the profile is not shared', () => {
		expect(
			toPublicCollectorProfile(
				source({ settings: { shared: false, shareWishlist: true } })
			)
		).toBeNull();
	});

	it('publishes nothing without an owner', () => {
		expect(
			toPublicCollectorProfile(source({ owner: { uid: '' } }))
		).toBeNull();
	});

	it('leaves the wishlist out while it is not shared', () => {
		const profile = toPublicCollectorProfile(source({ wishes: [wish()] }));

		expect(profile?.wishlist).toBeUndefined();
	});

	it('carries the wishlist once it is shared', () => {
		const profile = toPublicCollectorProfile(
			source({
				settings: { shared: true, shareWishlist: true },
				wishes: [wish()],
			})
		);

		expect(profile?.wishlist).toEqual([
			{
				title: 'Peace Sells',
				artistName: 'Megadeth',
				coverUrl: 'https://e.test/peace.jpg',
				medias: [MediaEnum.vinyl],
				sourceLink: 'https://shop.test/peace',
			},
		]);
	});

	/** `all` is the absence of a preference, not a format a shop stocks. */
	it('drops the "any format" marker from a wish', () => {
		const profile = toPublicCollectorProfile(
			source({
				settings: { shared: true, shareWishlist: true },
				wishes: [wish({ medias: [MediaEnum.all] })],
			})
		);

		expect(profile?.wishlist?.[0].medias).toEqual([]);
	});

	/**
	 * The page offers this link to strangers under our own domain, and the
	 * rules cannot look inside a list — so anything but a web address is
	 * left behind here.
	 */
	it('leaves out a shop link that is not https', () => {
		const profile = toPublicCollectorProfile(
			source({
				settings: { shared: true, shareWishlist: true },
				wishes: [wish({ sourceLink: 'javascript:alert(1)' })],
			})
		);

		expect(profile?.wishlist?.[0].sourceLink).toBeUndefined();
	});
});

describe('toPublicCollectorProfile: the place', () => {
	const pin = (fields: Partial<PublicUserLocation>): PublicUserLocation =>
		({
			uid: 'u1',
			level: 'country',
			countryCode: 'HU',
			...fields,
		}) as PublicUserLocation;

	it('takes no place at all while nothing is shared on the map', () => {
		const profile = toPublicCollectorProfile(source());

		expect(profile?.countryCode).toBeUndefined();
		expect(profile?.city).toBeUndefined();
	});

	it('takes the country of a country-level pin, and no city', () => {
		const profile = toPublicCollectorProfile(
			source({ location: pin({ level: 'country' }) })
		);

		expect(profile?.countryCode).toBe('HU');
		expect(profile?.city).toBeUndefined();
	});

	it('takes the city once the pin carries one', () => {
		const profile = toPublicCollectorProfile(
			source({ location: pin({ level: 'city', city: 'Budapest' }) })
		);

		expect(profile?.city).toBe('Budapest');
	});
});

describe('toPublicCollectorProfile: the shelf in numbers', () => {
	it('counts the copies, the albums, the artists and the formats', () => {
		const profile = toPublicCollectorProfile(
			source({
				releases: [
					release(),
					release({ id: 'item-2', format: 'cd' }),
					release({
						id: 'item-3',
						albumId: 'album-2',
						artistId: 'artist-2',
						year: 1972,
						addedAt: Date.UTC(2015, 0, 1),
					}),
				],
			})
		);

		expect(profile?.numbers).toEqual({
			copies: 3,
			albums: 2,
			artists: 2,
			byFormat: { vinyl: 2, cd: 1 },
			oldestYear: 1972,
			since: 2015,
		});
	});

	it('leaves the oldest year unknown while no record names one', () => {
		const profile = toPublicCollectorProfile(
			source({ releases: [release({ year: null })] })
		);

		expect(profile?.numbers.oldestYear).toBeNull();
	});
});

describe('toPublicCollectorProfile: the shop window', () => {
	it('puts the special pressings first', () => {
		const profile = toPublicCollectorProfile(
			source({
				releases: [
					release({ id: 'plain', title: 'Plain' }),
					release({
						id: 'special',
						title: 'Special',
						editions: ['limited edition', 'picture disc'],
					}),
				],
			})
		);

		expect(profile?.showcase.map(({ title }) => title)).toEqual([
			'Special',
			'Plain',
		]);
	});

	it('holds no more records than the window fits', () => {
		const releases = Array.from(
			{ length: SHOWCASE_LIMIT + 5 },
			(_, index) =>
				release({ id: `item-${index}`, title: `Record ${index}` })
		);

		expect(
			toPublicCollectorProfile(source({ releases }))?.showcase
		).toHaveLength(SHOWCASE_LIMIT);
	});

	/**
	 * The window is made of a view that also knows where the copy stands and
	 * what it cost. Only these six fields may travel.
	 */
	it('carries nothing of the copy but what is on the sleeve', () => {
		const profile = toPublicCollectorProfile(source());

		expect(Object.keys(profile?.showcase[0] ?? {}).sort()).toEqual([
			'artistName',
			'coverUrl',
			'editions',
			'format',
			'title',
			'year',
		]);
	});
});

describe('toPublicCollectorProfile: points and badges', () => {
	const albums = [membership('a'), membership('b')];

	it('counts only what a finished collection earned', () => {
		const profile = toPublicCollectorProfile(
			source({
				standings: [
					standing(albums, ['a', 'b']),
					standing(albums, ['a'], { uid: 'doom', slug: 'doom' }),
				],
			})
		);

		expect(profile?.points.completedCollections).toBe(1);
		expect(profile?.points.total).toBeGreaterThan(0);
	});

	it('carries a badge for the finished collection only', () => {
		const profile = toPublicCollectorProfile(
			source({
				standings: [
					standing(albums, ['a', 'b'], {
						badge: {
							name: 'Thrash Historian',
							description: null,
							icon: null,
							artworkUrl: 'https://e.test/art.png',
						},
					}),
					standing(albums, ['a'], { uid: 'doom', slug: 'doom' }),
				],
			})
		);

		expect(profile?.badges).toEqual([
			{
				slug: 'bay-area',
				name: 'Thrash Historian',
				imageUrl: 'https://e.test/art.png',
				points: expect.any(Number),
			},
		]);
	});

	it('shows the collections being worked on, nearest first', () => {
		const profile = toPublicCollectorProfile(
			source({
				standings: [
					standing(albums, ['a'], {
						uid: 'half',
						slug: 'half',
						name: 'Half',
					}),
					standing(
						[
							membership('a'),
							membership('b'),
							membership('c'),
							membership('d'),
						],
						['a'],
						{ uid: 'quarter', slug: 'quarter', name: 'Quarter' }
					),
					standing(albums, [], {
						uid: 'untouched',
						slug: 'untouched',
					}),
				],
			})
		);

		expect(profile?.pursuits.map(({ slug }) => slug)).toEqual([
			'half',
			'quarter',
		]);
	});
});

describe('collectorProfileFingerprint', () => {
	const fingerprint = (changes: Partial<CollectorProfileSource> = {}) => {
		const profile = toPublicCollectorProfile(source(changes));

		return profile ? collectorProfileFingerprint(profile) : null;
	};

	it('is the same for the same shelf', () => {
		expect(fingerprint()).toBe(fingerprint());
	});

	/** Otherwise the page would keep saying what the shelf no longer says. */
	it('changes when a record is filed', () => {
		expect(fingerprint()).not.toBe(
			fingerprint({
				releases: [release(), release({ id: 'item-2' })],
			})
		);
	});

	it('changes when the wishlist joins the page', () => {
		expect(fingerprint({ wishes: [wish()] })).not.toBe(
			fingerprint({
				settings: { shared: true, shareWishlist: true },
				wishes: [wish()],
			})
		);
	});

	/**
	 * A copy moved on the shelf, graded or priced leaves the page identical —
	 * and this is what keeps that from being a write.
	 */
	it('stays the same when nothing the page shows has changed', () => {
		expect(
			fingerprint({
				releases: [
					release({
						placement: {
							unitId: 'kallax',
							row: 2,
							column: 3,
							position: 7,
						},
					}),
				],
			})
		).toBe(fingerprint());
	});
});

describe('toPublicCollectorAlbums', () => {
	it('publishes nothing while the profile is not shared', () => {
		expect(
			toPublicCollectorAlbums(
				source({ settings: { shared: false, shareWishlist: false } })
			)
		).toBeNull();
	});

	it('lists the shelf by artist, then by year', () => {
		const albums = toPublicCollectorAlbums(
			source({
				releases: [
					release({ id: '1', artistName: 'Slayer', year: 1990 }),
					release({ id: '2', artistName: 'Metallica', year: 1986 }),
					release({ id: '3', artistName: 'Slayer', year: 1986 }),
				],
			})
		);

		expect(
			albums?.albums.map(
				({ artistName, year }) => `${artistName} ${year}`
			)
		).toEqual(['Metallica 1986', 'Slayer 1986', 'Slayer 1990']);
	});

	/** The count is the shelf; the list may have stopped short of it. */
	it('counts everything even where the list stops', () => {
		const releases = Array.from(
			{ length: ALBUM_LIST_LIMIT + 5 },
			(_at, index) => release({ id: `item-${index}` })
		);
		const albums = toPublicCollectorAlbums(source({ releases }));

		expect(albums?.count).toBe(ALBUM_LIST_LIMIT + 5);
		expect(albums?.albums).toHaveLength(ALBUM_LIST_LIMIT);
	});

	/** No covers: a thousand records are kilobytes rather than a megabyte. */
	it('carries the record and nothing of the copy', () => {
		const albums = toPublicCollectorAlbums(source());

		expect(Object.keys(albums?.albums[0] ?? {}).sort()).toEqual([
			'artistName',
			'format',
			'title',
			'year',
		]);
	});
});
