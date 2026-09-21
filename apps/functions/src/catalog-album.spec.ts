import {
	albumCoverUrl,
	albumFormat,
	albumSongs,
	releaseArtist,
	sameAlbumName,
	sameArtistName,
	toCatalogAlbum,
	toCatalogArtist,
} from './catalog-album';
import { DiscogsRelease } from './discogs-release';

const release = (overrides: Partial<DiscogsRelease> = {}): DiscogsRelease => ({
	id: 1234,
	title: 'Melissa',
	country: 'Netherlands',
	released: '1983-10-30',
	master_id: 42,
	artists: [{ id: 7, name: 'Mercyful Fate (2)' }],
	labels: [{ name: 'Roadrunner Records', catno: 'RR 9862' }],
	formats: [{ name: 'Vinyl', descriptions: ['LP', 'Album'] }],
	tracklist: [
		{ type_: 'track', title: 'Evil' },
		{ type_: 'heading', title: 'Side B' },
		{ type_: 'track', title: 'Satan’s Fall' },
	],
	images: [
		{ type: 'secondary', uri: 'https://img/back.jpg' },
		{ type: 'primary', uri: 'https://img/front.jpg' },
	],
	...overrides,
});

describe('albumFormat', () => {
	it('alapesetben nagylemez', () => {
		expect(albumFormat(release())).toBe('lp');
	});

	it('a Discogs leírásából olvassa a típust', () => {
		const formats = (descriptions: string[]) => [
			{ name: 'Vinyl', descriptions },
		];

		expect(albumFormat(release({ formats: formats(['EP']) }))).toBe('ep');
		expect(albumFormat(release({ formats: formats(['Single']) }))).toBe(
			'single'
		);
		expect(
			albumFormat(release({ formats: formats(['Maxi-Single']) }))
		).toBe('maxi');
		expect(
			albumFormat(release({ formats: formats(['LP', 'Compilation']) }))
		).toBe('compilation');
		expect(albumFormat(release({ formats: formats(['LP', 'Live']) }))).toBe(
			'live'
		);
	});
});

describe('albumSongs', () => {
	it('csak a dalokat veszi, a fejléceket nem', () => {
		expect(albumSongs(release())).toEqual(['Evil', 'Satan’s Fall']);
	});
});

describe('albumCoverUrl', () => {
	it('az elsődleges borítót választja', () => {
		expect(albumCoverUrl(release())).toBe('https://img/front.jpg');
	});

	it('kép nélkül null', () => {
		expect(albumCoverUrl(release({ images: [] }))).toBeNull();
	});
});

describe('releaseArtist', () => {
	it('a főelőadót adja, a Discogs utótagja nélkül', () => {
		expect(releaseArtist(release())).toEqual({
			id: 7,
			name: 'Mercyful Fate',
		});
	});

	it('a "Various" ál-előadót átugorja', () => {
		expect(
			releaseArtist(
				release({
					artists: [
						{ id: 194, name: 'Various' },
						{ id: 9, name: 'Metallica' },
					],
				})
			)
		).toEqual({ id: 9, name: 'Metallica' });
	});

	it('előadó nélkül null', () => {
		expect(releaseArtist(release({ artists: [] }))).toBeNull();
	});
});

describe('toCatalogArtist', () => {
	it('vázlatot hoz létre, ország nélkül', () => {
		const artist = toCatalogArtist('a1', { id: 7, name: 'Mercyful Fate' });

		expect(artist).toMatchObject({
			uid: 'a1',
			entityType: 'Artist',
			name: 'Mercyful Fate',
			artistType: 'band',
			genre: 'Rock',
			discogs: { artistId: 7 },
		});
		expect(artist['country']).toBeUndefined();
	});
});

describe('toCatalogAlbum', () => {
	it('a kiadásból katalógus-albumot képez', () => {
		const album = toCatalogAlbum(release(), {
			uid: 'b1',
			artist: { uid: 'a1', name: 'Mercyful Fate' },
		});

		expect(album).toMatchObject({
			uid: 'b1',
			entityType: 'Album',
			name: 'Melissa',
			artist: { uid: 'a1', entityType: 'Artist', name: 'Mercyful Fate' },
			format: 'lp',
			genre: 'Rock',
			songs: ['Evil', 'Satan’s Fall'],
			coverImageUrl: 'https://img/front.jpg',
			discogs: {
				masterId: 42,
				releaseId: 1234,
				released: '1983-10-30',
				country: 'Netherlands',
				labels: [{ name: 'Roadrunner Records', catno: 'RR 9862' }],
				formats: ['Vinyl, LP, Album'],
			},
		});
		expect((album['year'] as Date).getUTCFullYear()).toBe(1983);
		expect(album['searchParameters']).toContain('mel');
	});
});

describe('sameArtistName', () => {
	it('a tagolástól és a névelőtől függetlenül egyeztet', () => {
		expect(sameArtistName('The Beatles', 'Beatles')).toBe(true);
		expect(sameArtistName('Mötley Crüe', 'Motley Crue')).toBe(true);
		expect(sameArtistName('Slayer', 'Slayer (2)')).toBe(true);
		expect(sameArtistName('Anthrax', 'Overkill')).toBe(false);
		expect(sameArtistName('', '')).toBe(false);
	});
});

describe('sameAlbumName', () => {
	it('a tagolástól és a névelőtől függetlenül egyeztet', () => {
		expect(
			sameAlbumName('Indecent & Obscene', 'Indecent And Obscene')
		).toBe(true);
		expect(sameAlbumName('Power & the Glory', 'Power And The Glory')).toBe(
			true
		);
		expect(sameAlbumName('The Antichrist', 'Antichrist')).toBe(true);
		expect(sameAlbumName('Thrash Anthems', 'Thrash Anthems II')).toBe(
			false
		);
		expect(sameAlbumName('', '')).toBe(false);
	});
});
