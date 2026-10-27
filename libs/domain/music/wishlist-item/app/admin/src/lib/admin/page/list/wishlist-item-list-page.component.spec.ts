import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	ExportImportService,
	WishlistItemStateService,
	WishlistItemUtilService,
} from '@music-collection/api';

import { WishlistItemListPageComponent } from './wishlist-item-list-page.component';

describe('WishlistItemListComponent', () => {
	let component: WishlistItemListPageComponent;
	let fixture: ComponentFixture<WishlistItemListPageComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [WishlistItemListPageComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: WishlistItemStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{ provide: WishlistItemUtilService, useValue: {} },
				{ provide: ExportImportService, useValue: {} },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(WishlistItemListPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
