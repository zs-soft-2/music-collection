import { firstValueFrom } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { Storage } from '@angular/fire/storage';
import {
	DocumentCategoryEnum,
	DocumentModel,
	EntityTypeEnum,
	FirestoreSyncService,
} from '@music-collection/api';

import { DocumentDataServiceImpl } from './document-data.service.impl';

jest.mock('@angular/fire/firestore', () => ({
	...jest.requireActual('@angular/fire/firestore'),
	collection: jest.fn(() => ({})),
	doc: jest.fn(() => ({ id: 'reference' })),
}));

const badge: DocumentModel = {
	uid: 'badge',
	entityType: EntityTypeEnum.Document,
	category: DocumentCategoryEnum.Badge,
	name: 'Badge — Thrash Historian #1',
	originalName: 'thrash-badge-v1-1.png',
	filePath: '/document/badge',
	fileType: 'image/png',
	searchParameters: ['badge'],
};

describe('DocumentDataServiceImpl', () => {
	let service: DocumentDataServiceImpl;
	let update: jest.Mock;

	beforeEach(() => {
		update = jest.fn(() => Promise.resolve());

		TestBed.configureTestingModule({
			providers: [
				DocumentDataServiceImpl,
				{ provide: Firestore, useValue: {} },
				{ provide: FirestoreSyncService, useValue: { update } },
				{ provide: Storage, useValue: {} },
			],
		});

		service = TestBed.inject(DocumentDataServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('withdraws a document by marking it, writing nothing else', async () => {
		const withdrawn = await firstValueFrom(service.delete$(badge));

		expect(update).toHaveBeenCalledWith(expect.anything(), 'document', {
			deletedAt: expect.any(Number),
		});
		expect(withdrawn.deletedAt).toEqual(expect.any(Number));
		expect(withdrawn.filePath).toBe(badge.filePath);
	});

	it('takes a withdrawn document back by clearing the mark', async () => {
		const restored = await firstValueFrom(
			service.restore$({ ...badge, deletedAt: 42 })
		);

		expect(update).toHaveBeenCalledWith(expect.anything(), 'document', {
			deletedAt: null,
		});
		expect(restored.deletedAt).toBeNull();
	});
});
