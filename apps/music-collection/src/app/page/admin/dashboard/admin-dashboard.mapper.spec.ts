import { ReleaseView } from '../../../shared/music-ui';
import { collectionGrowth } from './admin-dashboard.mapper';

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
