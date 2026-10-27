import {
	Observable,
	concatMap,
	firstValueFrom,
	from,
	lastValueFrom,
	toArray,
} from 'rxjs';

import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
	CollectionReference,
	Firestore,
	collection,
	doc,
	getDocs,
	limit,
	where,
} from '@angular/fire/firestore';

import { Entity, GLOBAL_OWNER_ID } from '../../common';
import { FirebaseDataService } from './firebase-data.service';
import { FirestoreSyncService } from './firestore-sync.service';

jest.mock('@angular/fire/firestore', () => ({
	...jest.requireActual('@angular/fire/firestore'),
	collection: jest.fn(() => ({})),
	collectionGroup: jest.fn(() => ({})),
	doc: jest.fn(() => ({ id: `id-${++ids}` })),
	getDocs: jest.fn(),
	limit: jest.fn((max: number) => ({ limit: max })),
	query: jest.fn(() => ({})),
	where: jest.fn((field: string, operation: string, value: unknown) => ({
		where: [field, operation, value],
	})),
}));

/** Counts the generated ids, so each added row gets its own. */
let ids = 0;

interface Row extends Entity {
	name: string;
}

@Injectable()
class RowDataService extends FirebaseDataService<Row, { name: string }, Row> {
	public constructor() {
		super();

		this.featureKey = 'row';
		this.collection = {} as CollectionReference;
	}

	public add$(row: { name: string }): Observable<Row> {
		return super.addModel$(row);
	}

	public update$(row: Row): Observable<Row> {
		return super.updateModel$(row);
	}

	public lookup$(value: string, max: number): Observable<Row[]> {
		return super.lookupModels$('searchParameters', value, max);
	}
}

describe('FirebaseDataService', () => {
	let sync: { set: jest.Mock };

	const service = () => TestBed.inject(RowDataService);

	beforeEach(() => {
		ids = 0;
		sync = { set: jest.fn().mockResolvedValue(undefined) };
		(collection as jest.Mock).mockReturnValue({});
		(doc as jest.Mock).mockImplementation(() => ({ id: `id-${++ids}` }));

		TestBed.configureTestingModule({
			providers: [
				RowDataService,
				{ provide: Firestore, useValue: {} },
				{ provide: FirestoreSyncService, useValue: sync },
			],
		});
	});

	it('completes the add, so a queued caller gets its turn', async () => {
		const added = await lastValueFrom(
			from([{ name: 'Johan Hegg' }, { name: 'Olavi Mikkonen' }]).pipe(
				concatMap((row) => service().add$(row)),
				toArray()
			)
		);

		expect(added.map((row) => row.name)).toEqual([
			'Johan Hegg',
			'Olavi Mikkonen',
		]);
	});

	it('reports a refused write instead of going quiet', async () => {
		sync.set.mockRejectedValue({ code: 'permission-denied' });

		await expect(
			firstValueFrom(service().add$({ name: 'Ted Lundström' }))
		).rejects.toMatchObject({ code: 'permission-denied' });
	});

	it('completes the update as well', async () => {
		await expect(
			lastValueFrom(
				service().update$({ uid: 'u1', name: 'Ted Lundström' } as Row)
			)
		).resolves.toMatchObject({ uid: 'u1' });
	});

	it('writes the catalog as the owner, so nobody reads it as somebody own', async () => {
		const added = await firstValueFrom(
			service().add$({ name: 'Johan Hegg' })
		);

		expect(added.meta?.ownerId).toBe(GLOBAL_OWNER_ID);
	});

	describe('lookupModels$', () => {
		it('asks for the documents holding the value, and no more than the limit', async () => {
			(getDocs as jest.Mock).mockResolvedValue({
				docs: [
					{ data: () => ({ uid: 'u1', name: 'Amon Amarth' }) },
					{ data: () => ({ uid: 'u2', name: 'Amorphis' }) },
				],
			});

			const rows = await firstValueFrom(service().lookup$('amo', 10));

			expect(where).toHaveBeenCalledWith(
				'searchParameters',
				'array-contains',
				'amo'
			);
			expect(limit).toHaveBeenCalledWith(10);
			expect(rows.map((row) => row.name)).toEqual([
				'Amon Amarth',
				'Amorphis',
			]);
		});
	});
});
