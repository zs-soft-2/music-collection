import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { BehaviorSubject, of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AuthenticationStateService,
	WishlistItemEntity,
	WishlistItemEntityUpdate,
	WishlistItemPermissionsService,
	WishlistItemStateService,
} from '@music-collection/api';
import { NgxPermissionsService } from 'ngx-permissions';

import { WishlistPageComponent } from './wishlist-page.component';

const COLLECTOR = { uid: 'user-1', displayName: 'Zsolt' };

/** What a collector who may keep a wishlist holds. */
const WISHLIST_PERMISSIONS = {
	[WishlistItemPermissionsService.updateWishlistItemEntity]: {},
};

function wishlistItem(
	uid: string,
	userId: string,
	isActive = true
): WishlistItemEntity {
	return {
		uid,
		entityType: 'wishlist-item',
		albumReference: {
			uid: `album-${uid}`,
			name: `Album ${uid}`,
			coverImage: null,
		},
		artistReference: { uid: 'artist-1', name: 'Accuser' },
		userReference: { uid: userId, displayName: 'Someone' },
		medias: ['vinyl'],
		sourceLink: '',
		isActive,
	} as unknown as WishlistItemEntity;
}

describe('WishlistPageComponent', () => {
	let component: WishlistPageComponent;
	let fixture: ComponentFixture<WishlistPageComponent>;
	let items$: BehaviorSubject<WishlistItemEntity[]>;
	let updating$: BehaviorSubject<boolean>;
	let update: jest.Mock<void, [WishlistItemEntityUpdate]>;

	beforeEach(async () => {
		items$ = new BehaviorSubject<WishlistItemEntity[]>([]);
		updating$ = new BehaviorSubject(false);
		update = jest.fn();

		await TestBed.configureTestingModule({
			imports: [WishlistPageComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: WishlistItemStateService,
					useValue: {
						dispatchListOwnEntitiesAction: jest.fn(),
						dispatchUpdateEntityAction: update,
						selectEntities$: () => items$,
						selectUpdating$: () => updating$,
						selectError$: () => of(null),
					},
				},
				{
					provide: AuthenticationStateService,
					useValue: {
						selectAuthenticatedUser$: () => of(COLLECTOR),
					},
				},
				{
					provide: NgxPermissionsService,
					useValue: { permissions$: of(WISHLIST_PERMISSIONS) },
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

	it("shows only the signed-in user's own wanted albums", () => {
		items$.next([
			wishlistItem('mine', COLLECTOR.uid),
			wishlistItem('theirs', 'user-2'),
		]);

		expect(component['store'].entries().map((entry) => entry.id)).toEqual([
			'mine',
		]);
	});

	it('marks a wanted album found, and wanted again', () => {
		items$.next([wishlistItem('mine', COLLECTOR.uid)]);

		component['store'].setFound('mine', true);

		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				uid: 'mine',
				isActive: false,
				userReference: { uid: COLLECTOR.uid, displayName: 'Someone' },
				// Kept: the write recomputes the search parameters from it.
				albumReference: expect.objectContaining({ name: 'Album mine' }),
			})
		);

		// The write finished: the card is free again.
		updating$.next(true);
		updating$.next(false);
		items$.next([wishlistItem('mine', COLLECTOR.uid, false)]);

		component['store'].setFound('mine', false);

		expect(update).toHaveBeenLastCalledWith(
			expect.objectContaining({ uid: 'mine', isActive: true })
		);
	});

	it('leaves a guest with nothing to change', async () => {
		TestBed.resetTestingModule();
		await TestBed.configureTestingModule({
			imports: [WishlistPageComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: WishlistItemStateService,
					useValue: {
						dispatchListOwnEntitiesAction: jest.fn(),
						dispatchUpdateEntityAction: update,
						selectEntities$: () =>
							of([wishlistItem('mine', COLLECTOR.uid)]),
						selectUpdating$: () => of(false),
						selectError$: () => of(null),
					},
				},
				{
					provide: AuthenticationStateService,
					useValue: { selectAuthenticatedUser$: () => of(null) },
				},
				{
					provide: NgxPermissionsService,
					useValue: { permissions$: of(WISHLIST_PERMISSIONS) },
				},
			],
		}).compileComponents();

		const guestFixture = TestBed.createComponent(WishlistPageComponent);
		guestFixture.detectChanges();

		expect(guestFixture.componentInstance['store'].canEdit()).toBe(false);
		expect(guestFixture.componentInstance['store'].entries()).toHaveLength(
			0
		);
	});
});
