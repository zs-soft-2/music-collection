import { PublicUserLocation } from '../../data/user-location';

import { toMapCountries } from './map.mapper';

const shared = (
	fields: Partial<PublicUserLocation> & Pick<PublicUserLocation, 'uid'>
): PublicUserLocation => ({
	level: 'country',
	countryCode: 'HU',
	...fields,
});

describe('toMapCountries', () => {
	it('gathers the collectors of a country behind one pin', () => {
		const countries = toMapCountries([
			shared({ uid: 'a' }),
			shared({ uid: 'b' }),
			shared({ uid: 'c', countryCode: 'SE' }),
		]);

		expect(countries.map(({ code, count }) => [code, count])).toEqual([
			['HU', 2],
			['SE', 1],
		]);
	});

	it('puts the crowded countries first', () => {
		const countries = toMapCountries([
			shared({ uid: 'a', countryCode: 'SE' }),
			shared({ uid: 'b' }),
			shared({ uid: 'c' }),
			shared({ uid: 'd', countryCode: 'DE' }),
			shared({ uid: 'e', countryCode: 'DE' }),
			shared({ uid: 'f', countryCode: 'DE' }),
		]);

		expect(countries.map((country) => country.code)).toEqual([
			'DE',
			'HU',
			'SE',
		]);
	});

	it('lists who is named before who is not', () => {
		const [country] = toMapCountries([
			shared({ uid: 'a' }),
			shared({ uid: 'b', level: 'city', city: 'Szeged' }),
			shared({ uid: 'c', level: 'profile', displayName: 'Zsolt' }),
		]);

		expect(country.collectors.map((collector) => collector.uid)).toEqual([
			'c',
			'b',
			'a',
		]);
	});

	it('carries only what each collector shared', () => {
		const [country] = toMapCountries([
			shared({ uid: 'a', level: 'country' }),
		]);

		expect(country.collectors[0]).toEqual({
			uid: 'a',
			city: null,
			displayName: null,
			photoURL: null,
		});
	});

	it('leaves out a country the atlas does not know', () => {
		expect(
			toMapCountries([shared({ uid: 'a', countryCode: 'ZZ' })])
		).toEqual([]);
	});

	it('gives every country a point to sit on', () => {
		const [country] = toMapCountries([shared({ uid: 'a' })]);

		expect(country.position).toHaveLength(2);
		expect(country.name).toBe('Hungary');
	});
});
