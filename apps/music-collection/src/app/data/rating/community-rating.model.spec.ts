import {
	AlbumRatingSummary,
	COMMUNITY_RATING_MIN_COUNT,
	communityVoice,
} from './community-rating.model';

const summary = (count: number, average: number): AlbumRatingSummary => ({
	albumId: 'a',
	count,
	average,
	histogram: [0, 0, 0, 0, count],
	updatedAt: 1000,
});

describe('communityVoice', () => {
	it('speaks once enough collectors have', () => {
		const voice = communityVoice(
			summary(COMMUNITY_RATING_MIN_COUNT, 3.7),
			null
		);

		expect(voice).toEqual({
			average: 3.7,
			count: COMMUNITY_RATING_MIN_COUNT,
			differsBy: null,
		});
	});

	it('stays quiet while the average is one person wearing a crowd', () => {
		expect(
			communityVoice(summary(COMMUNITY_RATING_MIN_COUNT - 1, 5), 5)
		).toBeNull();
		expect(communityVoice(null, 5)).toBeNull();
	});

	it('says how far the collector stands from everybody else', () => {
		expect(communityVoice(summary(10, 2.4), 5)?.differsBy).toBe(2.6);
		expect(communityVoice(summary(10, 4.8), 3)?.differsBy).toBe(-1.8);
	});
});
