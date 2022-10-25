import { TestBed } from '@angular/core/testing';

import { UserDataServiceImpl } from './user-data.service.impl';

describe('UserDataServiceImpl', () => {
	beforeEach(() => TestBed.configureTestingModule({}));

	it('should be created', () => {
		const service: UserDataServiceImpl =
			TestBed.inject(UserDataServiceImpl);

		expect(service).toBeTruthy();
	});
});
