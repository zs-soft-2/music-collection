import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { FirestoreSyncService } from '@music-collection/api';

import { EntityQuantityDataServiceImpl } from './entity-quantity-data.service.impl';

jest.mock('@angular/fire/firestore', () => ({
	...jest.requireActual('@angular/fire/firestore'),
	collection: jest.fn(() => ({})),
	doc: jest.fn(() => ({})),
}));

describe('EntityQuantityDataServiceImpl', () => {
	beforeEach(() =>
		TestBed.configureTestingModule({
			providers: [
				EntityQuantityDataServiceImpl,
				{ provide: Firestore, useValue: {} },
				{ provide: FirestoreSyncService, useValue: {} },
			],
		})
	);

	it('should be created', () => {
		const service: EntityQuantityDataServiceImpl = TestBed.inject(
			EntityQuantityDataServiceImpl
		);
		expect(service).toBeTruthy();
	});
});
