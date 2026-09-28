import { DiscogsBandProfile, FormatEnum } from '@music-collection/api';

import {
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
		expect(toDiscogsProfile(profile())).toEqual({
			artistType: 'band',
			country: null,
			description: 'Thrash metal band from Berkeley.',
			discogsArtistId: 152122,
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
			toDiscogsProfile(profile({ members: [] })).artistType
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
