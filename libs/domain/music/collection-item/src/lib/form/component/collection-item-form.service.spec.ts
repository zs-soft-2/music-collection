import { firstValueFrom, of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import {
	AuthenticationStateService,
	CollectionItemEntity,
	CollectionItemFormParams,
	CollectionItemStateService,
	CollectionItemUtilService,
	ReleaseStateService,
	ShelfLayoutService,
	ShelfUnitLayout,
} from '@music-collection/api';

import { CollectionItemUtilServiceImpl } from '../../util/service/collection-item-util.service.impl';
import { CollectionItemFormService } from './collection-item-form.service';

const UNITS: ShelfUnitLayout[] = [
	{ id: 'living-room', name: 'Living room', rows: 2, columns: 2 },
	{ id: 'hall', name: '', rows: 1, columns: 1 },
];

const copy = (
	placement: CollectionItemEntity['placement']
): CollectionItemEntity =>
	({
		uid: 'item-1',
		userId: 'user-1',
		date: new Date(0),
		placement,
		release: { name: 'Wish You Were Here' },
	}) as CollectionItemEntity;

describe('CollectionItemFormService', () => {
	let service: CollectionItemFormService;

	const setUp = (
		collectionItem: CollectionItemEntity | undefined,
		units: ShelfUnitLayout[] = UNITS
	): Promise<CollectionItemFormParams> => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				CollectionItemFormService,
				{
					provide: ActivatedRoute,
					useValue: { params: of({ collectionItemId: 'item-1' }) },
				},
				{
					provide: AuthenticationStateService,
					useValue: {
						selectAuthenticatedUser$: () => of({ uid: 'user-1' }),
					},
				},
				{
					provide: CollectionItemStateService,
					useValue: { selectEntityById$: () => of(collectionItem) },
				},
				{
					provide: CollectionItemUtilService,
					useClass: CollectionItemUtilServiceImpl,
				},
				{
					provide: ReleaseStateService,
					useValue: { selectSearchResult$: () => of([]) },
				},
				{
					provide: ShelfLayoutService,
					useValue: { units$: () => of(units) },
				},
			],
		});

		service = TestBed.inject(CollectionItemFormService);

		return firstValueFrom(service.init$());
	};

	afterEach(() => {
		TestBed.resetTestingModule();
	});

	it('should be created', async () => {
		await setUp(undefined, []);

		expect(service).toBeTruthy();
	});

	it('offers the drawn units, the nameless one numbered', async () => {
		const params = await setUp(copy(null));

		expect(params.placement.units).toEqual([
			{ value: 'living-room', label: 'Living room' },
			{ value: 'hall', label: 'Shelf 2' },
		]);
	});

	it('opens on the unit the copy stands in, and shows its compartment', async () => {
		const params = await setUp(
			copy({ unitId: 'hall', row: 1, column: 1, position: 3 })
		);

		expect(params.placement.unitId).toBe('hall');
		expect(params.placement.spot).toBe('1:1');
		expect(params.placement.position).toBe(3);
		expect(params.placement.lost).toBe(false);
	});

	it('keeps a place no drawn compartment answers to any more', async () => {
		const params = await setUp(
			copy({ unitId: 'garage', row: 9, column: 9, position: 1 })
		);

		expect(params.placement.lost).toBe(true);
		expect(params.formGroup.value['placement']).toEqual({
			unitId: 'garage',
			row: 9,
			column: 9,
			position: 1,
		});
	});

	it('files the copy where a compartment is picked', async () => {
		const params = await setUp(copy(null));

		service.chooseSpot('2:1');

		expect(params.formGroup.value['placement']).toEqual({
			unitId: 'living-room',
			row: 2,
			column: 1,
			position: 1,
		});

		service.choosePosition(4);

		expect(params.formGroup.value['placement']).toEqual({
			unitId: 'living-room',
			row: 2,
			column: 1,
			position: 4,
		});
	});

	it('keeps the position where the copy is put back in its own compartment', async () => {
		const params = await setUp(
			copy({ unitId: 'living-room', row: 1, column: 2, position: 7 })
		);

		service.chooseSpot('1:2');

		expect(params.formGroup.value['placement']).toEqual({
			unitId: 'living-room',
			row: 1,
			column: 2,
			position: 7,
		});
	});

	it('leaves the filing to the shelf again when the unit changes or the place is taken back', async () => {
		const params = await setUp(
			copy({ unitId: 'living-room', row: 1, column: 1, position: 1 })
		);

		service.chooseUnit('hall');

		expect(params.formGroup.value['placement']).toBeNull();

		service.chooseSpot('1:1');
		service.clearPlace();

		expect(params.formGroup.value['placement']).toBeNull();
	});

	it('has no shelf to file into without drawn furniture', async () => {
		const params = await setUp(copy(null), []);

		expect(params.placement.units).toEqual([]);
		expect(params.placement.spots).toEqual([]);
	});
});
