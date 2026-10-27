import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LabelStateService, LabelUtilService } from '@music-collection/api';

import { LabelFormService } from './label-form.service';

describe('LabelFormService', () => {
	let service: LabelFormService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				LabelFormService,
				provideRouter([]),
				{
					provide: LabelStateService,
					useValue: {
						selectEntityById$: jest.fn(() => of(undefined)),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{ provide: LabelUtilService, useValue: {} },
			],
		});

		service = TestBed.inject(LabelFormService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
