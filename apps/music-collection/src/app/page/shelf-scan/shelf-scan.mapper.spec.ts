import {
	AlbumEntity,
	CollectionItemEntity,
	ReleaseEntity,
	ShelfScanSpine,
} from '@music-collection/api';

import { toShelfRequest, toShelfRow, toShelfRows } from './shelf-scan.mapper';

const spine = (overrides: Partial<ShelfScanSpine> = {}): ShelfScanSpine => ({
	position: 1,
	unreadable: false,
	artist: 'Katatonia',
	albumTitle: 'City Burials',
	label: null,
	catalogNumber: null,
	barcode: null,
	media: 'vinyl',
	country: null,
	year: null,
	confidence: 'high',
	conflicts: [],
	alternatives: {},
	seenOn: 2,
	...overrides,
});

const album = {
	uid: 'album-1',
	name: 'City Burials',
	artist: { uid: 'artist-1', name: 'Katatonia' },
} as unknown as AlbumEntity;

const release = {
	uid: 'release-1',
	catno: 'VILELP566',
	album,
} as unknown as ReleaseEntity;

const empty = { albums: [], releases: [], ownedItems: [] };

describe('toShelfRow', () => {
	it('a katalógusban nem lévő albumot új albumnak jelöli', () => {
		expect(toShelfRow(spine(), {}, empty).state).toBe('new-album');
	});

	it('meglévő albumnál új préselést mond', () => {
		const row = toShelfRow(spine(), {}, { ...empty, albums: [album] });

		expect(row.state).toBe('new-release');
		expect(row.albumUid).toBe('album-1');
	});

	it('a katalógusszám a préselést is megtalálja', () => {
		const row = toShelfRow(
			spine({ catalogNumber: 'VILELP566' }),
			{},
			{
				albums: [album],
				releases: [release],
				ownedItems: [],
			}
		);

		expect(row.state).toBe('in-catalog');
		expect(row.releaseUid).toBe('release-1');
	});

	it('a tagolástól függetlenül egyezik a katalógusszám', () => {
		// A gerincen "VILE LP 566" áll, a katalógusban "VILELP566".
		const row = toShelfRow(
			spine({ catalogNumber: 'VILE LP 566' }),
			{},
			{
				albums: [album],
				releases: [release],
				ownedItems: [],
			}
		);

		expect(row.releaseUid).toBe('release-1');
	});

	it('a már meglévő példányt felismeri', () => {
		const owned = {
			release: { uid: 'release-1' },
		} as unknown as CollectionItemEntity;
		const row = toShelfRow(
			spine({ catalogNumber: 'VILELP566' }),
			{},
			{
				albums: [album],
				releases: [release],
				ownedItems: [owned],
			}
		);

		expect(row.state).toBe('in-collection');
	});

	it('a javítás felülírja a modell olvasatát', () => {
		const row = toShelfRow(
			spine({ albumTitle: 'City Burals' }),
			{ albumTitle: 'City Burials' },
			{ ...empty, albums: [album] }
		);

		expect(row.albumTitle).toBe('City Burials');
		expect(row.state).toBe('new-release');
		expect(row.edited).toEqual(['albumTitle']);
	});

	it('a javított mező konfliktusa eldőlt', () => {
		const row = toShelfRow(
			spine({
				catalogNumber: 'MOVLP2621',
				conflicts: ['catalogNumber'],
				alternatives: { catalogNumber: 'MOVLP2023' },
			}),
			{ catalogNumber: 'MOVLP2620' },
			empty
		);

		expect(row.conflicts).toEqual([]);
		expect(row.catalogNumber).toBe('MOVLP2620');
	});

	it('a kitöltött gerinc már nem olvashatatlan', () => {
		const unreadable = spine({
			unreadable: true,
			artist: null,
			albumTitle: null,
		});

		expect(toShelfRow(unreadable, {}, empty).unreadable).toBe(true);
		expect(
			toShelfRow(unreadable, { albumTitle: 'Obsidian' }, empty).unreadable
		).toBe(false);
	});

	it('cím és katalógusszám nélkül nem azonosítható', () => {
		const blank = spine({ artist: null, albumTitle: null });

		expect(toShelfRow(blank, {}, empty).identifiable).toBe(false);
		expect(
			toShelfRow(blank, { catalogNumber: 'VILELP76' }, empty).identifiable
		).toBe(true);
	});
});

describe('toShelfRows', () => {
	it('a javításokat pozíció szerint párosítja', () => {
		const rows = toShelfRows(
			[spine({ position: 1 }), spine({ position: 2, albumTitle: 'Nyt' })],
			{ 2: { albumTitle: "Tonight's Decision" } },
			empty
		);

		expect(rows.map((row) => row.albumTitle)).toEqual([
			'City Burials',
			"Tonight's Decision",
		]);
	});
});

describe('toShelfRequest', () => {
	it('a javított olvasatot viszi a kérésbe', () => {
		const row = toShelfRow(
			spine(),
			{ catalogNumber: 'VILELP76', label: 'Peaceville' },
			{ ...empty, albums: [album] }
		);

		expect(toShelfRequest(row, 'user-1')).toMatchObject({
			userId: 'user-1',
			status: 'pending',
			album: {
				uid: 'album-1',
				name: 'City Burials',
				artistName: 'Katatonia',
			},
			pressing: {
				catno: 'VILELP76',
				label: 'Peaceville',
				format: 'vinyl',
			},
		});
	});
});
