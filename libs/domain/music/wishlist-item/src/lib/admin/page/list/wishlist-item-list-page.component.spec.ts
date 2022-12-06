import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { WishlistItemCollectionModule } from '../../../collection/wishlist-item-collection.module';
import { WishlistItemListPageComponent } from './wishlist-item-list-page.component';

describe('WishlistItemListComponent', () => {
	let component: WishlistItemListPageComponent;
	let fixture: ComponentFixture<WishlistItemListPageComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [WishlistItemListPageComponent],
			imports: [WishlistItemCollectionModule],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(WishlistItemListPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
