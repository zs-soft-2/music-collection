import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	CollectionItemStateService,
	CollectionItemUtilService,
} from '@music-collection/api';

import { CollectionItemTableComponent } from './collection-item-table.component';

describe('CollectionItemTableComponent', () => {
	let component: CollectionItemTableComponent;
	let fixture: ComponentFixture<CollectionItemTableComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CollectionItemTableComponent],
			providers: [
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: CollectionItemStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{ provide: CollectionItemUtilService, useValue: {} },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(CollectionItemTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
