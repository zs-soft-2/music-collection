import { CountryEnum, StyleEnum } from '@music-collection/api';

import {
	MusicBrainzArtist,
	pickArtist,
	rankArtists,
	toExternalCandidate,
} from './artist-external.mapper';

const hit = (
	id: string,
	partial: Partial<MusicBrainzArtist> = {}
): MusicBrainzArtist => ({ id, name: 'Nightfall', ...partial });

describe('pickArtist', () => {
	it('takes the hit of the wanted country', () => {
		const greek = hit('gr', { country: 'GR', type: 'Group' });
		const artists = [hit('us', { country: 'US', type: 'Group' }), greek];

		expect(
			pickArtist(
				{ country: CountryEnum.Greece, name: 'Nightfall' },
				artists
			)
		).toBe(greek);
	});

	it('takes the hit sharing the most styles', () => {
		const doom = hit('doom', {
			tags: [
				{ name: 'gothic metal', count: 3 },
				{ name: 'doom metal', count: 2 },
			],
		});
		const artists = [
			hit('punk', { tags: [{ name: 'punk', count: 9 }] }),
			doom,
		];

		expect(
			pickArtist(
				{
					name: 'Nightfall',
					styles: [StyleEnum.Gothic, StyleEnum.Doom],
				},
				artists
			)
		).toBe(doom);
	});

	it('lets the country outweigh a single matching style', () => {
		const greek = hit('gr', { country: 'GR' });
		const artists = [
			hit('se', {
				country: 'SE',
				tags: [{ name: 'doom metal', count: 1 }],
			}),
			greek,
		];

		expect(
			pickArtist(
				{
					country: CountryEnum.Greece,
					name: 'Nightfall',
					styles: [StyleEnum.Doom],
				},
				artists
			)
		).toBe(greek);
	});

	it('keeps MusicBrainz order when the hints say nothing', () => {
		const first = hit('first');

		expect(pickArtist({ name: 'Nightfall' }, [first, hit('second')])).toBe(
			first
		);
	});

	it('prefers a group over a person on a tie, as before', () => {
		const group = hit('group', { type: 'Group' });

		expect(
			pickArtist({ name: 'Nightfall' }, [
				hit('person', { type: 'Person' }),
				group,
			])
		).toBe(group);
	});

	it('ignores the hints of a country the source does not know', () => {
		const unknown = hit('unknown', { type: 'Group' });

		expect(
			pickArtist({ country: CountryEnum.Greece, name: 'Nightfall' }, [
				unknown,
				hit('us', { country: 'US', type: 'Group' }),
			])
		).toBe(unknown);
	});

	it('falls back to the best scored hit when no name matches', () => {
		const best = hit('best', { name: 'Nightfall Overture' });

		expect(
			pickArtist({ country: CountryEnum.Greece, name: 'Nightfall' }, [
				best,
				hit('other', { name: 'Nightfalls', country: 'GR' }),
			])
		).toBe(best);
	});

	it('finds nothing in an empty result', () => {
		expect(pickArtist({ name: 'Nightfall' }, [])).toBeNull();
	});
});

describe('rankArtists', () => {
	it('offers every artist of the name, the best fitting one first', () => {
		const greek = hit('gr', { country: 'GR' });
		const artists = [hit('us', { country: 'US' }), greek];

		expect(
			rankArtists(
				{ country: CountryEnum.Greece, name: 'Nightfall' },
				artists
			)
		).toEqual([greek, artists[0]]);
	});

	it('offers only the best hit when none carries the name', () => {
		const best = hit('best', { name: 'Nightfall Overture' });

		// The others are different artists, not namesakes to choose between.
		expect(
			rankArtists({ name: 'Nightfall' }, [
				best,
				hit('other', { name: 'Nightfalls' }),
			])
		).toEqual([best]);
	});
});

describe('toExternalCandidate', () => {
	it('says what tells the artist from its namesakes', () => {
		expect(
			toExternalCandidate(
				hit('gr', {
					country: 'GR',
					disambiguation: 'Greek gothic metal band',
					'life-span': { begin: '1991-05' },
					tags: [{ name: 'gothic metal', count: 3 }],
					type: 'Group',
				})
			)
		).toEqual({
			country: CountryEnum.Greece,
			formedIn: new Date(1991, 4, 1),
			musicBrainzId: 'gr',
			name: 'Nightfall',
			note: 'Greek gothic metal band',
			sourceUrl: 'https://musicbrainz.org/artist/gr',
			styles: [StyleEnum.Gothic],
			type: 'Group',
		});
	});

	it('keeps the source code of a country the catalog has none for', () => {
		expect(toExternalCandidate(hit('no', { country: 'NO' })).country).toBe(
			'NO'
		);
	});
});
