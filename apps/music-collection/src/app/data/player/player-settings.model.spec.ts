import { PLAYER_SETTING } from './player-settings.model';

describe('PLAYER_SETTING', () => {
	it('reads nothing out of a missing document', () => {
		expect(PLAYER_SETTING.toValue({})).toEqual({});
	});

	it('reads the overrides of the account document', () => {
		expect(
			PLAYER_SETTING.toValue({
				overrides: { track: { effects: 'full' } },
				updatedAt: 1,
			})
		).toEqual({ track: { effects: 'full' } });
	});

	it('still reads what the browser kept without the wrapper', () => {
		expect(PLAYER_SETTING.toValue({ album: { view: 'stage' } })).toEqual({
			album: { view: 'stage' },
		});
	});

	it('leaves everything that is not a kind of page behind', () => {
		expect(PLAYER_SETTING.toValue({ updatedAt: 1, other: {} })).toEqual({});
	});

	it('writes the overrides under their own key', () => {
		expect(
			PLAYER_SETTING.toDocument({ default: { lyrics: false } })
		).toEqual({ overrides: { default: { lyrics: false } } });
	});
});
