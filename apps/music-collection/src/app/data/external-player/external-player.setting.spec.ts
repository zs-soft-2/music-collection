import { EXTERNAL_PLAYER_SETTING } from './external-player.setting';

describe('EXTERNAL_PLAYER_SETTING', () => {
	it('has no answer out of a missing document', () => {
		expect(EXTERNAL_PLAYER_SETTING.toValue({})).toEqual({
			consented: null,
		});
	});

	it('keeps both answers', () => {
		expect(EXTERNAL_PLAYER_SETTING.toValue({ consented: true })).toEqual({
			consented: true,
		});
		expect(EXTERNAL_PLAYER_SETTING.toValue({ consented: false })).toEqual({
			consented: false,
		});
	});

	/**
	 * Anything that is not a yes or a no leaves the players off: embedding one
	 * on the strength of a truthy string would be embedding it unasked.
	 */
	it('treats anything else as unanswered', () => {
		expect(EXTERNAL_PLAYER_SETTING.toValue({ consented: 'yes' })).toEqual({
			consented: null,
		});
		expect(EXTERNAL_PLAYER_SETTING.toValue({ consented: 1 })).toEqual({
			consented: null,
		});
	});
});
