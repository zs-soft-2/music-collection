import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	WishlistItemEntity,
	ExportImportService,
	WishlistItemStateService,
	WishlistItemUtilService,
} from '@music-collection/api';

import { WishlistItemTableComponent } from './wishlist-item-table.component';

const wishlistItem = {
	uid: '1',
	albumReference: { name: 'In Utero' },
	artistReference: { name: 'Nirvana' },
} as WishlistItemEntity;

describe('WishlistItemTableComponent', () => {
	let component: WishlistItemTableComponent;
	let fixture: ComponentFixture<WishlistItemTableComponent>;

	beforeEach(async () => {
		localStorage.clear();
		sessionStorage.clear();

		await TestBed.configureTestingModule({
			imports: [WishlistItemTableComponent],
			providers: [
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: WishlistItemStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([wishlistItem])),
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

	it('shows the wishlist item in both views', () => {
		expect(
			fixture.nativeElement.querySelector('tbody').textContent
		).toContain('In Utero');

		component.collectionView.setView('cards');
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('mc-entity-card').textContent
		).toContain('In Utero');
	});
});
