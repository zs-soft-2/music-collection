import { MEASUREMENT_SETTING } from './measurement.setting';

describe('MEASUREMENT_SETTING', () => {
	it('has no answer out of a missing document', () => {
		expect(MEASUREMENT_SETTING.toValue({})).toEqual({ consented: null });
	});

	it('keeps both answers', () => {
		expect(MEASUREMENT_SETTING.toValue({ consented: true })).toEqual({
			consented: true,
		});
		expect(MEASUREMENT_SETTING.toValue({ consented: false })).toEqual({
			consented: false,
		});
	});

	/**
	 * A stored value that is not a yes or a no is not an answer: measuring on
	 * the strength of a truthy string would be measuring without consent.
	 */
	it('treats anything else as unanswered', () => {
		expect(MEASUREMENT_SETTING.toValue({ consented: 'yes' })).toEqual({
			consented: null,
		});
		expect(MEASUREMENT_SETTING.toValue({ consented: 1 })).toEqual({
			consented: null,
		});
	});
});
