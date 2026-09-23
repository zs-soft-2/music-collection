import { EntityTypeEnum, UpcomingReleaseEntity } from '@music-collection/api';

import {
	hasVinyl,
	toCountdown,
	toKind,
	toMonths,
	toTypeLabel,
	toUpcomingRelease,
} from './upcoming.mapper';

const release = (
	overrides: Partial<UpcomingReleaseEntity> = {}
): UpcomingReleaseEntity => ({
	artistImageUrl: 'https://example.test/metallica.jpg',
	artistName: 'Metallica',
	artistUid: 'artist-metallica',
	countries: ['GB', 'US'],
	entityType: EntityTypeEnum.UpcomingRelease,
	firstReleaseDate: null,
	formats: ['Vinyl', 'CD'],
	labels: ['Blackened'],
	matchedBy: 'musicBrainzId',
	musicBrainzArtistIds: ['65f4f0c5-ef9e-490c-aee3-909e7ae6b2ab'],
	primaryType: 'Album',
	releaseDate: '2026-10-02',
	releaseGroupId: 'group-1',
	secondaryTypes: [],
	title: 'Something New',
	uid: 'group-1',
	...overrides,
});

describe('toKind', () => {
	it('a soha meg nem jelent lemez új', () => {
		expect(toKind(release({ firstReleaseDate: null }))).toBe('new');
	});

	it('az aznapi első megjelenés is új', () => {
		expect(toKind(release({ firstReleaseDate: '2026-10-02' }))).toBe('new');
	});

	it('a korábban megjelent lemez újrakiadás', () => {
		expect(toKind(release({ firstReleaseDate: '1991-08-12' }))).toBe(
			'reissue'
		);
	});
});

describe('toTypeLabel', () => {
	it('a fő típust a másodlagosokkal fűzi össze', () => {
		expect(
			toTypeLabel(
				release({ primaryType: 'Album', secondaryTypes: ['Live'] })
			)
		).toBe('Album · Live');
	});

	it('üres, ha a MusicBrainz nem mond típust', () => {
		expect(
			toTypeLabel(release({ primaryType: null, secondaryTypes: [] }))
		).toBe('');
	});
});

describe('hasVinyl', () => {
	it.each([
		['Vinyl', true],
		['12" Vinyl', true],
		['LP', true],
		['CD', false],
		['Cassette', false],
	])('%s → %s', (format, expected) => {
		expect(hasVinyl([format])).toBe(expected);
	});
});

describe('toUpcomingRelease', () => {
	it('a nézet mezőit tölti', () => {
		expect(toUpcomingRelease(release())).toEqual({
			artistImageUrl: 'https://example.test/metallica.jpg',
			artistName: 'Metallica',
			artistUid: 'artist-metallica',
			countries: 'GB · US',
			coverUrl:
				'https://coverartarchive.org/release-group/group-1/front-250',
			formats: ['Vinyl', 'CD'],
			kind: 'new',
			labels: 'Blackened',
			namesake: false,
			onVinyl: true,
			originalYear: null,
			releaseDate: '2026-10-02',
			sourceUrl: 'https://musicbrainz.org/release-group/group-1',
			title: 'Something New',
			typeLabel: 'Album',
			uid: 'group-1',
		});
	});

	it('az újrakiadáson az eredeti évet mutatja', () => {
		const view = toUpcomingRelease(
			release({ firstReleaseDate: '1984-07-27' })
		);

		expect(view.kind).toBe('reissue');
		expect(view.originalYear).toBe('1984');
	});

	it('a névre párosított lemezt megjelöli', () => {
		expect(toUpcomingRelease(release({ matchedBy: 'name' })).namesake).toBe(
			true
		);
	});
});

describe('toCountdown', () => {
	it.each([
		['2026-09-22', 'Today'],
		['2026-09-23', 'Tomorrow'],
		['2026-09-25', 'in 3 days'],
		['2026-09-30', 'next week'],
		['2026-10-20', 'in 4 weeks'],
	])('%s → %s', (day, expected) => {
		expect(toCountdown(day, '2026-09-22')).toBe(expected);
	});

	it('a már elmúlt napot is mainak mondja', () => {
		expect(toCountdown('2026-09-21', '2026-09-22')).toBe('Today');
	});
});

describe('toMonths', () => {
	it('hónapokra, azon belül napokra bontja a listát', () => {
		const months = toMonths(
			[
				release({ uid: 'a', releaseDate: '2026-09-25' }),
				release({ uid: 'b', releaseDate: '2026-09-25' }),
				release({ uid: 'c', releaseDate: '2026-10-02' }),
			],
			'2026-09-22'
		);

		expect(months).toHaveLength(2);
		expect(months[0].label).toBe('September 2026');
		expect(months[0].days).toHaveLength(1);
		expect(months[0].days[0]).toMatchObject({
			countdown: 'in 3 days',
			day: '25',
			key: '2026-09-25',
			weekday: 'Friday',
		});
		expect(months[0].days[0].releases.map((view) => view.uid)).toEqual([
			'a',
			'b',
		]);
		expect(months[1].label).toBe('October 2026');
	});

	it('üres listára üres idővonal', () => {
		expect(toMonths([], '2026-09-22')).toEqual([]);
	});
});
