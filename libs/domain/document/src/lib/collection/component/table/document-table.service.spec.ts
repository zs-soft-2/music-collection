import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	DocumentStateService,
	DocumentUtilService,
} from '@music-collection/api';

import { DocumentTableService } from './document-table.service';

describe('DocumentTableService', () => {
	let service: DocumentTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				DocumentTableService,
				provideRouter([]),
				{ provide: DocumentStateService, useValue: {} },
				{ provide: DocumentUtilService, useValue: {} },
			],
		});

		service = TestBed.inject(DocumentTableService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});
