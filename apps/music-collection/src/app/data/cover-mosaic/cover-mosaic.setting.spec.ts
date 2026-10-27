import {
	COVER_MOSAIC_SETTING,
	DEFAULT_COVER_TURN,
	NO_COVER_ROTATION,
} from './cover-mosaic.setting';

describe('COVER_MOSAIC_SETTING', () => {
	it('holds the mosaic still while nothing is stored', () => {
		expect(COVER_MOSAIC_SETTING.toValue({})).toEqual({
			rotateSeconds: NO_COVER_ROTATION,
			turn: DEFAULT_COVER_TURN,
		});
	});

	it('keeps a pace and a movement it offers', () => {
		expect(
			COVER_MOSAIC_SETTING.toValue({ rotateSeconds: 5, turn: 'flip' })
		).toEqual({ rotateSeconds: 5, turn: 'flip' });
	});

	/**
	 * A pace out of a hand-edited document — or one an older version offered
	 * and this one does not — leaves the mosaic standing rather than running
	 * at whatever number happens to be in the field. A movement nobody knows
	 * falls back to the quiet one for the same reason.
	 */
	it('refuses a pace or a movement it does not offer', () => {
		expect(COVER_MOSAIC_SETTING.toValue({ rotateSeconds: 1 })).toEqual({
			rotateSeconds: NO_COVER_ROTATION,
			turn: DEFAULT_COVER_TURN,
		});
		expect(COVER_MOSAIC_SETTING.toValue({ rotateSeconds: '5' })).toEqual({
			rotateSeconds: NO_COVER_ROTATION,
			turn: DEFAULT_COVER_TURN,
		});
		expect(
			COVER_MOSAIC_SETTING.toValue({ rotateSeconds: 5, turn: 'explode' })
		).toEqual({ rotateSeconds: 5, turn: DEFAULT_COVER_TURN });
	});

	/** Random is one of the answers, not a typo to be thrown away. */
	it('keeps random, which is an answer about the movements', () => {
		expect(
			COVER_MOSAIC_SETTING.toValue({ rotateSeconds: 5, turn: 'random' })
		).toEqual({ rotateSeconds: 5, turn: 'random' });
	});

	it('writes both answers back as they stand', () => {
		expect(
			COVER_MOSAIC_SETTING.toDocument({
				rotateSeconds: 10,
				turn: 'zoom',
			})
		).toEqual({ rotateSeconds: 10, turn: 'zoom' });
	});
});
