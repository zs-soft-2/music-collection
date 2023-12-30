import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { WishlistItemFormModule } from '../../../form/wishlist-item-form.module';
import { WishlistItemEditComponent } from './wishlist-item-edit.component';

describe('WishlistItemEditComponent', () => {
	let component: WishlistItemEditComponent;
	let fixture: ComponentFixture<WishlistItemEditComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [WishlistItemEditComponent],
			imports: [WishlistItemFormModule],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(WishlistItemEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
