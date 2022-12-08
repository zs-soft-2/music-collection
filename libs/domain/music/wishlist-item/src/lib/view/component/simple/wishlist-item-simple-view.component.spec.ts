import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WishlistItemSimpleViewComponent } from './wishlist-item-simple-view.component';

describe('WishlistItemSimpleViewComponent', () => {
	let component: WishlistItemSimpleViewComponent;
	let fixture: ComponentFixture<WishlistItemSimpleViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [WishlistItemSimpleViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(WishlistItemSimpleViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
