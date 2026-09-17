import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WishlistItemStateService } from '@music-collection/api';

import { WishlistPageComponent } from './wishlist-page.component';

describe('WishlistPageComponent', () => {
	let component: WishlistPageComponent;
	let fixture: ComponentFixture<WishlistPageComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [WishlistPageComponent],
			providers: [
				provideRouter([]),
				{
					provide: WishlistItemStateService,
					useValue: {
						dispatchListEntitiesAction: jest.fn(),
						selectEntities$: () => of([]),
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(WishlistPageComponent);

		component = fixture.componentInstance;

		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
