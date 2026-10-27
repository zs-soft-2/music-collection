import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	CollectionItemStateService,
	CollectionItemUtilService,
} from '@music-collection/api';

import { CollectionItemListPageComponent } from './collection-item-list-page.component';

describe('CollectionItemListComponent', () => {
	let component: CollectionItemListPageComponent;
	let fixture: ComponentFixture<CollectionItemListPageComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CollectionItemListPageComponent],
			providers: [
				provideI18nTesting(),
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

		fixture = TestBed.createComponent(CollectionItemListPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
