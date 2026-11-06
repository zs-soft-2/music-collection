import { firstValueFrom } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	Firestore,
	endAt,
	getDocs,
	limit,
	orderBy,
	startAt,
} from '@angular/fire/firestore';
import {
	FirestoreSyncService,
	MUSICIAN_FEATURE_KEY,
} from '@music-collection/api';

import { MembershipRepository } from './membership.repository';

jest.mock('@angular/fire/firestore', () => ({
	...jest.requireActual('@angular/fire/firestore'),
	collection: jest.fn((_firestore: unknown, path: string) => ({ path })),
	query: jest.fn((reference: unknown) => reference),
	orderBy: jest.fn(),
	startAt: jest.fn(),
	endAt: jest.fn(),
	limit: jest.fn(),
	getDocs: jest.fn(),
}));

describe('MembershipRepository.findMusiciansByName$', () => {
	const repository = () => TestBed.inject(MembershipRepository);

	beforeEach(() => {
		jest.clearAllMocks();

		(getDocs as jest.Mock).mockResolvedValue({
			docs: [{ id: 'm1', data: () => ({ name: 'Bill Steer' }) }],
		});

		TestBed.configureTestingModule({
			providers: [
				MembershipRepository,
				{ provide: Firestore, useValue: {} },
				{ provide: FirestoreSyncService, useValue: {} },
			],
		});
	});

	it('reads the musicians whose name starts with the prefix', async () => {
		await firstValueFrom(repository().findMusiciansByName$('Bill', 10));

		expect((getDocs as jest.Mock).mock.calls[0][0]).toEqual({
			path: MUSICIAN_FEATURE_KEY,
		});
		expect(orderBy).toHaveBeenCalledWith('name');
		expect(startAt).toHaveBeenCalledWith('Bill');
		expect(endAt).toHaveBeenCalledWith('Bill');
		expect(limit).toHaveBeenCalledWith(10);
	});

	it('gives each musician its document id as uid', async () => {
		const found = await firstValueFrom(
			repository().findMusiciansByName$('Bill', 10)
		);

		expect(found).toEqual([{ uid: 'm1', name: 'Bill Steer' }]);
	});
});
