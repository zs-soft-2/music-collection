import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { Storage } from '@angular/fire/storage';
import { FirestoreSyncService } from '@music-collection/api';

import { DocumentDataServiceImpl } from './document-data.service.impl';

jest.mock('@angular/fire/firestore', () => ({
	...jest.requireActual('@angular/fire/firestore'),
	collection: jest.fn(() => ({})),
}));

describe('DocumentDataServiceImpl', () => {
	beforeEach(() =>
		TestBed.configureTestingModule({
			providers: [
				DocumentDataServiceImpl,
				{ provide: Firestore, useValue: {} },
				{ provide: FirestoreSyncService, useValue: {} },
				{ provide: Storage, useValue: {} },
			],
		})
	);

	it('should be created', () => {
		const service: DocumentDataServiceImpl = TestBed.inject(
			DocumentDataServiceImpl
		);
		expect(service).toBeTruthy();
	});
});
