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
