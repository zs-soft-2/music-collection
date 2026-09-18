import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	ArtistStateService,
	AuthenticationStateService,
	WishlistItemStateService,
	WishlistItemUtilService,
} from '@music-collection/api';

import { WishlistItemUtilServiceImpl } from '../../util/service/wishlist-item-util.service.impl';
import { WishlistItemFormComponent } from './wishlist-item-form.component';

describe('WishlistItemFormComponent', () => {
	let component: WishlistItemFormComponent;
	let fixture: ComponentFixture<WishlistItemFormComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [WishlistItemFormComponent],
			providers: [
				provideRouter([]),
				{
					provide: WishlistItemStateService,
					useValue: { selectEntityById$: jest.fn(() => of(undefined)) },
				},
				{
					provide: WishlistItemUtilService,
					useClass: WishlistItemUtilServiceImpl,
				},
				{
					provide: AlbumStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
				{
					provide: ArtistStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
				{
					provide: AuthenticationStateService,
					useValue: {
						selectAuthenticatedUser$: jest.fn(() => of(undefined)),
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(WishlistItemFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
