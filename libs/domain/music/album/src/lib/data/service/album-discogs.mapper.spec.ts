import {
	AlbumExternalProfile,
	DiscogsMasterCandidate,
	FormatEnum,
	StyleEnum,
} from '@music-collection/api';

import {
	fillAlbumGaps,
	hasAlbumGaps,
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
			fillerSourceUrl: null,
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

/** A MusicBrainz profile as the album form gets it. */
const profile = (
	fields: Partial<AlbumExternalProfile> = {}
): AlbumExternalProfile => ({
	coverImageUrl: 'https://coverartarchive.org/front.jpg',
	fillerSourceUrl: null,
	format: FormatEnum.lp,
	name: 'The Legacy',
	source: 'musicbrainz',
	sourceUrl: 'https://musicbrainz.org/release-group/dc68af1c',
	styles: [StyleEnum.Thrash],
	year: new Date(1987, 0, 1),
	...fields,
});

describe('hasAlbumGaps', () => {
	it('is false for a profile the other source could not improve', () => {
		expect(hasAlbumGaps(profile())).toBe(false);
	});

	it('spots the release group with no cover art', () => {
		// The Cover Art Archive answers 404 for a great many albums; the album
		// is found, the cover field stays empty, and nothing else would notice.
		expect(hasAlbumGaps(profile({ coverImageUrl: null }))).toBe(true);
	});

	it('spots the release group with no genres', () => {
		expect(hasAlbumGaps(profile({ styles: [] }))).toBe(true);
	});
});

describe('fillAlbumGaps', () => {
	const discogs = toDiscogsAlbumProfile({
		masterId: 21929,
		name: 'The Legacy (Reissue)',
		artistName: 'Testament',
		year: 2017,
		styles: ['Thrash'],
		coverUrl: 'https://img/discogs-cover.jpg',
		tracks: [],
	});

	it('fills the empty fields and names the source that filled them', () => {
		const merged = fillAlbumGaps(
			profile({ coverImageUrl: null, styles: [] }),
			discogs
		);

		expect(merged.coverImageUrl).toBe('https://img/discogs-cover.jpg');
		expect(merged.styles).toEqual([StyleEnum.Thrash]);
		expect(merged.fillerSourceUrl).toBe(
			'https://www.discogs.com/master/21929'
		);
	});

	it('never overwrites what the first source knew', () => {
		const merged = fillAlbumGaps(profile(), discogs);

		expect(merged.name).toBe('The Legacy');
		expect(merged.year).toEqual(new Date(1987, 0, 1));
		expect(merged.coverImageUrl).toBe(
			'https://coverartarchive.org/front.jpg'
		);
		expect(merged.source).toBe('musicbrainz');
		expect(merged.sourceUrl).toBe(
			'https://musicbrainz.org/release-group/dc68af1c'
		);
	});

	it('leaves no second link where the other source filled nothing', () => {
		const empty = toDiscogsAlbumProfile({
			masterId: 21929,
			name: 'The Legacy',
			artistName: 'Testament',
			year: null,
			styles: [],
			coverUrl: null,
			tracks: [],
		});

		expect(
			fillAlbumGaps(profile({ coverImageUrl: null }), empty)
				.fillerSourceUrl
		).toBeNull();
	});
});
