import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WishlistItemFormComponent } from './wishlist-item-form.component';

describe('WishlistItemFormComponent', () => {
	let component: WishlistItemFormComponent;
	let fixture: ComponentFixture<WishlistItemFormComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [WishlistItemFormComponent],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(WishlistItemFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
