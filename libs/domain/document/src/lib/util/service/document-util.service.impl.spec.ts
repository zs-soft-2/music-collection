import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { DocumentCategoryEnum } from '@music-collection/api';

import { DocumentUtilServiceImpl } from './document-util.service.impl';

describe('DocumentUtilServiceImpl', () => {
	let service: DocumentUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideI18nTesting(), DocumentUtilServiceImpl],
		});

		service = TestBed.inject(DocumentUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('files a new document under the category that was picked', () => {
		const formGroup = service.createFormGroupByProperties({
			name: 'Reign in Blood',
			originalName: 'reign.jpg',
			filePath: '/document/reign',
			fileType: 'image/jpeg',
		});

		formGroup.patchValue({ category: DocumentCategoryEnum.AlbumCover });

		expect(service.createEntity(formGroup).category).toBe(
			DocumentCategoryEnum.AlbumCover
		);
	});

	it('leaves the category out of a document filed under none', () => {
		const formGroup = service.createFormGroupByProperties({
			uid: 'cover',
			name: 'Reign in Blood',
			originalName: 'reign.jpg',
			filePath: '/document/reign',
			fileType: 'image/jpeg',
			category: DocumentCategoryEnum.AlbumCover,
		});

		// What clearing the picker does: the save writes the whole
		// document, so the field has to be absent rather than empty.
		formGroup.patchValue({ category: null });

		expect('category' in service.updateEntity(formGroup)).toBe(false);
	});
});
