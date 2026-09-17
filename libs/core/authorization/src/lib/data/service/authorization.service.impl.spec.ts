import { NgxPermissionsModule } from 'ngx-permissions';

import { TestBed } from '@angular/core/testing';

import { AuthorizationServiceImpl } from './authorization.service.impl';

describe('AuthorizationServiceImpl', () => {
	beforeEach(() =>
		TestBed.configureTestingModule({
			imports: [NgxPermissionsModule.forRoot()],
			providers: [AuthorizationServiceImpl],
		})
	);

	it('should be created', () => {
		const service: AuthorizationServiceImpl = TestBed.inject(
			AuthorizationServiceImpl
		);
		expect(service).toBeTruthy();
	});
});
