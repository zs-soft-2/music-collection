import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';

import { EntityQuantityUtilServiceImpl } from './entity-quantity-util.service.impl';

describe('EntityQuantityUtilServiceImpl', () => {
	let service: EntityQuantityUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideI18nTesting(), EntityQuantityUtilServiceImpl],
		});
		service = TestBed.inject(EntityQuantityUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
