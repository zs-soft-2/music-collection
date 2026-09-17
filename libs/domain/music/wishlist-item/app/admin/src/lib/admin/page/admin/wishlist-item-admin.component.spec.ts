import { NgxPermissionsModule } from 'ngx-permissions';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WishlistItemStateService } from '@music-collection/api';

import { WishlistItemAdminComponent } from './wishlist-item-admin.component';

describe('WishlistItemAdminComponent', () => {
	let component: WishlistItemAdminComponent;
	let fixture: ComponentFixture<WishlistItemAdminComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [WishlistItemAdminComponent, NgxPermissionsModule.forRoot()],
			providers: [
				provideRouter([]),
				{
					provide: WishlistItemStateService,
					useValue: {
						selectNewEntityButtonEnabled$: jest.fn(() => of(true)),
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(WishlistItemAdminComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
