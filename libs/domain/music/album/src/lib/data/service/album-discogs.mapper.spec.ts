import { DiscogsMasterCandidate, StyleEnum } from '@music-collection/api';

import {
	pickDiscogsMaster,
	toDiscogsAlbumProfile,
	toDiscogsTracks,
} from './album-discogs.mapper';

const candidate = (
	fields: Partial<DiscogsMasterCandidate> = {}
): DiscogsMasterCandidate => ({
	masterId: 1,
	name: 'The Legacy',
	artistName: 'Testament',
	year: 1987,
	thumbUrl: null,
	...fields,
});

describe('pickDiscogsMaster', () => {
	it('takes the hit whose artist and title both match', () => {
		const hit = pickDiscogsMaster('Testament', 'The Legacy', [
			candidate({ masterId: 9, name: 'The Legacy Tribute' }),
			candidate({ masterId: 7, artistName: 'Other Band' }),
			candidate({ masterId: 3 }),
		]);

		expect(hit?.masterId).toBe(3);
	});

	it('takes the earliest of several masters of the same album', () => {
		const hit = pickDiscogsMaster('Testament', 'The Legacy', [
			candidate({ masterId: 8, year: 2017 }),
			candidate({ masterId: 3, year: 1987 }),
		]);

		expect(hit?.masterId).toBe(3);
	});

	it('does not rule out a hit Discogs names no artist for', () => {
		const hit = pickDiscogsMaster('Testament', 'The Legacy', [
			candidate({ masterId: 4, artistName: null }),
		]);

		expect(hit?.masterId).toBe(4);
	});

	it('is null when nothing carries the title', () => {
		expect(
			pickDiscogsMaster('Testament', 'The Legacy', [
				candidate({ name: 'Practice What You Preach' }),
			])
		).toBeNull();
	});
});

describe('toDiscogsAlbumProfile', () => {
	it('leaves the format open: a master is the album, not a pressing', () => {
		expect(
			toDiscogsAlbumProfile({
				masterId: 21929,
				name: 'The Legacy',
				artistName: 'Testament',
				year: 1987,
				styles: ['Thrash', 'Bossa Nova'],
				coverUrl: 'https://img/cover.jpg',
				tracks: [],
			})
		).toEqual({
			coverImageUrl: 'https://img/cover.jpg',
			format: null,
			name: 'The Legacy',
			source: 'discogs',
			sourceUrl: 'https://www.discogs.com/master/21929',
			styles: [StyleEnum.Thrash],
			year: new Date(1987, 0, 1),
		});
	});
});

describe('toDiscogsTracks', () => {
	it('derives the seconds from the printed duration', () => {
		expect(
			toDiscogsTracks([
				{ position: 'A1', name: 'Over The Wall', duration: '4:04' },
				{ position: 'A2', name: 'The Haunting', duration: null },
			])
		).toEqual([
			{
				name: 'Over The Wall',
				position: 'A1',
				duration: '4:04',
				durationSec: 244,
			},
			{
				name: 'The Haunting',
				position: 'A2',
				duration: null,
				durationSec: null,
			},
		]);
	});
});
