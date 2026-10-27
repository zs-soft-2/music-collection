import { DEMO_TOUR_SETTING } from './demo-tour.setting';

describe('DEMO_TOUR_SETTING', () => {
	it('has no choice out of a missing document', () => {
		expect(DEMO_TOUR_SETTING.toValue({})).toEqual({ enabled: null });
	});

	it('keeps both answers', () => {
		expect(DEMO_TOUR_SETTING.toValue({ enabled: true })).toEqual({
			enabled: true,
		});
		expect(DEMO_TOUR_SETTING.toValue({ enabled: false })).toEqual({
			enabled: false,
		});
	});

	/**
	 * Only a stored `false` switches the tour off. Anything else — a document
	 * written by an older version, a hand-edited field — leaves it on, which
	 * is what an account that has never been asked gets.
	 */
	it('treats anything else as undecided', () => {
		expect(DEMO_TOUR_SETTING.toValue({ enabled: 'no' })).toEqual({
			enabled: null,
		});
		expect(DEMO_TOUR_SETTING.toValue({ enabled: 0 })).toEqual({
			enabled: null,
		});
	});

	it('writes the choice back as it stands', () => {
		expect(DEMO_TOUR_SETTING.toDocument({ enabled: false })).toEqual({
			enabled: false,
		});
	});
});
