import {
	albumYearMillis,
	genericReleaseUid,
	isGenericReleaseMedia,
	toGenericRelease,
	withPlainDates,
} from './generic-release';

/** Firestore Timestamp helyett: csak a `toMillis` számít. */
const timestamp = (ms: number) => ({ toMillis: () => ms });

const ALBUM = {
	uid: 'album-1',
	name: 'Master of Puppets',
	artist: { uid: 'artist-1', name: 'Metallica' },
	year: Date.UTC(1986, 2, 3),
};

describe('isGenericReleaseMedia', () => {
	it('csak a négy hordozót fogadja el', () => {
		expect(isGenericReleaseMedia('vinyl')).toBe(true);
		expect(isGenericReleaseMedia('cassette')).toBe(true);
		expect(isGenericReleaseMedia('boxset')).toBe(false);
		expect(isGenericReleaseMedia('all')).toBe(false);
		expect(isGenericReleaseMedia(undefined)).toBe(false);
	});
});

describe('genericReleaseUid', () => {
	it('albumonként és hordozónként egyedi', () => {
		expect(genericReleaseUid('album-1', 'vinyl')).toBe(
			'generic-album-1-vinyl'
		);
		expect(genericReleaseUid('album-1', 'cd')).not.toBe(
			genericReleaseUid('album-2', 'cd')
		);
	});
});

describe('albumYearMillis', () => {
	it('számot, Date-et és Timestampet is olvas', () => {
		const ms = Date.UTC(1986, 0, 1);

		expect(albumYearMillis(ms)).toBe(ms);
		expect(albumYearMillis(new Date(ms))).toBe(ms);
		expect(albumYearMillis(timestamp(ms))).toBe(ms);
		expect(albumYearMillis(null)).toBeNull();
		expect(albumYearMillis('1986')).toBeNull();
	});
});

describe('toGenericRelease', () => {
	it('kiadó, ország és katalógusszám nélküli kiadás az album évével', () => {
		const release = toGenericRelease(ALBUM, 'vinyl');

		expect(release).toMatchObject({
			uid: 'generic-album-1-vinyl',
			entityType: 'Release',
			generic: true,
			name: 'Master of Puppets',
			album: ALBUM,
			artist: {
				uid: 'artist-1',
				entityType: 'Artist',
				name: 'Metallica',
			},
			catno: null,
			country: null,
			date: ALBUM.year,
			formatDescription: null,
			label: null,
			media: 'vinyl',
			discogsReleaseId: null,
		});
		expect(release['searchParameters']).toContain('master');
	});

	it('év nélküli albumnál a dátum is üres', () => {
		expect(
			toGenericRelease({ ...ALBUM, year: null }, 'cd')['date']
		).toBeNull();
	});
});

describe('withPlainDates', () => {
	it('a beágyazott Timestampeket is epoch ms-re cseréli', () => {
		const ms = Date.UTC(1986, 0, 1);

		expect(
			withPlainDates({
				date: ms,
				album: { year: timestamp(ms), styles: ['Thrash'] },
				label: null,
			})
		).toEqual({
			date: ms,
			album: { year: ms, styles: ['Thrash'] },
			label: null,
		});
	});
});
