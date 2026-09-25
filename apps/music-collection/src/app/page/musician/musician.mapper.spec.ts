import { ContributionEntity, MembershipEntity } from '@music-collection/api';

import { AlbumView } from '@music-collection/ui/music-view';
import {
	toBandmates,
	toMusicianAlbums,
	toMusicianBands,
	toMusicianHeader,
	toMusicianSummary,
} from './musician.mapper';

// The API barrel pulls in Firebase, which does not load under Jest.
jest.mock('@music-collection/api', () => ({ DEFAULT_ARTIST_TYPE: 'band' }));

const YEAR = 2026;

function membership(
	musicianUid: string,
	artistUid: string,
	from: number | null,
	to: number | null,
	active: boolean | null,
	kind: 'member' | 'guest' = 'member',
	instruments = ['Vocals']
): MembershipEntity {
	return {
		uid: `${artistUid}_${musicianUid}`,
		musicianUid,
		musicianName: musicianUid.toUpperCase(),
		artistUid,
		artistName: artistUid.toUpperCase(),
		kind,
		instruments,
		from,
		to,
		active,
		albumCount: 2,
		albumUids: [],
	} as MembershipEntity;
}

function contribution(albumUid: string, role: string): ContributionEntity {
	return {
		uid: `${albumUid}-${role}`,
		albumUid,
		musicianUid: 'bruce',
		name: 'Bruce',
		creditedAs: null,
		role,
		roleDetail: null,
		tracks: null,
	} as ContributionEntity;
}

const album = (id: string, year: number): AlbumView => ({
	id,
	title: id,
	artistId: 'maiden',
	artistName: 'Iron Maiden',
	coverUrl: null,
	year,
	albumType: 'LP',
	styles: [],
});

describe('musician mapper', () => {
	const own = [
		membership('bruce', 'samson', 1979, 1981, false),
		membership('bruce', 'maiden', 1981, null, true),
		membership('bruce', 'ayreon', 2000, 2000, false, 'guest'),
	];

	it('falls back to the membership name and the Discogs id in the uid', () => {
		expect(toMusicianHeader('discogs-42', null, own, [])).toEqual({
			uid: 'discogs-42',
			name: 'BRUCE',
			realName: null,
			imageUrl: null,
			paragraphs: [],
			aliases: [],
			sites: [],
			discogsUrl: 'https://www.discogs.com/artist/42',
		});
		expect(toMusicianHeader('x', null, [], [])).toBeNull();
	});

	it('adds the imported profile, without markup and duplicate links', () => {
		const header = toMusicianHeader(
			'discogs-42',
			{
				uid: 'discogs-42',
				name: 'Bruce Dickinson',
				discogsId: 42,
				realName: 'Paul Bruce Dickinson',
				description: 'Singer of [a=Iron Maiden].',
				sites: [
					'https://www.discogs.com/artist/42',
					'https://en.wikipedia.org/wiki/Bruce_Dickinson',
				],
				aliases: ['Bruce Bruce'],
				imageUrl: 'https://i.discogs.com/bruce.jpg',
			},
			[],
			[]
		);

		expect(header).toMatchObject({
			realName: 'Paul Bruce Dickinson',
			paragraphs: ['Singer of Iron Maiden.'],
			aliases: ['Bruce Bruce'],
			sites: [
				{
					url: 'https://en.wikipedia.org/wiki/Bruce_Dickinson',
					label: 'en.wikipedia.org',
				},
			],
		});
	});

	it('orders bands: members first, current before former', () => {
		const bands = toMusicianBands(own, [], [], YEAR);

		expect(bands.map((band) => band.artistUid)).toEqual([
			'maiden',
			'samson',
			'ayreon',
		]);
		expect(bands[0].years).toBe('1981–present');
		expect(bands[0].span).toEqual({ from: 1981, to: YEAR, active: true });
		expect(bands[0].artist).toBeNull();
	});

	it('keeps a member with a start and no end year in the band', () => {
		// What the line-up editor leaves behind: no end year, flag off.
		const bands = toMusicianBands(
			[membership('thanos', 'chronosphere', 2012, null, false)],
			[],
			[],
			YEAR
		);

		expect(bands[0].active).toBe(true);
		expect(bands[0].years).toBe('2012–present');
		expect(bands[0].span).toEqual({ from: 2012, to: YEAR, active: true });
	});

	it('merges the credits of an album and skips albums not in the catalog', () => {
		const albums = toMusicianAlbums(
			[
				contribution('powerslave', 'Written-By'),
				contribution('powerslave', 'Vocals'),
				contribution('unknown', 'Vocals'),
			],
			[album('powerslave', 1984)],
			[]
		);

		expect(albums).toHaveLength(1);
		expect(albums[0].roles).toEqual(['Vocals', 'Written-By']);
		expect(albums[0].categories).toEqual(['songwriting', 'performers']);
	});

	it('finds bandmates with overlapping years only', () => {
		const lineups = [
			[
				own[1],
				membership('steve', 'maiden', 1975, null, true, 'member', [
					'Bass',
				]),
				membership('paul', 'maiden', 1978, 1981, false),
			],
		];

		const bandmates = toBandmates('bruce', own, lineups, YEAR);

		expect(bandmates.map((mate) => mate.musicianUid)).toEqual([
			'steve',
			'paul',
		]);
		expect(bandmates[0].together).toEqual([
			{ band: 'MAIDEN', years: '1981–present', active: true },
		]);
	});

	it('summarises instruments, years and band counts', () => {
		const summary = toMusicianSummary(
			own,
			[contribution('powerslave', 'Backing Vocals')],
			YEAR
		);

		expect(summary).toEqual({
			instruments: ['Vocals'],
			span: '1979–present',
			bands: 2,
			guestAppearances: 1,
		});
	});
});
