import { ShelfUnitLayout } from '@music-collection/api';
import { MusicCollectionStanding } from '@music-collection/domain/music-collection/core';

import { radioStations } from './radio.mapper';

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

describe('radioStations', () => {
	it('offers the catalog stations to everyone', () => {
		const stations = radioStations([], [], []);

		expect(stations.map((item) => item.id)).toEqual(['new', 'random']);
	});

	it('offers the shelf stations once something stands on it', () => {
		const stations = radioStations([], [], [{ placement: null }]);

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
			[filed('living-room')]
		);

		expect(stations.map((item) => item.id)).toContain('shelf:living-room');
		expect(stations.map((item) => item.id)).not.toContain('shelf:attic');
		expect(
			stations.find((item) => item.id === 'shelf:living-room')?.label
		).toBe('Living room');
	});

	it('names an unnamed unit rather than leaving it blank', () => {
		const stations = radioStations([unit('u1')], [], [filed('u1')]);

		expect(stations.find((item) => item.id === 'shelf:u1')?.label).toBe(
			'Unnamed unit'
		);
	});

	it('offers a station per published collection', () => {
		const stations = radioStations(
			[],
			[standing('prog', 'Prog classics')],
			[]
		);

		expect(stations.at(-1)).toMatchObject({
			id: 'collection:prog',
			label: 'Prog classics',
			station: { kind: 'collection', slug: 'prog' },
		});
	});

	it('counts a collection from what was already resolved', () => {
		const stations = radioStations(
			[],
			[standing('prog', 'Prog classics', ['a', 'b', 'gone'])],
			[],
			new Set(['a', 'b'])
		);

		expect(stations.at(-1)?.count).toBe(2);
	});

	it('leaves the other stations to be counted', () => {
		const stations = radioStations([], [], []);

		expect(stations.every((station) => station.count === null)).toBe(true);
	});
});
