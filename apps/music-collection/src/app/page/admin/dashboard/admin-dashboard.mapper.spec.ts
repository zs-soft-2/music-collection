import { AlbumEntity, ArtistEntity } from '@music-collection/api';

import { TrackStats } from '../../../data/track-stats';
import { ReleaseView } from '../../../shared/music-ui';
import {
	catalogCompleteness,
	collectionGrowth,
	trackCompleteness,
} from './admin-dashboard.mapper';

const added = (iso: string) =>
	({ addedAt: new Date(iso).getTime() }) as ReleaseView;

describe('collectionGrowth', () => {
	it('returns no points without dated releases', () => {
		expect(collectionGrowth([{ addedAt: 0 } as ReleaseView])).toEqual([]);
	});

	it('buckets short histories per month, keeping empty months', () => {
		const points = collectionGrowth([
			added('2025-01-10'),
			added('2025-01-20'),
			added('2025-03-05'),
		]);

		expect(points.map(({ added, total }) => [added, total])).toEqual([
			[2, 2],
			[0, 2],
			[1, 3],
		]);
	});

	it('buckets long histories per year', () => {
		const points = collectionGrowth([
			added('2018-06-01'),
			added('2021-02-01'),
			added('2021-09-01'),
		]);

		expect(points.map((point) => point.label)).toEqual([
			'2018',
			'2019',
			'2020',
			'2021',
		]);
		expect(points[points.length - 1]).toEqual({
			label: '2021',
			added: 2,
			total: 3,
		});
	});
});

const stats = (overrides: Partial<TrackStats> = {}): TrackStats => ({
	total: 100,
	albumUids: new Set<string>(),
	withLyrics: 40,
	withSpotify: 100,
	withYoutube: 0,
	...overrides,
});

describe('trackCompleteness', () => {
	it('counts what is missing from the tracks', () => {
		const group = trackCompleteness(stats());

		expect(group.total).toBe(100);
		expect(group.checks).toEqual([
			{ labelKey: 'admin.field.lyrics', missing: 60 },
			{ labelKey: 'admin.field.spotifyLink', missing: 0 },
			{ labelKey: 'admin.field.youtubeVideo', missing: 100 },
		]);
	});

	it('keeps rows at zero when lyrics outnumber the tracks', () => {
		const group = trackCompleteness(stats({ total: 2, withLyrics: 3 }));

		expect(group.checks[0].missing).toBe(0);
	});

	it('leaves the lyrics row out when they could not be counted', () => {
		const group = trackCompleteness(stats({ withLyrics: null }));

		expect(group.checks.map((check) => check.labelKey)).toEqual([
			'admin.field.spotifyLink',
			'admin.field.youtubeVideo',
		]);
	});
});

const album = (uid: string) => ({ uid }) as AlbumEntity;
const artist = (uid: string) => ({ uid }) as ArtistEntity;

describe('catalogCompleteness', () => {
	const albums = [album('a'), album('b'), album('c')];
	const artists = [artist('x'), artist('y')];

	it('counts the albums without a tracklist', () => {
		const [group] = catalogCompleteness(albums, [], new Set(['a']));

		expect(group.checks).toContainEqual({
			labelKey: 'admin.field.tracklist',
			missing: 2,
		});
	});

	it('leaves the tracklist row out until the tracks are known', () => {
		const [group] = catalogCompleteness(albums, [], null);

		expect(group.checks.map((check) => check.labelKey)).not.toContain(
			'admin.field.tracklist'
		);
	});

	it('counts the bands without a line-up', () => {
		const [, group] = catalogCompleteness(
			[],
			artists,
			null,
			new Set(['x'])
		);

		expect(group.checks).toContainEqual({
			labelKey: 'admin.field.lineUp',
			missing: 1,
		});
	});

	it('leaves the line-up row out until the memberships are known', () => {
		const [, group] = catalogCompleteness([], artists, null);

		expect(group.checks.map((check) => check.labelKey)).not.toContain(
			'admin.field.lineUp'
		);
	});
});
