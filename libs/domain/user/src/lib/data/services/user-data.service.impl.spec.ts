import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { firstValueFrom } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { FirestoreSyncService, User } from '@music-collection/api';

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
	let sync: { set: jest.Mock };

	const service = () => TestBed.inject(UserDataServiceImpl);

	beforeEach(() => {
		sync = { set: jest.fn().mockResolvedValue(undefined) };
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
