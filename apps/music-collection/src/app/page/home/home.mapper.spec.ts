import { AlbumView, ReleaseView } from '../../shared/music-ui';
import { decadeCoverage } from './home.mapper';

const album = (id: string, year: number | null) => ({ id, year }) as AlbumView;

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
