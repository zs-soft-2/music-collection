import {
	CollectionShortfall,
	MusicCollectionMembership,
} from '@music-collection/domain/music-collection/api';

import { suggestNextAlbums } from './music-collection-next';

function membership(
	albumUid: string,
	artistName = 'Artist',
	year: number | null = 1988,
	albumName = `Album ${albumUid}`
): MusicCollectionMembership {
	return {
		albumUid,
		albumName,
		artistUid: artistName.toLowerCase(),
		artistName,
		year,
		coverUrl: null,
	};
}

function shortfall(
	collectionUid: string,
	albumUids: string[],
	missingAlbumUids: string[],
	totalPoints: number
): CollectionShortfall {
	return {
		collectionUid,
		albums: albumUids.map((uid) => membership(uid)),
		missingAlbumUids,
		totalPoints,
	};
}

const uids = (count: number, prefix: string) =>
	Array.from({ length: count }, (_unused, index) => `${prefix}-${index}`);

/** Four albums, worth 400, and only one of them still to find. */
const NEARLY = shortfall('nearly', uids(4, 'nearly'), ['nearly-3'], 400);
/** Ten albums, worth 1000, five to find: one of them moves 200. */
const HALFWAY = shortfall(
	'halfway',
	uids(10, 'halfway'),
	uids(5, 'halfway'),
	1000
);
/** Ten albums, worth only 100, five to find: one of them moves 20. */
const SLIM = shortfall('slim', uids(10, 'slim'), uids(5, 'slim'), 100);

const byUid =
	(albumUid: string) => (suggestion: { album: { albumUid: string } }) =>
		suggestion.album.albumUid === albumUid;

describe('suggestNextAlbums', () => {
	it('puts the record that finishes a collection first', () => {
		const suggestions = suggestNextAlbums([HALFWAY, NEARLY, SLIM]);

		expect(suggestions[0].album.albumUid).toBe('nearly-3');
		expect(suggestions[0].unlockedPoints).toBe(400);
		expect(suggestions[0].completesCollectionUids).toEqual(['nearly']);
	});

	/*
	 * The decision this list is built on: a badge is an event, not a number.
	 * A record that hands over a small collection today outranks one that
	 * moves a far richer collection closer, because the collector can hold
	 * the first one tonight.
	 */
	it('ranks finishing a cheap collection above moving a rich one', () => {
		const rich = shortfall(
			'rich',
			uids(10, 'rich'),
			uids(2, 'rich'),
			10_000
		);
		const cheap = shortfall('cheap', uids(2, 'cheap'), ['cheap-1'], 100);

		const [first, second] = suggestNextAlbums([rich, cheap]);

		expect(first.album.albumUid).toBe('cheap-1');
		expect(first.unlockedPoints).toBe(100);
		// Worth far more in the end, but it earns nothing tonight.
		expect(second.unlockedPoints).toBe(0);
		expect(second.potentialPoints).toBe(5000);
	});

	it('adds up the collections one record finishes at once', () => {
		const alsoNearly: CollectionShortfall = {
			collectionUid: 'also-nearly',
			albums: [membership('nearly-3'), membership('other')],
			missingAlbumUids: ['nearly-3'],
			totalPoints: 250,
		};

		const [first] = suggestNextAlbums([NEARLY, alsoNearly]);

		expect(first.unlockedPoints).toBe(650);
		expect(first.completesCollectionUids).toEqual([
			'nearly',
			'also-nearly',
		]);
	});

	it('shares what is locked up between the records still missing', () => {
		const suggestions = suggestNextAlbums([HALFWAY, SLIM]);

		// 1000 locked behind five records, against 100 behind five.
		expect(suggestions.find(byUid('halfway-0'))?.potentialPoints).toBe(200);
		expect(suggestions.find(byUid('slim-0'))?.potentialPoints).toBe(20);
		expect(suggestions[0].album.albumUid).toBe('halfway-0');
	});

	/* Two collections short of the same record: the shares add up. */
	it('counts a record every collection that wants it', () => {
		const shared: CollectionShortfall = {
			...SLIM,
			collectionUid: 'shared',
			albums: [...SLIM.albums, membership('halfway-0')],
			missingAlbumUids: [...SLIM.missingAlbumUids, 'halfway-0'],
		};
		// 100 behind six records now, so its share is smaller.
		const share = Math.round(100 / 6);

		const suggestions = suggestNextAlbums([HALFWAY, shared]);
		const wanted = suggestions.find(byUid('halfway-0'));

		expect(wanted?.potentialPoints).toBe(200 + share);
		expect(
			wanted?.wantedBy.map(({ collectionUid }) => collectionUid)
		).toEqual(['halfway', 'shared']);
	});

	it('names every collection that wants it, the nearest to done first', () => {
		const shared: CollectionShortfall = {
			collectionUid: 'one-away',
			albums: [membership('halfway-0'), membership('kept')],
			missingAlbumUids: ['halfway-0'],
			totalPoints: 300,
		};

		const [first] = suggestNextAlbums([HALFWAY, shared]);

		expect(first.wantedBy).toEqual([
			{ collectionUid: 'one-away', missing: 1, totalPoints: 300 },
			{ collectionUid: 'halfway', missing: 5, totalPoints: 1000 },
		]);
	});

	it('never names a record that is already on the shelf', () => {
		const suggestions = suggestNextAlbums([NEARLY]);

		// Three of the four are owned: only what is missing can be bought.
		expect(suggestions).toHaveLength(1);
		expect(
			suggestions.map((suggestion) => suggestion.album.albumUid)
		).not.toContain('nearly-0');
	});

	it('takes nothing from a collection that is complete', () => {
		const complete = shortfall('complete', uids(4, 'complete'), [], 900);

		expect(suggestNextAlbums([complete])).toEqual([]);
	});

	it('takes nothing from a collection that resolves to nothing', () => {
		expect(suggestNextAlbums([shortfall('empty', [], [], 0)])).toEqual([]);
	});

	it('suggests nothing to a collector who follows nothing', () => {
		expect(suggestNextAlbums([])).toEqual([]);
	});

	/*
	 * A record the collection does not ask for cannot be described — no name,
	 * no cover, nowhere to go. Better left out than shown as a blank row.
	 */
	it('leaves out a missing uid the collection has no album for', () => {
		const stale: CollectionShortfall = {
			collectionUid: 'stale',
			albums: [membership('known')],
			missingAlbumUids: ['known', 'vanished'],
			totalPoints: 200,
		};

		expect(
			suggestNextAlbums([stale]).map(
				(suggestion) => suggestion.album.albumUid
			)
		).toEqual(['known']);
	});

	it('still lists the records of a collection worth nothing, at the back', () => {
		const worthless = shortfall(
			'worthless',
			uids(2, 'worthless'),
			['worthless-1'],
			0
		);

		const suggestions = suggestNextAlbums([HALFWAY, worthless]);

		expect(suggestions.at(-1)?.album.albumUid).toBe('worthless-1');
		expect(suggestions.at(-1)?.potentialPoints).toBe(0);
	});

	/* Equal worth must not shuffle between two renders of the same shelf. */
	it('orders records of equal worth by artist, then year, then title', () => {
		const tied: CollectionShortfall = {
			collectionUid: 'tied',
			albums: [
				membership('c', 'Slayer', 1986),
				membership('b', 'Anthrax', 1987, 'Among the Living'),
				membership('a', 'Anthrax', 1985, 'Spreading the Disease'),
				membership('d', 'Anthrax', 1987, 'A Second Of 1987'),
			],
			missingAlbumUids: ['c', 'b', 'a', 'd'],
			totalPoints: 400,
		};

		expect(
			suggestNextAlbums([tied]).map(
				(suggestion) => suggestion.album.albumUid
			)
		).toEqual(['a', 'd', 'b', 'c']);
	});

	/*
	 * The two numbers meet on the last record of a collection: its share of
	 * what is locked up *is* the whole of it. That is what lets one sorted
	 * list hold both kinds of answer.
	 */
	it('values the last missing record at the whole collection', () => {
		const [first] = suggestNextAlbums([NEARLY]);

		expect(first.potentialPoints).toBe(400);
		expect(first.unlockedPoints).toBe(400);
	});
});
