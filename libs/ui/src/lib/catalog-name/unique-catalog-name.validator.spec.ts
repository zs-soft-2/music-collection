import { FormControl } from '@angular/forms';

import {
	DUPLICATE_CATALOG_NAME,
	uniqueCatalogName,
} from './unique-catalog-name.validator';

const control = (value: string, taken: string[]) =>
	new FormControl(
		value,
		uniqueCatalogName(() => taken)
	);

describe('uniqueCatalogName', () => {
	it('accepts a name the catalog does not hold', () => {
		expect(control('Forbidden', ['Testament']).errors).toBeNull();
	});

	it('refuses a name the catalog holds in another spelling', () => {
		expect(control('The Testament', ['Testament (2)']).errors).toEqual({
			[DUPLICATE_CATALOG_NAME]: { match: 'Testament (2)' },
		});
	});

	it('leaves an empty field to `required`', () => {
		expect(control('', ['Testament']).errors).toBeNull();
	});

	it('lets through the clash the record arrived in', () => {
		const name = new FormControl(
			'Burning Bridges',
			uniqueCatalogName(
				() => ['Burning Bridges'],
				() => 'Burning Bridges'
			)
		);

		// The twin is the catalog's to merge away; refusing the name here
		// would lock the record out of every other edit.
		expect(name.errors).toBeNull();
	});

	it('still refuses a name typed into a clash', () => {
		const name = new FormControl(
			'Wages Of Sin',
			uniqueCatalogName(
				() => ['Wages of Sin'],
				() => 'Burning Bridges'
			)
		);

		expect(name.errors).toEqual({
			[DUPLICATE_CATALOG_NAME]: { match: 'Wages of Sin' },
		});
	});

	it('reads the rivals again on every check', () => {
		const taken: string[] = [];
		const name = new FormControl(
			'Testament',
			uniqueCatalogName(() => taken)
		);

		expect(name.errors).toBeNull();

		// The artist the album belongs to changed, and with it its albums.
		taken.push('Testament');
		name.updateValueAndValidity();

		expect(name.errors).not.toBeNull();
	});
});
