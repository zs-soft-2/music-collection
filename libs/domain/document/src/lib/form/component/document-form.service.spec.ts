import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { BehaviorSubject, of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	DocumentCategoryEnum,
	DocumentFormParams,
	DocumentStateService,
	DocumentUtilService,
} from '@music-collection/api';

import { DocumentUtilServiceImpl } from '../../util/service/document-util.service.impl';
import { DocumentFormService } from './document-form.service';

describe('DocumentFormService', () => {
	let service: DocumentFormService;
	let filePath$$: BehaviorSubject<string | undefined>;

	beforeEach(() => {
		filePath$$ = new BehaviorSubject<string | undefined>(undefined);

		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				DocumentFormService,
				provideRouter([]),
				{
					provide: DocumentStateService,
					useValue: {
						selectEntityById$: jest.fn(() => of(undefined)),
						selectFilePath$: jest.fn(() => filePath$$),
					},
				},
				{
					provide: DocumentUtilService,
					useClass: DocumentUtilServiceImpl,
				},
			],
		});

		service = TestBed.inject(DocumentFormService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('keeps the category that was picked when the upload lands', () => {
		let params: DocumentFormParams | undefined;

		service.init$().subscribe((emitted) => (params = emitted));
		params?.formGroup.patchValue({
			category: DocumentCategoryEnum.Scene,
		});

		// The form is made anew once the file is in Storage; what the admin
		// picked a moment earlier must not go with the old one.
		filePath$$.next('/document/scene');

		expect(params?.formGroup.value['category']).toBe(
			DocumentCategoryEnum.Scene
		);
		expect(params?.formGroup.value['filePath']).toBe('/document/scene');
	});
});
