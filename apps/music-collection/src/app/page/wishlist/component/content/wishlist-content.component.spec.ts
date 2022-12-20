import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WishlistContentComponent } from './wishlist-content.component';

describe('WishlistContentComponent', () => {
	let component: WishlistContentComponent;
	let fixture: ComponentFixture<WishlistContentComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [WishlistContentComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(WishlistContentComponent);

		component = fixture.componentInstance;

		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
