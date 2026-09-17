import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { ExportImportStateServiceImpl } from './export-import-state.service.impl';

describe('ExportImportStateServiceImpl', () => {
	beforeEach(() =>
		TestBed.configureTestingModule({
			providers: [provideMockStore(), ExportImportStateServiceImpl],
		})
	);

	it('should be created', () => {
		const service: ExportImportStateServiceImpl = TestBed.inject(
			ExportImportStateServiceImpl
		);

		expect(service).toBeTruthy();
	});
});
