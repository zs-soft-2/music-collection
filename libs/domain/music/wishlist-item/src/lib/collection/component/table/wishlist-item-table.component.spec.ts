import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WishlistItemTableComponent } from './wishlist-item-table.component';

describe('WishlistItemTableComponent', () => {
	let component: WishlistItemTableComponent;
	let fixture: ComponentFixture<WishlistItemTableComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [WishlistItemTableComponent],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(WishlistItemTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
