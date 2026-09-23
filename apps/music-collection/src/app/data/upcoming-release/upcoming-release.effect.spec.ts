import { EntityTypeEnum, UpcomingReleaseEntity } from '@music-collection/api';

import { toComing, today } from './upcoming-release.effect';

const release = (
	uid: string,
	releaseDate: string,
	artistName = 'Metallica',
	title = 'Something New'
): UpcomingReleaseEntity => ({
	artistImageUrl: null,
	artistName,
	artistUid: 'artist-1',
	countries: [],
	entityType: EntityTypeEnum.UpcomingRelease,
	firstReleaseDate: null,
	formats: [],
	labels: [],
	matchedBy: 'musicBrainzId',
	musicBrainzArtistIds: [],
	primaryType: 'Album',
	releaseDate,
	releaseGroupId: uid,
	secondaryTypes: [],
	title,
	uid,
});

describe('today', () => {
	it('helyi idő szerinti napot ad, nullákkal kiegészítve', () => {
		expect(today(new Date(2026, 8, 7, 23, 30))).toBe('2026-09-07');
	});
});

describe('toComing', () => {
	it('a már megjelent lemezt elhagyja', () => {
		const coming = toComing(
			[release('a', '2026-09-21'), release('b', '2026-09-23')],
			'2026-09-22'
		);

		expect(coming.map((entry) => entry.uid)).toEqual(['b']);
	});

	it('a mai napot még mutatja', () => {
		expect(
			toComing([release('a', '2026-09-22')], '2026-09-22')
		).toHaveLength(1);
	});

	it('dátum, előadó, majd cím szerint rendez', () => {
		const coming = toComing(
			[
				release('c', '2026-10-02', 'Slayer', 'B'),
				release('b', '2026-09-25', 'Metallica', 'B'),
				release('a', '2026-09-25', 'Metallica', 'A'),
			],
			'2026-09-22'
		);

		expect(coming.map((entry) => entry.uid)).toEqual(['a', 'b', 'c']);
	});
});
