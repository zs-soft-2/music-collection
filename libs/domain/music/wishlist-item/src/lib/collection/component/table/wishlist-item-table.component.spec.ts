import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	ExportImportService,
	WishlistItemStateService,
	WishlistItemUtilService,
} from '@music-collection/api';

import { WishlistItemTableComponent } from './wishlist-item-table.component';

describe('WishlistItemTableComponent', () => {
	let component: WishlistItemTableComponent;
	let fixture: ComponentFixture<WishlistItemTableComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [WishlistItemTableComponent],
			providers: [
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

		fixture = TestBed.createComponent(WishlistItemTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
