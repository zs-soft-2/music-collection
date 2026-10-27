import {
	discogsCatno,
	discogsFormatDescriptions,
	discogsMedia,
	discogsReleaseDate,
	toCatalogRelease,
} from './discogs-release';

const RELEASE = {
	id: 3121170,
	country: 'Europe',
	released: '2011-09-13',
	labels: [{ name: 'Nuclear Blast', catno: 'NB 2166-1' }],
	formats: [
		{
			name: 'Vinyl',
			descriptions: ['LP', 'Album', 'Limited Edition'],
			text: '180 Gram, Red',
		},
	],
};

describe('discogsMedia', () => {
	it('az első ismert hordozót adja', () => {
		expect(discogsMedia(RELEASE)).toBe('vinyl');
		expect(
			discogsMedia({
				id: 1,
				formats: [{ name: 'Box Set' }, { name: 'CD' }],
			})
		).toBe('cd');
	});

	it('a box setet csak akkor adja, ha nincs konkrétabb hordozó', () => {
		expect(discogsMedia({ id: 1, formats: [{ name: 'Box Set' }] })).toBe(
			'boxset'
		);
	});
});

describe('discogsFormatDescriptions', () => {
	it('csak az app ismert leírásait tartja meg', () => {
		expect(discogsFormatDescriptions(RELEASE)).toEqual([
			'limited edition',
			'180g',
		]);
	});
});

describe('discogsCatno', () => {
	it('az első címke katalógusszámát adja', () => {
		expect(discogsCatno(RELEASE)).toBe('NB 2166-1');
	});

	it('nullát ad, ha a Discogs nem ismeri', () => {
		expect(discogsCatno({ id: 1 })).toBeNull();
		expect(
			discogsCatno({ id: 1, labels: [{ name: 'Vertigo' }] })
		).toBeNull();
	});

	it('a hiányt kiíró jelöléseket eldobja', () => {
		const withCatno = (catno: string) =>
			discogsCatno({ id: 1, labels: [{ name: 'Vertigo', catno }] });

		expect(withCatno('none')).toBeNull();
		expect(withCatno('None')).toBeNull();
		expect(withCatno('not on label')).toBeNull();
		expect(withCatno('-')).toBeNull();
		// A "NONESUCH" nem hiány-jelölés, csak úgy kezdődik.
		expect(withCatno('NONESUCH 79173')).toBe('NONESUCH 79173');
	});
});

describe('discogsReleaseDate', () => {
	it('pontos dátumnál azt, csak évnél január 1-jét adja', () => {
		expect(discogsReleaseDate(RELEASE)).toBe(Date.UTC(2011, 8, 13));
		expect(discogsReleaseDate({ id: 1, released: '1987-00-00' })).toBe(
			Date.UTC(1987, 0, 1)
		);
		expect(discogsReleaseDate({ id: 1 })).toBeNull();
	});
});

describe('toCatalogRelease', () => {
	it('az app release-dokumentumát építi', () => {
		const album = {
			uid: 'album-1',
			name: 'Worship Music',
			artist: { uid: 'artist-1', name: 'Anthrax' },
		};

		expect(
			toCatalogRelease(RELEASE, {
				uid: 'release-1',
				album,
				label: { uid: 'label-1', name: 'Nuclear Blast' },
			})
		).toEqual(
			expect.objectContaining({
				uid: 'release-1',
				entityType: 'Release',
				name: 'Worship Music',
				album,
				artist: {
					uid: 'artist-1',
					entityType: 'Artist',
					name: 'Anthrax',
				},
				catno: 'NB 2166-1',
				country: 'Europe',
				formatDescription: ['limited edition', '180g'],
				label: {
					uid: 'label-1',
					entityType: 'Label',
					name: 'Nuclear Blast',
				},
				media: 'vinyl',
				discogsReleaseId: 3121170,
			})
		);
	});
});
