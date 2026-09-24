import { AlbumView, ArtistView, ReleaseView } from '../../shared/music-ui';
import {
	albumCountsByArtist,
	albumsByDecade,
	albumsByStyle,
	artistsByType,
	decadeCoverage,
	mostCatalogedArtists,
	newInCatalog,
} from './home.mapper';

const album = (id: string, year: number | null) => ({ id, year }) as AlbumView;

const catalogAlbum = (id: string, artistId: string) =>
	({ id, artistId }) as AlbumView;

const artist = (id: string, name: string, imageUrl: string | null = 'photo') =>
	({ id, name, imageUrl }) as ArtistView;

const groupAlbum = (
	id: string,
	styles: string[],
	year: number | null = 1985,
	coverUrl: string | null = 'cover'
) => ({ id, styles, year, coverUrl }) as AlbumView;

describe('decadeCoverage', () => {
	it('counts catalog albums per decade and the collected ones among them', () => {
		const albums = [
			album('a', 1975),
			album('b', 1979),
			album('c', 1984),
			album('d', null),
		];
		const releases = [
			{ albumId: 'a' },
			{ albumId: 'a' },
			{ albumId: 'c' },
		] as ReleaseView[];

		expect(decadeCoverage(albums, releases)).toEqual([
			{ label: '1970s', catalog: 2, collected: 1 },
			{ label: '1980s', catalog: 1, collected: 1 },
		]);
	});
});

describe('albumCountsByArtist', () => {
	it('counts the catalog albums of each artist', () => {
		const counts = albumCountsByArtist([
			catalogAlbum('a', 'maiden'),
			catalogAlbum('b', 'maiden'),
			catalogAlbum('c', 'samson'),
			catalogAlbum('d', ''),
		]);

		expect(counts.get('maiden')).toBe(2);
		expect(counts.get('samson')).toBe(1);
		expect(counts.has('')).toBe(false);
	});
});

describe('mostCatalogedArtists', () => {
	const artists = [
		artist('samson', 'Samson'),
		artist('maiden', 'Iron Maiden'),
		artist('sabbath', 'Black Sabbath'),
		artist('ayreon', 'Ayreon', null),
	];
	const counts = new Map([
		['samson', 1],
		['maiden', 3],
		['ayreon', 5],
	]);

	it('ranks the artists by the albums the catalog holds of them', () => {
		expect(
			mostCatalogedArtists(artists, counts, 10).map(({ id }) => id)
		).toEqual(['maiden', 'samson']);
	});

	it('leaves the release count at zero: it stands for the collection', () => {
		expect(
			mostCatalogedArtists(artists, counts, 10).map(
				({ releaseCount }) => releaseCount
			)
		).toEqual([0, 0]);
	});

	it('keeps at most the limit', () => {
		expect(mostCatalogedArtists(artists, counts, 1)).toHaveLength(1);
	});
});

describe('albumsByStyle', () => {
	const albums = [
		groupAlbum('a', ['Heavy Metal']),
		groupAlbum('b', ['Heavy Metal', 'NWOBHM']),
		groupAlbum('c', ['Heavy Metal', 'NWOBHM']),
		groupAlbum('d', ['Doom Metal']),
	];

	it('puts an album on several styles under each of them', () => {
		const groups = albumsByStyle(albums, 10, 10);

		expect(groups.map((group) => group.label)).toEqual([
			'Heavy Metal',
			'NWOBHM',
		]);
		expect(groups[0].total).toBe(3);
		expect(groups[1].albums.map(({ id }) => id)).toEqual(['b', 'c']);
	});

	it('leaves out a style the catalog holds a single album of', () => {
		expect(
			albumsByStyle(albums, 10, 10).some(
				(group) => group.label === 'Doom Metal'
			)
		).toBe(false);
	});

	it('keeps the fullest groups and cuts each row to the limit', () => {
		const groups = albumsByStyle(albums, 1, 2);

		expect(groups).toHaveLength(1);
		expect(groups[0].label).toBe('Heavy Metal');
		expect(groups[0].albums).toHaveLength(2);
	});

	it('leads a row with the albums that have a cover', () => {
		const groups = albumsByStyle(
			[
				groupAlbum('a', ['Heavy Metal'], 1985, null),
				groupAlbum('b', ['Heavy Metal'], 1980),
			],
			10,
			10
		);

		expect(groups[0].albums.map(({ id }) => id)).toEqual(['b', 'a']);
	});
});

describe('albumsByDecade', () => {
	it('groups the albums by the decade of their release year', () => {
		const groups = albumsByDecade(
			[
				groupAlbum('a', [], 1981),
				groupAlbum('b', [], 1989),
				groupAlbum('c', [], 1975),
				groupAlbum('d', [], 1979),
				groupAlbum('e', [], null),
			],
			10,
			10
		);

		// The decade itself, not the words for it: which of "1980s",
		// "1980-as évek" and "1980er" is shown is the dictionary's business.
		expect(
			groups.map(({ label, labelGroup, total }) => [
				label,
				labelGroup,
				total,
			])
		).toEqual([
			['1980', 'decade', 2],
			['1970', 'decade', 2],
		]);
	});
});

describe('artistsByType', () => {
	it('groups the artists by what kind of act they are, bands first', () => {
		const artists = [
			{ ...artist('ayreon', 'Ayreon'), type: 'project' },
			{ ...artist('maiden', 'Iron Maiden'), type: 'band' },
			{ ...artist('samson', 'Samson'), type: 'band' },
		] as ArtistView[];
		const counts = new Map([
			['maiden', 3],
			['samson', 1],
			['ayreon', 2],
		]);

		const groups = artistsByType(artists, counts, 10);

		expect(
			groups.map(({ label, labelGroup, total }) => [
				label,
				labelGroup,
				total,
			])
		).toEqual([
			['band', 'artistTypePlural', 2],
			['project', 'artistTypePlural', 1],
		]);
		expect(groups[0].artists.map(({ id }) => id)).toEqual([
			'maiden',
			'samson',
		]);
	});
});

describe('newInCatalog', () => {
	it('takes the entries written last, the unstamped ones never', () => {
		const albums = [
			{ ...groupAlbum('a', []), changedAt: 10 },
			{ ...groupAlbum('b', []), changedAt: 30 },
			{ ...groupAlbum('c', []), changedAt: 0 },
			{ ...groupAlbum('d', []), changedAt: 20 },
		] as AlbumView[];

		expect(newInCatalog(albums, 2).map(({ id }) => id)).toEqual(['b', 'd']);
	});
});
