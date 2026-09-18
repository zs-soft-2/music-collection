import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WishlistItemStateService } from '@music-collection/api';

import { WishlistItemListComponent } from './wishlist-item-list.component';

describe('WishlistItemListComponent', () => {
	let component: WishlistItemListComponent;
	let fixture: ComponentFixture<WishlistItemListComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [WishlistItemListComponent],
			providers: [
				{
					provide: WishlistItemStateService,
					useValue: { selectEntities$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(WishlistItemListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
