import {
	DEFAULT_BADGE_SETTINGS,
	sanitizeBadgeSettings,
} from './badge-settings';

describe('sanitizeBadgeSettings', () => {
	it('a hiányzó dokumentumból az alapértelmezés lesz', () => {
		expect(sanitizeBadgeSettings(undefined)).toEqual(
			DEFAULT_BADGE_SETTINGS
		);
	});

	it('a napi számlálót és a gateway előtti mezőket nem engedi át', () => {
		const settings = sanitizeBadgeSettings({
			usageDay: '2026-10-06',
			usageCount: 12,
			model: 'imagen-3.0',
			region: 'europe-west4',
		});

		expect(settings).toEqual(DEFAULT_BADGE_SETTINGS);
	});

	it('az ársávot átveszi, ha a gateway ismeri', () => {
		expect(
			sanitizeBadgeSettings({ qualityProfile: 'premium' }).qualityProfile
		).toBe('premium');
	});

	it('az ismeretlen ársáv az alapértelmezésre esik vissza', () => {
		// Egy elgépelt sáv a gatewaytől hibát kapna, nem képet — itt áll meg.
		expect(
			sanitizeBadgeSettings({ qualityProfile: 'luxury' }).qualityProfile
		).toBe(DEFAULT_BADGE_SETTINGS.qualityProfile);
	});

	it('a jelöltszámot a felső korlátjáig engedi', () => {
		expect(
			sanitizeBadgeSettings({ candidateCount: 99 }).candidateCount
		).toBe(8);
	});
});
