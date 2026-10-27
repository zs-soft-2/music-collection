import { UserLocationSettings, toPublicLocation } from './user-location.model';

const owner = {
	uid: 'u1',
	displayName: 'Zsolt Szabó',
	photoURL: 'https://example.test/z.jpg',
};

const settings = (
	changes: Partial<UserLocationSettings> = {}
): UserLocationSettings => ({
	level: 'profile',
	countryCode: 'HU',
	city: 'Budapest',
	...changes,
});

describe('toPublicLocation', () => {
	it('publishes nothing while the sharing is off', () => {
		expect(toPublicLocation(settings({ level: 'off' }), owner)).toBeNull();
	});

	it('publishes nothing without a country', () => {
		expect(
			toPublicLocation(settings({ countryCode: null }), owner)
		).toBeNull();
	});

	it('leaves the city and the name out of a country-level share', () => {
		expect(toPublicLocation(settings({ level: 'country' }), owner)).toEqual(
			{ uid: 'u1', level: 'country', countryCode: 'HU' }
		);
	});

	it('leaves the name out of a city-level share', () => {
		expect(toPublicLocation(settings({ level: 'city' }), owner)).toEqual({
			uid: 'u1',
			level: 'city',
			countryCode: 'HU',
			city: 'Budapest',
		});
	});

	it('carries the name and the picture at profile level', () => {
		expect(toPublicLocation(settings(), owner)).toEqual({
			uid: 'u1',
			level: 'profile',
			countryCode: 'HU',
			city: 'Budapest',
			displayName: 'Zsolt Szabó',
			photoURL: 'https://example.test/z.jpg',
		});
	});

	it('leaves out a name the user does not have', () => {
		expect(
			toPublicLocation(settings(), { uid: 'u1', displayName: null })
		).toEqual({
			uid: 'u1',
			level: 'profile',
			countryCode: 'HU',
			city: 'Budapest',
		});
	});

	it('keeps a blank city out of the document', () => {
		expect(
			toPublicLocation(settings({ level: 'city', city: '   ' }), owner)
		).toEqual({ uid: 'u1', level: 'city', countryCode: 'HU' });
	});
});
