import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WishlistItemSimpleViewComponent } from './wishlist-item-simple-view.component';

describe('WishlistItemSimpleViewComponent', () => {
	let component: WishlistItemSimpleViewComponent;
	let fixture: ComponentFixture<WishlistItemSimpleViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideI18nTesting()],
			imports: [WishlistItemSimpleViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(WishlistItemSimpleViewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
