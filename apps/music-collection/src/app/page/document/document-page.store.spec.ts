import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { DocumentEntity } from '@music-collection/api';

import { DocumentDetailsEffect } from '../../data/document-details';
import { DocumentPageStore } from './document-page.store';

const BUCKET = 'music-collection-dev.appspot.com';

const ownFile = (bucket: string): string =>
	`https://firebasestorage.googleapis.com/v0/b/${bucket}/o/` +
	`${encodeURIComponent('document/booklet.pdf')}?alt=media&token=t`;

function setUp(filePath: string): {
	store: InstanceType<typeof DocumentPageStore>;
	effect: { load$: jest.Mock; storageBucket: jest.Mock };
} {
	const effect = {
		load$: jest.fn(() =>
			of({
				uid: 'd1',
				name: 'Booklet',
				fileType: 'application/pdf',
				filePath,
			} as DocumentEntity)
		),
		storageBucket: jest.fn(() => BUCKET),
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			DocumentPageStore,
			{ provide: DocumentDetailsEffect, useValue: effect },
			{
				provide: ActivatedRoute,
				useValue: {
					paramMap: of(convertToParamMap({ documentId: 'd1' })),
				},
			},
		],
	});

	return { store: TestBed.inject(DocumentPageStore), effect };
}

describe('DocumentPageStore.framableFileUrl', () => {
	it('frames a file of the bucket the effect names', () => {
		const { store, effect } = setUp(ownFile(BUCKET));

		expect(effect.storageBucket).toHaveBeenCalled();
		expect(store.framableFileUrl()).toBe(ownFile(BUCKET));
	});

	it('does not frame a file of somebody else’s bucket', () => {
		const { store } = setUp(ownFile('someone-else.appspot.com'));

		expect(store.fileUrl()).toBe(ownFile('someone-else.appspot.com'));
		expect(store.framableFileUrl()).toBeNull();
	});

	it('does not frame an address off the Storage host', () => {
		const { store } = setUp('https://example.com/booklet.pdf');

		expect(store.framableFileUrl()).toBeNull();
	});
});
