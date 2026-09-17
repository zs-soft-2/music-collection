import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
	CollectionItemStateService,
	CollectionItemUtilService,
} from '@music-collection/api';

import { CollectionItemListComponent } from './collection-item-list.component';

describe('CollectionItemListComponent', () => {
	let component: CollectionItemListComponent;
	let fixture: ComponentFixture<CollectionItemListComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CollectionItemListComponent],
			providers: [
				{
					provide: CollectionItemStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						selectCollectionItemListConfig$: jest.fn(() => of(null)),
						dispatchListEntitiesAction: jest.fn(),
					},
				},
				{ provide: CollectionItemUtilService, useValue: {} },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(CollectionItemListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
