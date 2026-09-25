import { ShelfUnitLayout } from '@music-collection/api';
import { MusicCollectionStanding } from '@music-collection/domain/music-collection/core';

import { radioStations, toStationView } from './radio.mapper';
import { CountedStation } from './radio.model';

const unit = (id: string, name = ''): ShelfUnitLayout => ({
	id,
	name,
	rows: 2,
	columns: 2,
});

const filed = (unitId: string) => ({
	placement: { unitId, row: 1, column: 1, position: 1 },
});

const standing = (slug: string, name: string, albumUids: string[] = []) =>
	({
		collection: { slug, name, description: null, icon: null },
		resolved: { albums: albumUids.map((albumUid) => ({ albumUid })) },
	}) as MusicCollectionStanding;

/** Stands in for the dictionary: a key comes back as itself. */
const t = (key: string) => key;

describe('radioStations', () => {
	it('offers the catalog stations to everyone', () => {
		const stations = radioStations([], [], [], t);

		expect(stations.map((item) => item.id)).toEqual(['new', 'random']);
	});

	it('opens on the band of the week where a run has chosen one', () => {
		const stations = radioStations([], [], [], t, new Set(), {
			artistName: 'Metallica',
		});

		expect(stations.map((item) => item.id)).toEqual([
			'week',
			'new',
			'random',
		]);
	});

	it('leaves the week out where no band was chosen', () => {
		const stations = radioStations([], [], [], t, new Set(), null);

		expect(stations.map((item) => item.id)).not.toContain('week');
	});

	it('names the week station after the band', () => {
		const [week] = radioStations([], [], [], t, new Set(), {
			artistName: 'Metallica',
		});

		// The dictionary stands in for itself here; what matters is that the
		// band's name is what the station is named with.
		expect(week.label).toBe('radio.bandOfTheWeek.name');
		expect(week.station.kind).toBe('week');
	});

	it('offers the shelf stations once something stands on it', () => {
		const stations = radioStations([], [], [{ placement: null }], t);

		expect(stations.map((item) => item.id)).toEqual([
			'new',
			'taste',
			'shelf',
			'random',
		]);
	});

	it('offers a unit only while records are filed into it', () => {
		const stations = radioStations(
			[unit('living-room', 'Living room'), unit('attic', 'Attic')],
			[],
			[filed('living-room')],
			t
		);

		expect(stations.map((item) => item.id)).toContain('shelf:living-room');
		expect(stations.map((item) => item.id)).not.toContain('shelf:attic');
		expect(
			stations.find((item) => item.id === 'shelf:living-room')?.label
		).toBe('Living room');
	});

	it('names an unnamed unit rather than leaving it blank', () => {
		const stations = radioStations([unit('u1')], [], [filed('u1')], t);

		expect(stations.find((item) => item.id === 'shelf:u1')?.label).toBe(
			'radio.unnamedUnit'
		);
	});

	it('offers a station per published collection', () => {
		const stations = radioStations(
			[],
			[standing('prog', 'Prog classics')],
			[],
			t
		);

		expect(stations.at(-1)).toMatchObject({
			id: 'collection:prog',
			label: 'Prog classics',
			station: { kind: 'collection', slug: 'prog' },
		});
	});

	it('keeps the records a collection would put on, to name them', () => {
		const stations = radioStations(
			[],
			[standing('prog', 'Prog classics', ['a', 'b', 'gone'])],
			[],
			t,
			new Set(['a', 'b'])
		);

		expect(stations.at(-1)?.albumIds).toEqual(['a', 'b']);
	});

	it('leaves the other stations to say what they hold', () => {
		const stations = radioStations([], [], [], t);

		expect(stations.every((station) => station.albumIds === null)).toBe(
			true
		);
	});

	it('counts a collection from what was already resolved', () => {
		const stations = radioStations(
			[],
			[standing('prog', 'Prog classics', ['a', 'b', 'gone'])],
			[],
			t,
			new Set(['a', 'b'])
		);

		expect(stations.at(-1)?.count).toBe(2);
	});

	it('leaves the other stations to be counted', () => {
		const stations = radioStations([], [], [], t);

		expect(stations.every((station) => station.count === null)).toBe(true);
	});
});

describe('toStationView', () => {
	const counted = (over: Partial<CountedStation> = {}): CountedStation => ({
		id: 'new',
		station: { kind: 'new' },
		label: 'Just in',
		description: 'The newest records.',
		icon: 'pi pi-sparkles',
		count: null,
		albumIds: null,
		...over,
	});

	const names = new Map([
		['a', { albumTitle: 'Foxtrot', artistName: 'Genesis' }],
		['b', { albumTitle: 'Fragile', artistName: 'Yes' }],
		['c', { albumTitle: 'Red', artistName: 'King Crimson' }],
		['d', { albumTitle: 'Hemispheres', artistName: 'Rush' }],
	]);

	it('counts what the station turned out to hold', () => {
		const view = toStationView(counted(), ['a', 'b', 'c', 'd'], names);

		expect(view.count).toBe(4);
	});

	it('keeps a count the station already knew', () => {
		const view = toStationView(counted({ count: 25 }), ['a'], names);

		expect(view.count).toBe(25);
	});

	it('names the first few records, not all of them', () => {
		const view = toStationView(counted(), ['a', 'b', 'c', 'd'], names);

		expect(view.preview).toEqual([
			{ albumTitle: 'Foxtrot', artistName: 'Genesis' },
			{ albumTitle: 'Fragile', artistName: 'Yes' },
			{ albumTitle: 'Red', artistName: 'King Crimson' },
		]);
	});

	it('passes over a record the catalog cannot name', () => {
		const view = toStationView(counted(), ['gone', 'a'], names);

		expect(view.preview).toEqual([
			{ albumTitle: 'Foxtrot', artistName: 'Genesis' },
		]);
		expect(view.count).toBe(2);
	});
});
