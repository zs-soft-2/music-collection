import {
	ArtistExternalProfile,
	CountryEnum,
	DiscogsBandProfile,
	FormatEnum,
} from '@music-collection/api';

import {
	fillArtistGaps,
	hasArtistGaps,
	toDiscogsAlbum,
	toDiscogsCandidate,
	toDiscogsProfile,
} from './artist-discogs.mapper';

const profile = (
	fields: Partial<DiscogsBandProfile> = {}
): DiscogsBandProfile => ({
	discogsId: 152122,
	name: 'Testament',
	description: 'Thrash metal band from Berkeley.',
	sites: ['https://testamentlegions.com'],
	imageUrl: 'https://img/1.jpg',
	styles: [],
	members: [{ discogsId: 1, name: 'Chuck Billy', active: true }],
	...fields,
});

/** The styles the taxonomy holds while these run. */
const KNOWN = ['Thrash', 'Heavy metal'];

describe('toDiscogsCandidate', () => {
	it('carries the Discogs id and leaves what Discogs cannot say empty', () => {
		expect(
			toDiscogsCandidate({
				discogsId: 152122,
				name: 'Testament',
				thumbUrl: 'https://img/t.jpg',
			})
		).toEqual({
			country: null,
			discogsArtistId: 152122,
			formedIn: null,
			musicBrainzId: null,
			name: 'Testament',
			note: null,
			source: 'discogs',
			sourceUrl: 'https://www.discogs.com/artist/152122',
			styles: [],
			thumbUrl: 'https://img/t.jpg',
			type: null,
		});
	});
});

describe('toDiscogsProfile', () => {
	it('fills in what Discogs knows and no more', () => {
		expect(toDiscogsProfile(profile(), KNOWN)).toEqual({
			artistType: 'band',
			country: null,
			description: 'Thrash metal band from Berkeley.',
			discogsArtistId: 152122,
			fillerSourceUrl: null,
			formedIn: null,
			imageUrl: 'https://img/1.jpg',
			musicBrainzId: null,
			name: 'Testament',
			source: 'discogs',
			sourceUrl: 'https://www.discogs.com/artist/152122',
			styles: [],
		});
	});

	it('leaves the type open without a member list', () => {
		expect(
			toDiscogsProfile(profile({ members: [] }), KNOWN).artistType
		).toBeNull();
	});
});

describe('toDiscogsAlbum', () => {
	it('links a master to its master page', () => {
		expect(
			toDiscogsAlbum({
				id: 21929,
				type: 'master',
				name: 'The Legacy',
				year: 1987,
				thumbUrl: null,
				formats: ['LP', 'Album'],
			})
		).toEqual({
			format: FormatEnum.lp,
			name: 'The Legacy',
			source: 'discogs',
			sourceUrl: 'https://www.discogs.com/master/21929',
			year: new Date(1987, 0, 1),
		});
	});

	it('links a master-less pressing to its release page', () => {
		expect(
			toDiscogsAlbum({
				id: 555,
				type: 'release',
				name: 'Demo 1985',
				year: 1985,
				thumbUrl: null,
				formats: [],
			})
		).toEqual({
			format: FormatEnum.lp,
			name: 'Demo 1985',
			source: 'discogs',
			sourceUrl: 'https://www.discogs.com/release/555',
			year: new Date(1985, 0, 1),
		});
	});

	it('drops an album Discogs gives no year for', () => {
		// The catalog's album needs a year; 1970 in place of the real one is
		// worse than an album the admin adds by hand.
		expect(
			toDiscogsAlbum({
				id: 555,
				type: 'master',
				name: 'Untitled',
				year: null,
				thumbUrl: null,
				formats: [],
			})
		).toBeNull();
	});
});

/** A MusicBrainz profile as the artist form gets it. */
const musicBrainz = (
	fields: Partial<ArtistExternalProfile> = {}
): ArtistExternalProfile => ({
	artistType: 'band',
	country: CountryEnum.USA,
	description: 'A thrash metal band.',
	discogsArtistId: null,
	fillerSourceUrl: null,
	formedIn: new Date(1983, 0, 1),
	imageUrl: 'https://commons/photo.jpg',
	musicBrainzId: 'mb-1',
	name: 'Testament',
	source: 'musicbrainz',
	sourceUrl: 'https://musicbrainz.org/artist/mb-1',
	styles: ['Thrash'],
	...fields,
});

describe('hasArtistGaps', () => {
	it('spots the artist with no description or picture', () => {
		expect(hasArtistGaps(musicBrainz({ description: null }))).toBe(true);
		expect(hasArtistGaps(musicBrainz({ imageUrl: null }))).toBe(true);
	});

	it('counts a missing Discogs id as a gap worth one lookup', () => {
		// Carrying the id back is what spares the discography and the line-up
		// a name search next time.
		expect(hasArtistGaps(musicBrainz())).toBe(true);
	});

	it('is false once every field Discogs could fill is filled', () => {
		expect(hasArtistGaps(musicBrainz({ discogsArtistId: 152122 }))).toBe(
			false
		);
	});
});

describe('fillArtistGaps', () => {
	const discogs = toDiscogsProfile(profile(), KNOWN);

	it('fills the empty fields and names the source that filled them', () => {
		const merged = fillArtistGaps(
			musicBrainz({ description: null, imageUrl: null }),
			discogs
		);

		expect(merged.description).toBe('Thrash metal band from Berkeley.');
		expect(merged.imageUrl).toBe('https://img/1.jpg');
		expect(merged.discogsArtistId).toBe(152122);
		expect(merged.fillerSourceUrl).toBe(
			'https://www.discogs.com/artist/152122'
		);
	});

	it('never overwrites what MusicBrainz knew', () => {
		const merged = fillArtistGaps(musicBrainz(), discogs);

		expect(merged.description).toBe('A thrash metal band.');
		expect(merged.imageUrl).toBe('https://commons/photo.jpg');
		expect(merged.country).toBe(CountryEnum.USA);
		expect(merged.formedIn).toEqual(new Date(1983, 0, 1));
		expect(merged.source).toBe('musicbrainz');
	});
});
