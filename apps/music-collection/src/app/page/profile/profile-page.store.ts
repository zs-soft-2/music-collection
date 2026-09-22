import { combineLatest, map, of, pipe, switchMap, tap } from 'rxjs';

import {
	NO_LOCATION,
	UserLocationEffect,
	UserLocationSettings,
} from '../../data/user-location';
import { MeasurementConsentService } from '../../data/analytics';
import { UserSettingsEffect } from '../../data/user-settings';
import { ALBUM_VIEW_SETTING } from '../album/album-view.setting';
import {
	COLLECTION_VIEW_DEFAULTS,
	COLLECTION_VIEW_SETTING,
} from '../collection/collection-view.setting';
import {
	DEFAULT_SHELF,
	NO_SHELF_LAYOUT,
	SHELF_CUBBY_SIZE,
	SHELF_LAYOUT_SETTING,
	SHELF_LIMITS,
	ShelfUnitLayout,
	clampShelfSide,
	shelfCapacity,
} from '../collection/shelf-layout.setting';

import { computed, inject } from '@angular/core';
import {
	AuthenticationStateService,
	CollectionItemStateService,
	User,
	UserStateService,
} from '@music-collection/api';
import {
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

/** The layout of the collection page, with nothing left unchosen. */
type CollectionViewChoice = typeof COLLECTION_VIEW_DEFAULTS;

interface ProfilePageState {
	user: User | null;
	/** How the collection page lays the records out. */
	collectionView: CollectionViewChoice;
	/** Album pages open with their sections collapsed. */
	albumCompact: boolean;
	/** The shelving the collector drew, in the order it stands in the room. */
	shelfLayout: ShelfUnitLayout[];
	/** Records on the shelf, so the drawn furniture can be measured against it. */
	collectionSize: number;
	/** Where the collector is, and how much of it the others may see. */
	location: UserLocationSettings;
	isAuthenticated: boolean;
	/** The name waiting for the account to confirm it, if any. */
	pendingName: string | null;
	/** When the account last confirmed a change, for the "Saved" note. */
	savedAt: number | null;
}

const initialState: ProfilePageState = {
	user: null,
	collectionView: COLLECTION_VIEW_DEFAULTS,
	albumCompact: false,
	shelfLayout: NO_SHELF_LAYOUT.units,
	collectionSize: 0,
	location: NO_LOCATION,
	isAuthenticated: false,
	pendingName: null,
	savedAt: null,
};

/**
 * The signed-in user's own page. The account itself is read from the user
 * store; what the profile changes goes back the same way, and is only called
 * saved once the account has it.
 */
export const ProfilePageStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		displayName: computed(() => store.user()?.displayName ?? ''),
		email: computed(() => store.user()?.email ?? ''),
		photoUrl: computed(() => store.user()?.photoURL ?? null),
		saving: computed(() => store.pendingName() !== null),
		/** What the drawn furniture holds, against what it has to hold. */
		shelfRoom: computed(() => {
			const units = store.shelfLayout();
			const { compartments, records } = shelfCapacity(
				units,
				SHELF_CUBBY_SIZE
			);

			return {
				units: units.length,
				compartments,
				records,
				/** Records that would have nowhere to stand. */
				short: Math.max(0, store.collectionSize() - records),
				full: units.length >= SHELF_LIMITS.maxUnits,
			};
		}),
		initials: computed(() => {
			const name = store.user()?.displayName || store.user()?.email || '';

			return name
				.split(/[\s@.]+/)
				.filter(Boolean)
				.slice(0, 2)
				.map((part) => part[0])
				.join('')
				.toUpperCase();
		}),
	})),
	withMethods(
		(
			store,
			authentication = inject(AuthenticationStateService),
			users = inject(UserStateService),
			settings = inject(UserSettingsEffect),
			locations = inject(UserLocationEffect)
		) => ({
			/**
			 * Follows the account: the signed-in user, and then the same user
			 * in the user store, which is what a change lands in.
			 */
			load: rxMethod<void>(
				pipe(
					switchMap(() =>
						combineLatest([
							authentication.selectIsAuthenticated$(),
							authentication.selectAuthenticatedUser$(),
						])
					),
					switchMap(([isAuthenticated, authenticated]) =>
						isAuthenticated && authenticated?.uid
							? users
									.selectEntityById$(authenticated.uid)
									.pipe(
										map((stored) => stored ?? authenticated)
									)
							: of(null)
					),
					tap((user) => {
						const confirmed =
							!!store.pendingName() &&
							user?.displayName === store.pendingName();

						patchState(store, {
							user,
							isAuthenticated: !!user,
							pendingName: confirmed ? null : store.pendingName(),
							savedAt: confirmed ? Date.now() : store.savedAt(),
						});

						// The name is shown in the top bar as well; it comes
						// from the sign-in state, which the write leaves be.
						if (confirmed && user) {
							authentication.dispatchAuthenticated(user);

							// A pin that carries the name has the old one on
							// it until it is published again.
							if (store.location().level === 'profile') {
								locations
									.save(store.location(), user)
									.catch((error) => {
										console.error(
											'Shared location not saved',
											error
										);
									});
							}
						}
					})
				)
			),

			/** The layouts kept for the user, and any later change to them. */
			loadViews: rxMethod<void>(
				pipe(
					switchMap(() =>
						combineLatest([
							settings.value$(COLLECTION_VIEW_SETTING),
							settings.value$(ALBUM_VIEW_SETTING),
						])
					),
					tap(([collection, album]) =>
						patchState(store, {
							collectionView: {
								sort:
									collection.sort ??
									COLLECTION_VIEW_DEFAULTS.sort,
								group:
									collection.group ??
									COLLECTION_VIEW_DEFAULTS.group,
								view:
									collection.view ??
									COLLECTION_VIEW_DEFAULTS.view,
							},
							albumCompact: album.compact ?? false,
						})
					)
				)
			),

			setCollectionView(changes: Partial<CollectionViewChoice>): void {
				const collectionView = {
					...store.collectionView(),
					...changes,
				};

				patchState(store, { collectionView });
				settings
					.save(COLLECTION_VIEW_SETTING, collectionView)
					.catch((error) => {
						console.error('Collection view not saved', error);
					});
			},

			/** What the user told us about where they are. */
			loadLocation: rxMethod<void>(
				pipe(
					switchMap(() => locations.settings$()),
					tap((location) => patchState(store, { location }))
				)
			),

			/**
			 * Changes the sharing, and republishes right away: the level is
			 * a consent, so lowering it has to take effect at once.
			 */
			setLocation(changes: Partial<UserLocationSettings>): void {
				const user = store.user();
				const location = { ...store.location(), ...changes };

				patchState(store, { location });

				if (!user?.uid) {
					return;
				}

				locations.save(location, user).catch((error) => {
					console.error('Shared location not saved', error);
				});
			},

			setAlbumCompact(compact: boolean): void {
				patchState(store, { albumCompact: compact });
				settings
					.save(ALBUM_VIEW_SETTING, { compact })
					.catch((error) => {
						console.error('Album view not saved', error);
					});
			},

			saveDisplayName(displayName: string): void {
				const user = store.user();
				const name = displayName.trim();

				if (!user?.uid || !name || name === user.displayName) {
					return;
				}

				patchState(store, { pendingName: name, savedAt: null });
				users.dispatchUpdateEntityAction({
					...user,
					displayName: name,
				});
			},

			login(): void {
				authentication.dispatchLogin();
			},
		})
	),
	withMethods(
		(
			store,
			authentication = inject(AuthenticationStateService),
			settings = inject(UserSettingsEffect),
			collectionItems = inject(CollectionItemStateService)
		) => {
			/** Keeps the drawn furniture, and writes it back to the account. */
			const keep = (units: ShelfUnitLayout[]): void => {
				patchState(store, { shelfLayout: units });
				settings
					.save(SHELF_LAYOUT_SETTING, { units })
					.catch((error) => {
						console.error('Shelf layout not saved', error);
					});
			};

			const redraw = (
				id: string,
				change: (unit: ShelfUnitLayout) => ShelfUnitLayout
			): void =>
				keep(
					store
						.shelfLayout()
						.map((unit) => (unit.id === id ? change(unit) : unit))
				);

			return {
				/** The furniture kept for the user, and any later change. */
				loadShelfLayout: rxMethod<void>(
					pipe(
						switchMap(() => settings.value$(SHELF_LAYOUT_SETTING)),
						tap(({ units }) =>
							patchState(store, { shelfLayout: units })
						)
					)
				),

				/**
				 * How many records the drawn furniture has to hold. Only ever
				 * asked for once there is an account to ask about — the shelf
				 * belongs to the signed-in collector.
				 */
				loadCollectionSize: rxMethod<void>(
					pipe(
						switchMap(() =>
							authentication.selectIsAuthenticated$()
						),
						switchMap((isAuthenticated) =>
							isAuthenticated
								? collectionItems.selectLoadedEntities$()
								: of([])
						),
						tap((items) =>
							patchState(store, { collectionSize: items.length })
						)
					)
				),

				/**
				 * Puts another unit in the room, drawn like the one before it —
				 * a collector who has two of the same shelf usually has three.
				 */
				addShelf(): void {
					const units = store.shelfLayout();

					if (units.length >= SHELF_LIMITS.maxUnits) {
						return;
					}

					const last = units[units.length - 1];

					keep([
						...units,
						{
							id: crypto.randomUUID(),
							name: `Shelf ${units.length + 1}`,
							rows: last?.rows ?? DEFAULT_SHELF.rows,
							columns: last?.columns ?? DEFAULT_SHELF.columns,
						},
					]);
				},

				removeShelf(id: string): void {
					keep(store.shelfLayout().filter((unit) => unit.id !== id));
				},

				renameShelf(id: string, name: string): void {
					redraw(id, (unit) => ({
						...unit,
						name: name.trim().slice(0, SHELF_LIMITS.maxNameLength),
					}));
				},

				/** Redraws a unit. A side is kept to what a shelf can be. */
				resizeShelf(
					id: string,
					size: { rows?: number; columns?: number }
				): void {
					redraw(id, (unit) => ({
						...unit,
						rows: clampShelfSide(size.rows ?? unit.rows),
						columns: clampShelfSide(size.columns ?? unit.columns),
					}));
				},

				/**
				 * Moves a unit along the room. The order is the order records
				 * are filed into the furniture, so it is worth getting right.
				 */
				moveShelf(id: string, step: -1 | 1): void {
					const units = [...store.shelfLayout()];
					const from = units.findIndex((unit) => unit.id === id);
					const to = from + step;

					if (from < 0 || to < 0 || to >= units.length) {
						return;
					}

					units.splice(to, 0, ...units.splice(from, 1));
					keep(units);
				},

				/** Empties the room; the shelf goes back to one open wall. */
				clearShelves(): void {
					keep([]);
				},
			};
		}
	),
	/**
	 * Being measured is a consent like the shared location: the collector may
	 * take it back here, and it has to stop the moment they do. The answer
	 * itself is not copied into this store — the measurement reads the same
	 * signal, and two copies of a consent is one too many.
	 */
	withComputed(() => {
		const consent = inject(MeasurementConsentService);

		return {
			measurement: computed(() => consent.consented() === true),
		};
	}),
	withMethods(() => {
		const consent = inject(MeasurementConsentService);

		return {
			setMeasurement(allowed: boolean): void {
				consent.decide(allowed);
			},
		};
	}),
	withHooks({
		onInit(store) {
			store.load(of(undefined));
			store.loadViews(of(undefined));
			store.loadShelfLayout(of(undefined));
			store.loadCollectionSize(of(undefined));
			store.loadLocation(of(undefined));
		},
	})
);
