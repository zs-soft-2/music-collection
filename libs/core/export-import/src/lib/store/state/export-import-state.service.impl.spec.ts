import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { ExportImportStateServiceImpl } from './export-import-state.service.impl';

describe('ExportImportStateServiceImpl', () => {
	beforeEach(() =>
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				provideMockStore(),
				ExportImportStateServiceImpl,
			],
		})
	);

	it('should be created', () => {
		const service: ExportImportStateServiceImpl = TestBed.inject(
			ExportImportStateServiceImpl
		);

		expect(service).toBeTruthy();
	});
});
