import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { firstValueFrom } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { Firestore, deleteField, doc, getDoc } from '@angular/fire/firestore';
import {
	CollectionItemModelUpdate,
	CollectionItemPlacement,
	FirestoreSyncService,
	User,
} from '@music-collection/api';

import { UserDataServiceImpl } from './user-data.service.impl';

jest.mock('@angular/fire/firestore', () => ({
	...jest.requireActual('@angular/fire/firestore'),
	collection: jest.fn(() => ({})),
	doc: jest.fn(() => ({})),
	getDoc: jest.fn(),
}));

/** The profile the sign-in sends: the Google account, and no role. */
const profile = (): User =>
	({
		displayName: 'A Collector',
		email: 'collector@example.com',
		uid: 'collector-1',
	}) as User;

describe('UserDataServiceImpl', () => {
	let sync: { set: jest.Mock; setAll: jest.Mock };

	const service = () => TestBed.inject(UserDataServiceImpl);

	beforeEach(() => {
		sync = {
			set: jest.fn().mockResolvedValue(undefined),
			setAll: jest.fn().mockResolvedValue(undefined),
		};
		(doc as jest.Mock).mockReturnValue({});

		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				UserDataServiceImpl,
				{ provide: Firestore, useValue: {} },
				{ provide: FirestoreSyncService, useValue: sync },
			],
		});
	});

	it('should be created', () => {
		expect(service()).toBeTruthy();
	});

	/**
	 * The document may already be there, with a role the permission sync put
	 * on it. An overwrite would take that off, and the rules refuse the write
	 * whole — the sign-in then reports a failure over a document that was
	 * never in danger.
	 */
	it('merges the profile rather than writing over the role', async () => {
		await firstValueFrom(service().add$(profile()));

		expect(sync.set).toHaveBeenCalledWith(
			expect.anything(),
			'user',
			expect.objectContaining({ uid: 'collector-1' }),
			{ merge: true }
		);
	});

	/**
	 * Filing a whole compartment is one batch, and a batch merges into what
	 * is already in the document. Every field can be merged except the one
	 * whose absence means something: a placement without `side` is a record
	 * against the left-hand wall, and merged over a `side: 'right'` it would
	 * read as the record never having moved.
	 */
	describe('updateCollectionItems$', () => {
		const copy = (placement: CollectionItemPlacement | null) =>
			({
				uid: 'copy-1',
				entityType: 'collectionItem',
				userId: 'collector-1',
				placement,
			}) as CollectionItemModelUpdate;

		const written = async (placement: CollectionItemPlacement | null) => {
			await firstValueFrom(
				service().updateCollectionItems$([copy(placement)])
			);

			const [, writes] = sync.setAll.mock.calls[0];

			return writes[0].data;
		};

		it('takes the side off a copy moved to the left-hand wall', async () => {
			const data = await written({
				unitId: 'unit-1',
				row: 1,
				column: 1,
				position: 2,
			});

			expect(data.placement).toEqual({
				unitId: 'unit-1',
				row: 1,
				column: 1,
				position: 2,
				side: deleteField(),
			});
		});

		it('writes the right-hand wall as the word it is', async () => {
			const data = await written({
				unitId: 'unit-1',
				row: 1,
				column: 1,
				side: 'right',
				position: 1,
			});

			expect(data.placement).toEqual({
				unitId: 'unit-1',
				row: 1,
				column: 1,
				side: 'right',
				position: 1,
			});
		});

		it('leaves a copy taken off the shelf with no placement at all', async () => {
			expect((await written(null)).placement).toBeNull();
		});
	});

	describe('loadExisting$', () => {
		it('reads once, from the server, so a cold cache says nothing', async () => {
			(getDoc as jest.Mock).mockResolvedValue({
				exists: () => true,
				id: 'collector-1',
				data: () => ({ displayName: 'A Collector' }),
			});

			await expect(
				firstValueFrom(service().loadExisting$('collector-1'))
			).resolves.toMatchObject({
				uid: 'collector-1',
				displayName: 'A Collector',
			});
			expect(getDoc).toHaveBeenCalled();
		});

		it('says nothing for a collector the server has never seen', async () => {
			(getDoc as jest.Mock).mockResolvedValue({
				exists: () => false,
				id: 'collector-2',
				data: () => undefined,
			});

			await expect(
				firstValueFrom(service().loadExisting$('collector-2'))
			).resolves.toBeUndefined();
		});
	});
});
