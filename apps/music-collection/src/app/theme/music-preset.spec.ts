import { MusicPreset } from './music-preset';

interface ResolvedPreset {
	semantic: {
		focusRing: { color: string };
		formField: { focusBorderColor: string; paddingX: string };
		primary: { color: string };
	};
}

const { semantic } = MusicPreset as unknown as ResolvedPreset;

/**
 * #80: red is the primary colour, and Aura outlines a focused form field in the
 * primary colour, so an ordinary focus read as a validation error.
 */
describe('MusicPreset', () => {
	it('outlines a focused form field in the focus ring colour', () => {
		expect(semantic.formField.focusBorderColor).toBe('{focus.ring.color}');
		expect(semantic.focusRing.color).toBe('light-dark(#0091b3, #00d4ff)');
	});

	it('leaves the primary colour red', () => {
		expect(semantic.primary.color).toBe('light-dark(#e02d2d, #ff4444)');
	});

	it('keeps the form field values it does not override', () => {
		expect(semantic.formField.paddingX).toBeTruthy();
	});
});
