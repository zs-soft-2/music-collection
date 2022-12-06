import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WishlistItemListComponent } from './wishlist-item-list.component';

describe('WishlistItemListComponent', () => {
	let component: WishlistItemListComponent;
	let fixture: ComponentFixture<WishlistItemListComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [WishlistItemListComponent],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(WishlistItemListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
