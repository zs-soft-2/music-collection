import {
	MusicBrainzReleaseGroup,
	pickReleaseGroup,
	toDurationSec,
} from './album-external.mapper';

const group = (
	fields: Partial<MusicBrainzReleaseGroup> = {}
): MusicBrainzReleaseGroup => ({
	id: 'rg-1',
	title: 'Abbey Road',
	'primary-type': 'Album',
	'artist-credit': [{ name: 'The Beatles', artist: { name: 'The Beatles' } }],
	...fields,
});

describe('pickReleaseGroup', () => {
	/*
	 * The catalog files the band as "Beatles" and MusicBrainz credits it as
	 * "The Beatles". Read letter by letter the two are different acts, and the
	 * load ended with "no album found" over a search that had answered.
	 */
	it('reads the artist the way the catalog compares its own names', () => {
		const hit = pickReleaseGroup('Beatles', 'Abbey Road', [
			group({ id: 'rg-9', title: 'Abbey Road Remix' }),
			group({ id: 'rg-3' }),
		]);

		expect(hit?.id).toBe('rg-3');
	});

	it('prefers the studio album over what the band also released', () => {
		const hit = pickReleaseGroup('Beatles', 'Abbey Road', [
			group({
				id: 'rg-5',
				'primary-type': 'Album',
				'secondary-types': ['Live'],
			}),
			group({ id: 'rg-2' }),
		]);

		expect(hit?.id).toBe('rg-2');
	});

	/*
	 * A search for a title the band has no release group of still answers,
	 * with the band's other records. The best scored of them is offered, as
	 * the title may be written differently rather than missing.
	 */
	it('offers the best scored hit when none carries the title', () => {
		const hit = pickReleaseGroup('Beatles', 'Abbey Road', [
			group({ id: 'rg-7', title: 'Let It Be' }),
		]);

		expect(hit?.id).toBe('rg-7');
	});

	it('is null when the search found nobody of that name', () => {
		expect(
			pickReleaseGroup('Beatles', 'Abbey Road', [
				group({
					id: 'rg-4',
					'artist-credit': [{ name: 'Booker T. & The M.G.s' }],
				}),
			])
		).toBeNull();
	});
});


describe('toDurationSec', () => {
	it('reads a length as a sleeve prints it', () => {
		expect(toDurationSec('4:04')).toBe(244);
	});

	it('reads a side-long track', () => {
		expect(toDurationSec('1:02:30')).toBe(3750);
	});

	it('reads a length padded with spaces', () => {
		expect(toDurationSec('  3:09 ')).toBe(189);
	});

	it('has nothing to read when the length is unknown', () => {
		expect(toDurationSec(null)).toBeNull();
		expect(toDurationSec('')).toBeNull();
	});

	/*
	 * The field is typed by hand, so what arrives is whatever was typed. A
	 * length that cannot be read is left unknown rather than guessed at: a
	 * wrong number would quietly skew every total it is added into.
	 */
	it('leaves an unreadable length unknown', () => {
		expect(toDurationSec('four minutes')).toBeNull();
		expect(toDurationSec('244')).toBeNull();
		expect(toDurationSec('4:0:4:1')).toBeNull();
		expect(toDurationSec('4:-4')).toBeNull();
		expect(toDurationSec('4:4.5')).toBeNull();
	});
});
