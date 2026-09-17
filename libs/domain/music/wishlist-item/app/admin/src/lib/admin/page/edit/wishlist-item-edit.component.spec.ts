import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	ArtistStateService,
	AuthenticationStateService,
	WishlistItemStateService,
	WishlistItemUtilService,
} from '@music-collection/api';

import { WishlistItemEditComponent } from './wishlist-item-edit.component';

describe('WishlistItemEditComponent', () => {
	let component: WishlistItemEditComponent;
	let fixture: ComponentFixture<WishlistItemEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [WishlistItemEditComponent],
			providers: [
				provideRouter([]),
				{
					provide: WishlistItemStateService,
					useValue: { selectEntityById$: jest.fn(() => of(undefined)) },
				},
				{
					provide: WishlistItemUtilService,
					useValue: {
						createOrUpdateFormGroup: jest.fn(() =>
							new FormBuilder().group({
								albumReference: [null],
								artistReference: [null],
								isActive: [true],
								medias: [null],
								sourceLink: [null],
								uid: [null],
								userReference: [null],
							})
						),
					},
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

		fixture = TestBed.createComponent(WishlistItemEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
