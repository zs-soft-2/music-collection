import { StyleEnum } from '@music-collection/common/api';
import { OwnedCopy } from '@music-collection/domain/music-collection/api';

import { compareWithCollection } from './music-collection-completion';
import { resolveMusicCollection } from './music-collection-resolver';
import {
	BAY_AREA_1988,
	album,
	bayAreaCatalog,
	catalogOfSize,
	disposed,
	owned,
} from './music-collection.fixture';

/** A collection of ten albums, of which the collector owns the first `n`. */
function tenAlbums(ownedCount: number) {
	const resolved = resolveMusicCollection(
		{ uid: 'ten', criteriaVersion: 1, criteria: {} },
		catalogOfSize(10)
	);
	const copies = resolved.albums
		.slice(0, ownedCount)
		.map((membership) => owned(membership.albumUid));

	return { resolved, copies };
}

describe('compareWithCollection', () => {
	it('counts seven of ten as 70 per cent, not completed', () => {
		const { resolved, copies } = tenAlbums(7);

		const progress = compareWithCollection(resolved, copies);

		expect(progress.total).toBe(10);
		expect(progress.owned).toBe(7);
		expect(progress.missing).toBe(3);
		expect(progress.percentage).toBe(70);
		expect(progress.completed).toBe(false);
	});

	it('completes once the last three arrive', () => {
		const { resolved, copies } = tenAlbums(10);

		const progress = compareWithCollection(resolved, copies);

		expect(progress.owned).toBe(10);
		expect(progress.missing).toBe(0);
		expect(progress.percentage).toBe(100);
		expect(progress.completed).toBe(true);
		expect(progress.missingAlbumUids).toEqual([]);
	});

	it('names which albums are owned and which are missing', () => {
		const { resolved, copies } = tenAlbums(2);

		const progress = compareWithCollection(resolved, copies);

		expect(progress.ownedAlbumUids).toEqual(['album-0', 'album-1']);
		expect(progress.missingAlbumUids).toHaveLength(8);
	});

	it('does not count a second copy of the same record twice', () => {
		const { resolved, copies } = tenAlbums(7);

		const progress = compareWithCollection(resolved, [
			...copies,
			owned('album-0'),
		]);

		expect(progress.owned).toBe(7);
	});

	it('does not count several pressings of the same album twice', () => {
		const { resolved, copies } = tenAlbums(7);
		// The catalog holds one album; the shelf holds its vinyl and its CD.
		const pressings: OwnedCopy[] = [
			{ albumUid: 'album-8', disposedAt: null },
			{ albumUid: 'album-8', disposedAt: null },
		];

		const progress = compareWithCollection(resolved, [
			...copies,
			...pressings,
		]);

		expect(progress.owned).toBe(8);
	});

	it('does not count a wanted record as owned', () => {
		const { resolved, copies } = tenAlbums(9);

		// A wishlist item never becomes an OwnedCopy, so the last album
		// stays missing however badly it is wanted.
		const progress = compareWithCollection(resolved, copies);

		expect(progress.owned).toBe(9);
		expect(progress.completed).toBe(false);
		expect(progress.missingAlbumUids).toEqual(['album-9']);
	});

	it('takes the badge away when a record is sold', () => {
		const { resolved, copies } = tenAlbums(10);
		const afterSelling = [
			...copies.slice(1),
			disposed(copies[0].albumUid),
		];

		expect(compareWithCollection(resolved, copies).completed).toBe(true);

		const progress = compareWithCollection(resolved, afterSelling);

		expect(progress.owned).toBe(9);
		expect(progress.completed).toBe(false);
		expect(progress.percentage).toBe(90);
	});

	it('takes the badge away when the catalog gains a matching album', () => {
		const catalog = bayAreaCatalog();
		const copies = resolveMusicCollection(
			BAY_AREA_1988,
			catalog
		).albums.map((membership) => owned(membership.albumUid));

		expect(
			compareWithCollection(
				resolveMusicCollection(BAY_AREA_1988, catalog),
				copies
			).completed
		).toBe(true);

		// An admin adds a record that the definition matches.
		catalog.albums.push(
			album('bonded', 'Bonded by Blood', 'exodus', 'Exodus', 1988, [
				StyleEnum.Bay_Area_Thrash,
			])
		);

		const progress = compareWithCollection(
			resolveMusicCollection(BAY_AREA_1988, catalog),
			copies
		);

		expect(progress.total).toBe(7);
		expect(progress.owned).toBe(6);
		expect(progress.completed).toBe(false);
		expect(progress.missingAlbumUids).toEqual(['bonded']);
	});

	it('does not complete a collection that resolves to nothing', () => {
		const resolved = resolveMusicCollection(
			{ uid: 'empty', criteriaVersion: 1, criteria: { years: { equals: 1066 } } },
			bayAreaCatalog()
		);

		const progress = compareWithCollection(resolved, []);

		expect(progress.total).toBe(0);
		expect(progress.percentage).toBe(0);
		expect(progress.completed).toBe(false);
	});

	/*
	 * What the missing list promises whoever reads it: every uid in it names
	 * an album of this collection, and there are exactly `missing` of them.
	 * Suggesting what to buy next leans on both — a uid that named nothing
	 * would be a record with no name, no cover and nowhere to go.
	 */
	it('names missing albums the collection actually asks for, and counts them', () => {
		const { resolved, copies } = tenAlbums(4);
		const members = new Set(
			resolved.albums.map((membership) => membership.albumUid)
		);

		const progress = compareWithCollection(resolved, copies);

		expect(progress.missing).toBe(progress.missingAlbumUids.length);
		expect(progress.owned).toBe(progress.ownedAlbumUids.length);
		expect(progress.owned + progress.missing).toBe(progress.total);
		for (const albumUid of progress.missingAlbumUids) {
			expect(members.has(albumUid)).toBe(true);
		}
		// Nothing is both missing and on the shelf.
		expect(
			progress.missingAlbumUids.filter((albumUid) =>
				progress.ownedAlbumUids.includes(albumUid)
			)
		).toEqual([]);
	});

	it('never rounds up to a full bar beside a locked badge', () => {
		const resolved = resolveMusicCollection(
			{ uid: 'big', criteriaVersion: 1, criteria: {} },
			catalogOfSize(200)
		);
		const copies = resolved.albums
			.slice(0, 199)
			.map((membership) => owned(membership.albumUid));

		const progress = compareWithCollection(resolved, copies);

		expect(progress.completed).toBe(false);
		expect(progress.percentage).toBe(99);
	});
});
