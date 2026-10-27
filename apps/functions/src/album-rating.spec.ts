import { summariseAlbumRating } from './album-rating';

describe('summariseAlbumRating', () => {
	it('adds up what the collectors gave', () => {
		const summary = summariseAlbumRating('album-1', [5, 4, 4, 3], 1000);

		expect(summary).toEqual({
			albumId: 'album-1',
			count: 4,
			average: 4,
			histogram: [0, 0, 1, 2, 1],
			updatedAt: 1000,
		});
	});

	it('rounds the average to one decimal', () => {
		expect(summariseAlbumRating('album-1', [5, 4, 4]).average).toBe(4.3);
		expect(summariseAlbumRating('album-1', [1, 2]).average).toBe(1.5);
	});

	it('leaves a record nobody judged at nothing', () => {
		const summary = summariseAlbumRating('album-1', [], 1000);

		expect(summary.count).toBe(0);
		expect(summary.average).toBe(0);
		expect(summary.histogram).toEqual([0, 0, 0, 0, 0]);
	});

	it('passes over a star no collector could have given', () => {
		const summary = summariseAlbumRating(
			'album-1',
			[5, 0, 6, 4.5, '5', null, undefined, 4],
			1000
		);

		expect(summary.count).toBe(2);
		expect(summary.average).toBe(4.5);
		expect(summary.histogram).toEqual([0, 0, 0, 1, 1]);
	});
});
