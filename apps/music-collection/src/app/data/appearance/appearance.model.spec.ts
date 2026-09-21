import { APPEARANCE_SETTING } from './appearance.model';

describe('APPEARANCE_SETTING', () => {
	it('reads nothing out of a missing document', () => {
		expect(APPEARANCE_SETTING.toValue({})).toEqual({
			theme: null,
			wide: null,
		});
	});

	it('keeps a stored appearance', () => {
		expect(
			APPEARANCE_SETTING.toValue({ theme: 'light', wide: true })
		).toEqual({ theme: 'light', wide: true });
	});

	it('ignores values it does not know', () => {
		expect(
			APPEARANCE_SETTING.toValue({ theme: 'sepia', wide: 'yes' })
		).toEqual({ theme: null, wide: null });
	});
});
