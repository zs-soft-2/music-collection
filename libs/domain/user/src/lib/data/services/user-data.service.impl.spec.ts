import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { FirestoreSyncService } from '@music-collection/api';

import { UserDataServiceImpl } from './user-data.service.impl';

jest.mock('@angular/fire/firestore', () => ({
	...jest.requireActual('@angular/fire/firestore'),
	collection: jest.fn(() => ({})),
	doc: jest.fn(() => ({})),
}));

describe('UserDataServiceImpl', () => {
	beforeEach(() =>
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				UserDataServiceImpl,
				{ provide: Firestore, useValue: {} },
				{ provide: FirestoreSyncService, useValue: {} },
			],
		})
	);

	it('should be created', () => {
		const service: UserDataServiceImpl =
			TestBed.inject(UserDataServiceImpl);

		expect(service).toBeTruthy();
	});
});
