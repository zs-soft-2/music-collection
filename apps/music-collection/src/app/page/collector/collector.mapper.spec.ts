import { MediaEnum } from '@music-collection/common/api';

import {
	CollectorAlbumsDocument,
	CollectorProfileDocument,
} from '../../data/collector-profile';
import { TITLE_MAX } from './collector.model';
import { toCollectorAlbums, toCollectorView } from './collector.mapper';

const document = (
	changes: Partial<CollectorProfileDocument> = {}
): CollectorProfileDocument =>
	({
		uid: 'u1',
		displayName: 'Zsolt',
		numbers: {
			copies: 312,
			albums: 280,
			artists: 94,
			byFormat: { vinyl: 300, cd: 12 },
			oldestYear: 1971,
			since: 2019,
		},
		points: { total: 1240, completedCollections: 4 },
		badges: [],
		pursuits: [],
		showcase: [],
		...changes,
	}) as CollectorProfileDocument;

describe('toCollectorView: nothing to show', () => {
	it('has no view where no profile is shared', () => {
		expect(toCollectorView(null)).toBeNull();
	});

	/** A document written by an older version has fewer fields, not fewer rights. */
	it('draws a profile that carries almost nothing', () => {
		const view = toCollectorView({ uid: 'u1' } as CollectorProfileDocument);

		expect(view?.numbers.copies).toBe(0);
		expect(view?.badges).toEqual([]);
		expect(view?.hero.initial).toBe('?');
	});
});

describe('toCollectorView: the shelf', () => {
	it('carries the numbers and the formats in a fixed order', () => {
		const view = toCollectorView(document());

		expect(view?.numbers).toEqual({
			copies: 312,
			albums: 280,
			artists: 94,
			oldestYear: 1971,
			since: 2019,
			formats: [
				{ format: 'vinyl', count: 300 },
				{ format: 'cd', count: 12 },
			],
		});
	});

	it('leaves out a format the app does not know', () => {
		const view = toCollectorView(
			document({
				numbers: {
					copies: 1,
					albums: 1,
					artists: 1,
					byFormat: { minidisc: 4 },
					oldestYear: null,
					since: null,
				} as never,
			})
		);

		expect(view?.numbers.formats).toEqual([]);
	});

	it('names the place with the city where one was shared', () => {
		expect(
			toCollectorView(document({ countryCode: 'HU', city: 'Budapest' }))
				?.hero.place
		).toContain('Budapest');
	});
});

/**
 * The rules hold the shape of the document but cannot look inside its lists —
 * Firestore rules have no iteration. These are the cases that would otherwise
 * reach a visitor's browser.
 */
describe('toCollectorView: what the rules could not check', () => {
	it('refuses a cover that is not a web address', () => {
		const view = toCollectorView(
			document({
				showcase: [
					{
						title: 'Reign in Blood',
						artistName: 'Slayer',
						year: 1986,
						format: 'vinyl',
						coverUrl: 'javascript:alert(1)',
						editions: [],
					},
				],
			} as never)
		);

		expect(view?.showcase[0].coverUrl).toBeNull();
	});

	it('refuses a plain-http cover', () => {
		const view = toCollectorView(
			document({
				showcase: [{ title: 'A', coverUrl: 'http://shop.test/a.jpg' }],
			} as never)
		);

		expect(view?.showcase[0].coverUrl).toBeNull();
	});

	it('clips a title that would run off the page', () => {
		const view = toCollectorView(
			document({
				showcase: [{ title: 'x'.repeat(TITLE_MAX + 50) }],
			} as never)
		);

		expect(view?.showcase[0].title).toHaveLength(TITLE_MAX);
	});

	it('turns an unknown format into the catch-all', () => {
		const view = toCollectorView(
			document({
				showcase: [{ title: 'A', format: '<script>' }],
			} as never)
		);

		expect(view?.showcase[0].format).toBe('other');
	});

	it('refuses a badge count that is not a count', () => {
		const view = toCollectorView(
			document({
				badges: [{ name: 'Thrash Historian', points: 'many' }],
			} as never)
		);

		expect(view?.badges[0].points).toBe(0);
	});

	/** A progress bar past its end would draw over the page. */
	it('holds a pursuit to its own total', () => {
		const view = toCollectorView(
			document({
				pursuits: [{ name: 'Doom', owned: 99, total: 10 }],
			} as never)
		);

		expect(view?.pursuits[0]).toMatchObject({
			owned: 10,
			percentage: 100,
		});
	});

	it('leaves out a pursuit of nothing', () => {
		const view = toCollectorView(
			document({
				pursuits: [{ name: 'Empty', owned: 0, total: 0 }],
			} as never)
		);

		expect(view?.pursuits).toEqual([]);
	});

	it('survives lists that are not lists', () => {
		const view = toCollectorView(
			document({ badges: 'all of them', showcase: null } as never)
		);

		expect(view?.badges).toEqual([]);
		expect(view?.showcase).toEqual([]);
	});
});

describe('toCollectorView: the wishlist', () => {
	const wish = (changes: Record<string, unknown> = {}) => ({
		title: 'Peace Sells',
		artistName: 'Megadeth',
		coverUrl: 'https://e.test/peace.jpg',
		medias: [MediaEnum.vinyl],
		sourceLink: 'https://shop.test/peace',
		...changes,
	});

	it('shows where a record is for sale, and where that leads', () => {
		const view = toCollectorView(document({ wishlist: [wish()] } as never));

		expect(view?.wishlist[0]).toMatchObject({
			sourceLink: 'https://shop.test/peace',
			sourceHost: 'shop.test',
		});
	});

	it('refuses a shop link that is not a web address', () => {
		const view = toCollectorView(
			document({
				wishlist: [wish({ sourceLink: 'javascript:alert(1)' })],
			} as never)
		);

		expect(view?.wishlist[0].sourceLink).toBeNull();
		expect(view?.wishlist[0].sourceHost).toBeNull();
	});

	it('keeps only formats the app knows', () => {
		const view = toCollectorView(
			document({
				wishlist: [wish({ medias: ['vinyl', 'wax cylinder'] })],
			} as never)
		);

		expect(view?.wishlist[0].medias).toEqual([MediaEnum.vinyl]);
	});

	it('has an empty wishlist where none was shared', () => {
		expect(toCollectorView(document())?.wishlist).toEqual([]);
	});
});

describe('toCollectorAlbums', () => {
	it('is empty where no list was published', () => {
		expect(toCollectorAlbums(null)).toEqual({ count: 0, albums: [] });
	});

	it('carries the shelf as it was written', () => {
		const albums = toCollectorAlbums({
			uid: 'u1',
			count: 2,
			albums: [
				{
					title: 'Reign in Blood',
					artistName: 'Slayer',
					year: 1986,
					format: 'vinyl',
				},
				{
					title: 'Powerslave',
					artistName: 'Iron Maiden',
					year: 1984,
					format: 'cd',
				},
			],
		} as CollectorAlbumsDocument);

		expect(albums.count).toBe(2);
		expect(albums.albums[1]).toEqual({
			title: 'Powerslave',
			artistName: 'Iron Maiden',
			year: 1984,
			format: 'cd',
		});
	});

	/** The same border post as the page: the list is somebody else's writing. */
	it('clips and tames what the rules could not check', () => {
		const albums = toCollectorAlbums({
			uid: 'u1',
			count: 'lots',
			albums: [{ title: 'x'.repeat(TITLE_MAX + 20), format: '<script>' }],
		} as unknown as CollectorAlbumsDocument);

		expect(albums.albums[0].title).toHaveLength(TITLE_MAX);
		expect(albums.albums[0].format).toBe('other');
		// A count that is not a count falls back to the rows there are.
		expect(albums.count).toBe(1);
	});
});
