import { CollectorCardDocument } from '../../data/collector-profile';

import {
	filterWall,
	sortWall,
	toWallCollectionCards,
	toWallCollections,
	toWallEntries,
	toWallHighlights,
} from './collectors.mapper';
import { WallEntry } from './collectors.model';

const badge = (slug: string, points = 100) => ({
	slug,
	name: slug.replace('-', ' '),
	imageUrl: `https://e.test/${slug}.png`,
	points,
});

const card = (
	changes: Partial<CollectorCardDocument> = {}
): CollectorCardDocument =>
	({
		uid: 'u1',
		displayName: 'Zsolt',
		photoURL: 'https://e.test/z.jpg',
		countryCode: 'HU',
		city: 'Budapest',
		copies: 312,
		points: 1240,
		badges: [badge('bay-area', 620)],
		collecting: [],
		updatedAt: 3,
		...changes,
	}) as CollectorCardDocument;

const entries = (...documents: CollectorCardDocument[]): WallEntry[] =>
	toWallEntries(documents);

describe('toWallEntries', () => {
	it('carries who the collector is and what they finished', () => {
		const [entry] = entries(card());

		expect(entry).toMatchObject({
			uid: 'u1',
			displayName: 'Zsolt',
			photoURL: 'https://e.test/z.jpg',
			copies: 312,
			points: 1240,
			initial: 'Z',
		});
		expect(entry.place).toContain('Budapest');
		expect(entry.badges).toHaveLength(1);
	});

	/** The entries are written by other people's browsers, like the pages. */
	it('refuses a picture that is not a web address', () => {
		const [entry] = entries(
			card({ photoURL: 'javascript:alert(1)' } as never)
		);

		expect(entry.photoURL).toBeNull();
	});

	it('drops a badge with nothing to name it', () => {
		const [entry] = entries(
			card({ badges: [{ slug: '', name: '' }] } as never)
		);

		expect(entry.badges).toEqual([]);
	});

	/** An entry with no uid leads nowhere, and the wall is made of links. */
	it('leaves out an entry that leads nowhere', () => {
		expect(entries(card({ uid: '' }))).toEqual([]);
	});

	it('stands in for a collector who shared no name', () => {
		const [entry] = entries(card({ displayName: undefined }));

		expect(entry.displayName).toBeNull();
		expect(entry.initial).toBe('?');
	});
});

describe('toWallCollections', () => {
	it('counts how many finished each one, the most finished first', () => {
		const wall = entries(
			card({ uid: 'u1', badges: [badge('doom'), badge('bay-area')] }),
			card({ uid: 'u2', badges: [badge('doom')] })
		);

		expect(
			toWallCollections(wall).map(({ slug, collectors }) => [
				slug,
				collectors,
			])
		).toEqual([
			['doom', 2],
			['bay-area', 1],
		]);
	});

	it('offers nothing to filter by where nobody finished anything', () => {
		expect(toWallCollections(entries(card({ badges: [] })))).toEqual([]);
	});
});

describe('filterWall', () => {
	const wall = () =>
		entries(
			card({ uid: 'u1', displayName: 'Zsolt', badges: [badge('doom')] }),
			card({
				uid: 'u2',
				displayName: 'Anna',
				city: 'Szeged',
				badges: [badge('bay-area')],
			})
		);

	it('narrows to whoever finished one collection', () => {
		expect(filterWall(wall(), 'doom', '').map(({ uid }) => uid)).toEqual([
			'u1',
		]);
	});

	it('finds a collector by name', () => {
		expect(filterWall(wall(), null, 'anna').map(({ uid }) => uid)).toEqual([
			'u2',
		]);
	});

	it('finds a collector by what they finished', () => {
		expect(filterWall(wall(), null, 'bay').map(({ uid }) => uid)).toEqual([
			'u2',
		]);
	});

	it('finds a collector by where they are', () => {
		expect(
			filterWall(wall(), null, 'szeged').map(({ uid }) => uid)
		).toEqual(['u2']);
	});
});

describe('sortWall', () => {
	const wall = () =>
		entries(
			card({
				uid: 'u1',
				displayName: 'Zsolt',
				copies: 100,
				points: 2000,
				updatedAt: 1,
				badges: [badge('a'), badge('b')],
			}),
			card({
				uid: 'u2',
				displayName: 'Anna',
				copies: 900,
				points: 500,
				updatedAt: 9,
				badges: [badge('c')],
			})
		);

	const order = (sort: Parameters<typeof sortWall>[1]) =>
		sortWall(wall(), sort).map(({ uid }) => uid);

	it('puts the newest entry first by default', () => {
		expect(order('recent')).toEqual(['u2', 'u1']);
	});

	it('sorts by how many collections were finished', () => {
		expect(order('badges')).toEqual(['u1', 'u2']);
	});

	it('sorts by points and by shelf', () => {
		expect(order('points')).toEqual(['u1', 'u2']);
		expect(order('shelf')).toEqual(['u2', 'u1']);
	});

	it('sorts by name', () => {
		expect(order('name')).toEqual(['u2', 'u1']);
	});

	/** The wall is about finishing; somebody who finished none comes last. */
	it('puts a collector with nothing finished at the end', () => {
		const wall = entries(
			card({ uid: 'u1', badges: [], updatedAt: 99 }),
			card({ uid: 'u2', badges: [badge('a')], updatedAt: 1 })
		);

		expect(sortWall(wall, 'recent').map(({ uid }) => uid)).toEqual([
			'u2',
			'u1',
		]);
	});
});

describe('toWallHighlights', () => {
	/**
	 * One collector who finished four collections last night would otherwise
	 * fill the row by themselves, and four badges on one face say far less
	 * than four people do.
	 */
	it('gives everybody one before anybody gets a second', () => {
		const wall = entries(
			card({ uid: 'u1', badges: [badge('a'), badge('b'), badge('c')] }),
			card({ uid: 'u2', badges: [badge('d')] })
		);

		expect(
			toWallHighlights(wall, 3).map(
				(highlight) => `${highlight.uid}:${highlight.badge.slug}`
			)
		).toEqual(['u1:a', 'u2:d', 'u1:b']);
	});

	it('shows nothing where nobody finished anything', () => {
		expect(toWallHighlights(entries(card({ badges: [] })), 6)).toEqual([]);
	});
});

describe('toWallCollectionCards', () => {
	const definition = (slug: string, group: string | null = null) =>
		({
			uid: slug,
			slug,
			name: slug,
			description: null,
			icon: null,
			coverImageUrl: null,
			badge: null,
			group,
		}) as never;

	it('names a collection nobody has touched', () => {
		const cards = toWallCollectionCards([definition('glam')], []);

		expect(cards[0]).toMatchObject({
			slug: 'glam',
			finisherCount: 0,
			hunterCount: 0,
		});
	});

	it('counts who finished it and who is after it', () => {
		const wall = entries(
			card({ uid: 'u1', badges: [badge('doom')], collecting: [] }),
			card({ uid: 'u2', badges: [], collecting: ['doom'] }),
			card({ uid: 'u3', badges: [], collecting: ['doom'] })
		);
		const [doom] = toWallCollectionCards([definition('doom')], wall);

		expect(doom.finisherCount).toBe(1);
		expect(doom.hunterCount).toBe(2);
		expect(doom.hunters.map(({ uid }) => uid)).toEqual(['u2', 'u3']);
	});

	/** A collection with somebody on it is one a visitor can see the point of. */
	it('puts the collections with people on them first', () => {
		const wall = entries(card({ uid: 'u1', badges: [badge('doom')] }));
		const cards = toWallCollectionCards(
			[definition('alpha'), definition('doom')],
			wall
		);

		expect(cards.map(({ slug }) => slug)).toEqual(['doom', 'alpha']);
	});

	it('keeps the discographies behind the curated collections', () => {
		const cards = toWallCollectionCards(
			[definition('maiden', 'discography'), definition('glam')],
			[]
		);

		expect(cards.map(({ slug }) => slug)).toEqual(['glam', 'maiden']);
	});
});

describe('filterWall with what they are after', () => {
	it('finds whoever is collecting it, not only who finished it', () => {
		const wall = entries(
			card({ uid: 'u1', badges: [badge('doom')], collecting: [] }),
			card({ uid: 'u2', badges: [], collecting: ['doom'] }),
			card({ uid: 'u3', badges: [], collecting: ['glam'] })
		);

		expect(filterWall(wall, 'doom', '').map(({ uid }) => uid)).toEqual([
			'u1',
			'u2',
		]);
	});
});
