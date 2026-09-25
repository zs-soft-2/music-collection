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
} from '@angular/fire/firestore';

import { Entity } from '../../common';
import { FirebaseDataService } from './firebase-data.service';
import { FirestoreSyncService } from './firestore-sync.service';

jest.mock('@angular/fire/firestore', () => ({
	...jest.requireActual('@angular/fire/firestore'),
	collection: jest.fn(() => ({})),
	doc: jest.fn(() => ({ id: `id-${++ids}` })),
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
});
