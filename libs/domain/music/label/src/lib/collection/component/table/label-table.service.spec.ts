import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LabelStateService, LabelUtilService } from '@music-collection/api';

import { LabelTableService } from './label-table.service';

describe('LabelTableService', () => {
	let service: LabelTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				LabelTableService,
				provideRouter([]),
				{ provide: LabelStateService, useValue: {} },
				{ provide: LabelUtilService, useValue: {} },
			],
		});

		service = TestBed.inject(LabelTableService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
