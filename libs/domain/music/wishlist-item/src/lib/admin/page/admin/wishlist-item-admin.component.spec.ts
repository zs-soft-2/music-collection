import { HttpClientTestingModule } from '@angular/common/http/testing';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { WishlistItemCollectionModule } from '../../../collection/wishlist-item-collection.module';
import { WishlistItemAdminComponent } from './wishlist-item-admin.component';

describe('WishlistItemAdminComponent', () => {
	let component: WishlistItemAdminComponent;
	let fixture: ComponentFixture<WishlistItemAdminComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [WishlistItemAdminComponent],
			imports: [
				HttpClientTestingModule,
				RouterTestingModule,
				WishlistItemCollectionModule,
			],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(WishlistItemAdminComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
