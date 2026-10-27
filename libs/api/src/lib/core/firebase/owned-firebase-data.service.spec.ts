import { firstValueFrom, of } from 'rxjs';

import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Firestore, collection, doc } from '@angular/fire/firestore';

import {
	Entity,
	EntityTypeEnum,
	GLOBAL_OWNER_ID,
	QueryConstraintTypeEnum,
	QueryOperatorEnum,
	SearchParams,
} from '../../common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { FirestoreSyncService } from './firestore-sync.service';
import { OwnedFirebaseDataService } from './owned-firebase-data.service';

jest.mock('@angular/fire/firestore', () => ({
	...jest.requireActual('@angular/fire/firestore'),
	collection: jest.fn(),
	doc: jest.fn(),
}));

/** Counts the generated ids, so each added row gets its own. */
let ids = 0;

interface Row extends Entity {
	name: string;
}

@Injectable()
class OwnedRowDataService extends OwnedFirebaseDataService<
	Row,
	{ name: string },
	Row
> {
	public constructor() {
		super();

		this.catalogFeatureKey = 'row';
	}
}

const search = (field: string, value: unknown): SearchParams => [
	{
		entityType: EntityTypeEnum.Artist,
		query: {
			field,
			queryConstraint: QueryConstraintTypeEnum.where,
			operation: QueryOperatorEnum.equal,
			value,
		},
	},
];

describe('OwnedFirebaseDataService', () => {
	let sync: {
		delete: jest.Mock;
		list$: jest.Mock;
		set: jest.Mock;
	};
	let signedIn: { uid: string } | null;

	const service = () => TestBed.inject(OwnedRowDataService);

	beforeEach(() => {
		ids = 0;
		signedIn = { uid: 'collector-1' };
		sync = {
			delete: jest.fn().mockResolvedValue(undefined),
			list$: jest.fn(() => of([])),
			set: jest.fn().mockResolvedValue(undefined),
		};

		(collection as jest.Mock).mockImplementation(
			(_firestore: unknown, ...path: string[]) => ({
				path: path.join('/'),
			})
		);
		(doc as jest.Mock).mockImplementation(
			(reference: { path: string }, id?: string) => {
				const documentId = id ?? `id-${++ids}`;

				return {
					id: documentId,
					path: `${reference.path}/${documentId}`,
				};
			}
		);

		TestBed.configureTestingModule({
			providers: [
				OwnedRowDataService,
				{ provide: Firestore, useValue: {} },
				{ provide: FirestoreSyncService, useValue: sync },
				{
					provide: AuthenticatedUserService,
					useValue: {
						get current() {
							return signedIn;
						},
						get user$() {
							return of(signedIn);
						},
					},
				},
			],
		});
	});

	it('writes under the collector, not into the catalog', async () => {
		await firstValueFrom(service().add$({ name: 'Pozvakowski' }));

		expect(sync.set).toHaveBeenCalledWith(
			expect.objectContaining({
				path: 'user/collector-1/owned-row/id-1',
			}),
			'owned-row',
			expect.objectContaining({ name: 'Pozvakowski' })
		);
	});

	it('stamps the collector as the owner, so nothing reads it as catalog', async () => {
		const added = await firstValueFrom(
			service().add$({ name: 'Pozvakowski' })
		);

		expect(added.meta?.ownerId).toBe('collector-1');
		expect(added.meta?.ownerId).not.toBe(GLOBAL_OWNER_ID);
	});

	it('keeps the owner on an update', async () => {
		const updated = await firstValueFrom(
			service().update$({ uid: 'r1', name: 'Pozvakowski' } as Row)
		);

		expect(updated.meta?.ownerId).toBe('collector-1');
	});

	it('refuses a write with nobody signed in, rather than losing it', async () => {
		signedIn = null;

		await expect(
			firstValueFrom(service().add$({ name: 'Pozvakowski' }))
		).rejects.toThrow('owned-row');
		expect(sync.set).not.toHaveBeenCalled();
	});

	it('reads the collector own collection, apart from the bundles', async () => {
		await firstValueFrom(service().list$());

		expect(sync.list$).toHaveBeenCalledWith({
			featureKey: 'owned-row',
			cacheKey: 'owned-row?collector-1',
			query: { path: 'user/collector-1/owned-row' },
			bundle: false,
		});
	});

	it('shows a visitor nothing at all', async () => {
		signedIn = null;

		await expect(firstValueFrom(service().list$())).resolves.toEqual([]);
		expect(sync.list$).not.toHaveBeenCalled();
	});

	it('searches the list it already holds', async () => {
		sync.list$.mockReturnValue(
			of([
				{ uid: 'r1', name: 'Pozvakowski' },
				{ uid: 'r2', name: 'Amon Amarth' },
			])
		);

		await expect(
			firstValueFrom(service().search$(search('name', 'Amon Amarth')))
		).resolves.toEqual([{ uid: 'r2', name: 'Amon Amarth' }]);
	});

	it('reads a nested field the way Firestore does', async () => {
		sync.list$.mockReturnValue(
			of([
				{ uid: 'r1', artist: { uid: 'a1' } },
				{ uid: 'r2', artist: { uid: 'a2' } },
			])
		);

		await expect(
			firstValueFrom(service().search$(search('artist.uid', 'a2')))
		).resolves.toEqual([{ uid: 'r2', artist: { uid: 'a2' } }]);
	});

	it('leaves a tombstone on delete, for the other devices', async () => {
		await firstValueFrom(
			service().delete$({ uid: 'r1', name: 'Pozvakowski' } as Row)
		);

		expect(sync.delete).toHaveBeenCalledWith(
			expect.objectContaining({
				path: 'user/collector-1/owned-row/r1',
			}),
			'owned-row'
		);
	});
});
