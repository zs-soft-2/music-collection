import { combineLatest, map, of, pipe, switchMap, tap } from 'rxjs';

import { AvatarEffect, AvatarLook } from '../../data/avatar';
import {
	CollectorProfileDocument,
	CollectorProfileEffect,
	CollectorProfileSettings,
	CollectorProfileSource,
	NO_COLLECTOR_PROFILE,
	PublicCollectorProfile,
	toPublicCollectorProfile,
} from '../../data/collector-profile';
import { DemoTourService } from '../../data/demo-tour';
import {
	COLLECTION_FOLLOWING_SETTING,
	CollectionFollowing,
} from '../../data/collection-following';
import {
	NO_LOCATION,
	UserLocationEffect,
	UserLocationSettings,
	toPublicLocation,
} from '../../data/user-location';
import { MeasurementConsentService } from '../../data/analytics';
import { ExternalPlayerConsentService } from '../../data/external-player';
import {
	PlayLogEffect,
	PlayLogEntry,
	summariseListening,
} from '../../data/play-log';
import { AlbumRating, RatingEffect, summariseRatings } from '../../data/rating';
import { GenreScopeEffect } from '../../data/genre-scope';
import { UserSettingsEffect } from '../../data/user-settings';
import { ALBUM_VIEW_SETTING } from '../album/album-view.setting';
import {
	COLLECTION_VIEW_DEFAULTS,
	COLLECTION_VIEW_SETTING,
} from '../collection/collection-view.setting';
import {
	DEFAULT_SHELF,
	NO_SHELF_LAYOUT,
	SHELF_LAYOUT_SETTING,
	SHELF_LIMITS,
	ShelfCubby,
	ShelfMediaMix,
	ShelfStance,
	ShelfUnitLayout,
	clampCubbyHeight,
	clampCubbyLength,
	clampShelfSide,
	shelfCapacity,
} from '../collection/shelf-layout.setting';

import { DOCUMENT } from '@angular/common';
import { computed, inject } from '@angular/core';
import {
	AuthenticationStateService,
	CollectionItemEntity,
	CollectionItemStateService,
	GENRE_SCOPE_LIMIT,
	GenreEntity,
	User,
	UserStateService,
	WishlistItemEntity,
	WishlistItemStateService,
} from '@music-collection/api';
import { toDescriptions } from '@music-collection/common/engine';
import {
	MusicCollectionEffect,
	MusicCollectionStanding,
} from '@music-collection/domain/music-collection/core';
import { ReleaseView, toReleaseView } from '../../shared/music-ui';
import {
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { tapResponse } from '@ngrx/operators';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

/** The layout of the collection page, with nothing left unchosen. */
type CollectionViewChoice = typeof COLLECTION_VIEW_DEFAULTS;

/**
 * The collection counted by medium, the way a shelf measures it: a copy
 * filed under the box set medium, or only tagged as one, is a box set —
 * that is the slab which has to fit in the compartment.
 */
function countMedia(items: readonly CollectionItemEntity[]): ShelfMediaMix {
	const mix: Record<string, number> = {};

	for (const { release } of items) {
		const media = toDescriptions(release?.formatDescription).includes(
			'box set'
		)
			? 'boxset'
			: (release?.media ?? '');

		mix[media] = (mix[media] ?? 0) + 1;
	}

	return mix;
}

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
	/**
	 * How many copies of each medium there are. What a compartment holds
	 * depends on what goes in it, so the room cannot be measured by a count
	 * alone: five hundred CDs ask for far less shelf than five hundred LPs.
	 */
	mediaMix: ShelfMediaMix;
	/** Where the collector is, and how much of it the others may see. */
	location: UserLocationSettings;
	isAuthenticated: boolean;
	/** The name waiting for the account to confirm it, if any. */
	pendingName: string | null;
	/** When the account last confirmed a change, for the "Saved" note. */
	savedAt: number | null;
	/** The collector's listening log; empty while signed out. */
	playLog: PlayLogEntry[];
	/** What the collector thinks of their records; empty while signed out. */
	ratings: AlbumRating[];
	/** The genres to pick from: the taxonomy an admin has not retired. */
	genres: GenreEntity[];
	/** The genres followed, by slug, as the app is currently running. */
	genreScope: string[];
	/** The genres ticked on the form, which take effect on apply. */
	genreDraft: string[];
	/** Set while the catalog is being rebuilt for a newly chosen scope. */
	genreScopeApplying: boolean;
	/** The character the collector built, or null while they have not. */
	avatar: AvatarLook | null;
	/** Set while the character is being rendered and uploaded. */
	avatarSaving: boolean;
	/** When the account last took a new character, for the "Saved" note. */
	avatarSavedAt: number | null;
	/** Whether the public collector page exists, and what is on it. */
	sharing: CollectorProfileSettings;
	/** The shelf in the shape the public snapshot is built from. */
	profileReleases: ReleaseView[];
	/** Every published collection with this collector's progress on it. */
	standings: MusicCollectionStanding[];
	/** The records still wanted — the list a family buys a present from. */
	wishes: WishlistItemEntity[];
	/** The followed collections the collector lets others see. */
	shownCollections: string[];
	/**
	 * The public page as it actually stands out there, or null while there is
	 * none. This is what the section reports from: a switch says what the
	 * collector asked for, this says what a visitor would find.
	 */
	sharedProfile: CollectorProfileDocument | null;
}

const initialState: ProfilePageState = {
	user: null,
	collectionView: COLLECTION_VIEW_DEFAULTS,
	albumCompact: false,
	shelfLayout: NO_SHELF_LAYOUT.units,
	collectionSize: 0,
	mediaMix: {},
	location: NO_LOCATION,
	isAuthenticated: false,
	pendingName: null,
	savedAt: null,
	playLog: [],
	ratings: [],
	genres: [],
	genreScope: [],
	genreDraft: [],
	genreScopeApplying: false,
	avatar: null,
	avatarSaving: false,
	avatarSavedAt: null,
	sharing: NO_COLLECTOR_PROFILE,
	shownCollections: [],
	profileReleases: [],
	standings: [],
	wishes: [],
	sharedProfile: null,
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
			const room = shelfCapacity(units, store.mediaMix());

			return {
				units: units.length,
				...room,
				/** The drawn length in whole centimetres, as it is shown. */
				lengthCm: Math.round(room.length / 10),
				full: units.length >= SHELF_LIMITS.maxUnits,
			};
		}),
		/** What the collector's listening adds up to. */
		listening: computed(() => summariseListening(store.playLog())),
		/** What they think of their records, and which ones they name first. */
		verdicts: computed(() => summariseRatings(store.ratings())),
		/** Whether the form holds something other than what is running. */
		genreScopeChanged: computed(
			() =>
				[...store.genreDraft()].sort().join(',') !==
				[...store.genreScope()].sort().join(',')
		),
		/** Whether another genre can still be ticked. */
		genreScopeFull: computed(
			() => store.genreDraft().length >= GENRE_SCOPE_LIMIT
		),
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
			locations = inject(UserLocationEffect),
			playLogEffect = inject(PlayLogEffect),
			ratingEffect = inject(RatingEffect),
			avatars = inject(AvatarEffect),
			genreScope = inject(GenreScopeEffect)
		) => ({
			/** The collector's own verdicts; follows sign-in. */
			loadRatings: rxMethod<void>(
				pipe(
					switchMap(() => ratingEffect.list$()),
					tapResponse({
						next: (ratings: AlbumRating[]) =>
							patchState(store, { ratings }),
						error: (error) => console.error(error),
					})
				)
			),
			/** The listening log, which the player writes as records go on. */
			loadPlayLog: rxMethod<void>(
				pipe(
					switchMap(() => playLogEffect.list$()),
					tapResponse({
						next: (playLog: PlayLogEntry[]) =>
							patchState(store, { playLog }),
						error: (error: unknown) => console.error(error),
					})
				)
			),
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

			/** The character the collector built, and any later change. */
			loadAvatar: rxMethod<void>(
				pipe(
					switchMap(() => avatars.look$()),
					tap((avatar) => patchState(store, { avatar }))
				)
			),

			/**
			 * Keeps the character, then points the account at the picture
			 * rendered from it.
			 *
			 * The two are separate on purpose: the choices are the real thing
			 * and are saved first, so a failed upload costs the collector a
			 * picture rather than the character they built. The account is
			 * written the way a new display name is, and the sign-in state is
			 * told as well — that is what the top bar reads.
			 */
			async saveAvatar(look: AvatarLook): Promise<void> {
				const user = store.user();

				if (!user?.uid || store.avatarSaving()) {
					return;
				}

				patchState(store, {
					avatar: look,
					avatarSaving: true,
					avatarSavedAt: null,
				});

				try {
					const photoURL = await avatars.save(look, user.uid);
					const updated = { ...user, photoURL };

					users.dispatchUpdateEntityAction(updated);
					authentication.dispatchAuthenticated(updated);
					patchState(store, { avatarSavedAt: Date.now() });
				} catch (error) {
					console.error('Avatar not saved', error);
				} finally {
					patchState(store, { avatarSaving: false });
				}
			},

			/** Takes the character away, and the picture with it. */
			async clearAvatar(): Promise<void> {
				const user = store.user();

				if (!user?.uid || store.avatarSaving()) {
					return;
				}

				patchState(store, {
					avatar: null,
					avatarSaving: true,
					avatarSavedAt: null,
				});

				try {
					await avatars.clear(user.uid);

					const updated = { ...user, photoURL: null };

					users.dispatchUpdateEntityAction(updated);
					authentication.dispatchAuthenticated(updated);
				} catch (error) {
					console.error('Avatar not removed', error);
				} finally {
					patchState(store, { avatarSaving: false });
				}
			},

			/**
			 * The genres to pick from, and the ones being followed now.
			 *
			 * The running scope is read from the scope service rather than
			 * from the setting: that is what the sync layer actually went
			 * by when this page loaded, and the form has to offer to change
			 * *that* — an account value that has not taken effect yet would
			 * show the collector a choice they are not living with.
			 */
			loadGenres: rxMethod<void>(
				pipe(
					switchMap(() => genreScope.genres$()),
					tap((genres: GenreEntity[]) => {
						const slugs = genreScope.slugs();

						patchState(store, {
							genres,
							genreScope: slugs,
							// Only while untouched: a list arriving late must
							// not wipe what the collector has just ticked.
							genreDraft: store.genreScopeChanged()
								? store.genreDraft()
								: slugs,
						});
					})
				)
			),

			/**
			 * Ticks a genre off or on, up to the limit. Nothing is written
			 * and nothing is rebuilt until `applyGenreScope`: the change
			 * costs a reload, so it waits for the collector to mean it.
			 */
			toggleGenre(slug: string): void {
				const draft = store.genreDraft();
				const next = draft.includes(slug)
					? draft.filter((chosen) => chosen !== slug)
					: [...draft, slug].slice(-GENRE_SCOPE_LIMIT);

				patchState(store, { genreDraft: next });
			},

			/** Back to following the whole catalog, once applied. */
			clearGenreDraft(): void {
				patchState(store, { genreDraft: [] });
			},

			/**
			 * Makes the ticked genres the ones this browser follows. The
			 * page reloads on success, so nothing here has to put the state
			 * back — only a failure does.
			 */
			async applyGenreScope(): Promise<void> {
				if (store.genreScopeApplying() || !store.genreScopeChanged()) {
					return;
				}

				patchState(store, { genreScopeApplying: true });

				try {
					await genreScope.apply(store.genreDraft());
				} catch (error) {
					console.error('Genre scope not applied', error);
					patchState(store, { genreScopeApplying: false });
				}
			},

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
							patchState(store, {
								collectionSize: items.length,
								mediaMix: countMedia(items),
							})
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
							cubby: last?.cubby ?? DEFAULT_SHELF.cubby,
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
				 * Remeasures a unit's compartments. The height says what may
				 * go in them, the length how much, and the stance how the
				 * copies lie — all three are one compartment, so they are
				 * changed through one door.
				 */
				measureShelf(id: string, cubby: Partial<ShelfCubby>): void {
					redraw(id, (unit) => ({
						...unit,
						cubby: {
							height: clampCubbyHeight(
								cubby.height ?? unit.cubby.height
							),
							length: clampCubbyLength(
								cubby.length ?? unit.cubby.length
							),
							stance: cubby.stance ?? unit.cubby.stance,
						},
					}));
				},

				/** Stands the copies up in a compartment, or lays them down. */
				turnShelf(id: string, stance: ShelfStance): void {
					redraw(id, (unit) => ({
						...unit,
						cubby: { ...unit.cubby, stance },
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
	 * The picture rendered from the collector's character, where that is what
	 * the account carries. The profile shows it rather than stacking the
	 * character's layers again: it is loaded already — the account section
	 * above shows the same file — and a full-length figure at six rems would
	 * cost a hundred kilobytes to say what this says for nothing.
	 */
	withComputed((store) => {
		const avatars = inject(AvatarEffect);

		return {
			avatarPicture: computed(() => {
				const url = store.user()?.photoURL ?? null;

				return url && avatars.isRenderedPicture(url) ? url : null;
			}),
		};
	}),
	/**
	 * The two consents the app asks for, next to the shared location, which
	 * is the third: the collector may take either back here, and it has to
	 * take effect the moment they do. Neither answer is copied into this store
	 * — whatever acts on them reads the same signal, and two copies of a
	 * consent is one too many.
	 */
	withComputed(() => {
		const measurement = inject(MeasurementConsentService);
		const players = inject(ExternalPlayerConsentService);

		return {
			measurement: computed(() => measurement.consented() === true),
			externalPlayers: computed(() => players.consented() === true),
		};
	}),
	withMethods(() => {
		const measurement = inject(MeasurementConsentService);
		const players = inject(ExternalPlayerConsentService);

		return {
			setMeasurement(allowed: boolean): void {
				measurement.decide(allowed);
			},
			setExternalPlayers(allowed: boolean): void {
				players.decide(allowed);
			},
		};
	}),
	/**
	 * The guided tour. Not a copy of the switch either: the same service the
	 * shell reads to decide whether the launcher is on the page is the one
	 * answering here, so switching it off takes the launcher away at once.
	 */
	withComputed(() => {
		const tour = inject(DemoTourService);

		return {
			demoTour: computed(() => tour.wanted()),
		};
	}),
	withMethods(() => {
		const tour = inject(DemoTourService);

		return {
			setDemoTour(wanted: boolean): void {
				tour.decide(wanted);
			},
			/** Walks the page the collector is standing on — this one. */
			startDemoTour(): void {
				tour.start();
			},
		};
	}),
	/**
	 * The public collector page: what it would say, and the address of it.
	 *
	 * The preview is built with the sharing turned on whatever the switch
	 * says, so the collector sees what they would publish before they publish
	 * it — and it goes through the very same mapper that writes the document,
	 * because a preview that guessed would be worth nothing.
	 */
	withComputed((store) => {
		const document = inject(DOCUMENT);

		const owner = computed(() => {
			const user = store.user();

			return user?.uid
				? {
						uid: user.uid,
						displayName: user.displayName,
						photoURL: user.photoURL,
					}
				: null;
		});

		const profileSource = computed<CollectorProfileSource | null>(() => {
			const current = owner();

			return current
				? {
						settings: store.sharing(),
						owner: current,
						releases: store.profileReleases(),
						standings: store.standings(),
						wishes: store.wishes(),
						ratings: store.ratings(),
						// The place is the map's consent, taken as it stands:
						// this page may carry it, never widen it.
						location: toPublicLocation(store.location(), current),
						now: Date.now(),
						shownCollections: store.shownCollections(),
					}
				: null;
		});

		return {
			profileSource,
			profilePreview: computed<PublicCollectorProfile | null>(() => {
				const source = profileSource();

				return source
					? toPublicCollectorProfile({
							...source,
							settings: {
								shared: true,
								shareWishlist: store.sharing().shareWishlist,
								shareRatings: store.sharing().shareRatings,
							},
						})
					: null;
			}),
			/** The address to pass on; empty while there is no account. */
			profileLink: computed(() => {
				const uid = owner()?.uid;

				return uid
					? `${document.location?.origin ?? ''}/collector/${uid}`
					: '';
			}),
			/** The same page inside the app, for the look-at-it link. */
			profilePath: computed(() => {
				const uid = owner()?.uid;

				return uid ? ['/collector', uid] : null;
			}),
			/** When the page out there was last put together. */
			profileUpdatedAt: computed(
				() => store.sharedProfile()?.updatedAt ?? null
			),
			/** Whether a visitor would find a page at that address right now. */
			profilePublished: computed(() => !!store.sharedProfile()),
		};
	}),
	withMethods(
		(
			store,
			collectorProfiles = inject(CollectorProfileEffect),
			collectionItems = inject(CollectionItemStateService),
			collections = inject(MusicCollectionEffect),
			wishlistItems = inject(WishlistItemStateService),
			authentication = inject(AuthenticationStateService),
			userSettings = inject(UserSettingsEffect)
		) => {
			return {
				/**
				 * Which collections the collector shows as theirs. The page
				 * lists these as what they are after, so the preview has to
				 * read the same pick the effect publishes.
				 */
				loadShownCollections: rxMethod<void>(
					pipe(
						switchMap(() =>
							userSettings.value$(COLLECTION_FOLLOWING_SETTING)
						),
						tap(({ shown }: CollectionFollowing) =>
							patchState(store, { shownCollections: shown })
						)
					)
				),

				/** The choice: whether there is a public page, and the wishlist on it. */
				loadSharing: rxMethod<void>(
					pipe(
						switchMap(() => collectorProfiles.settings$()),
						tap((sharing) => patchState(store, { sharing }))
					)
				),

				/**
				 * The shelf in the shape the window is cut from. The copies
				 * are loaded for the furniture anyway, so this costs a map.
				 */
				loadProfileShelf: rxMethod<void>(
					pipe(
						switchMap(() =>
							authentication.selectIsAuthenticated$()
						),
						switchMap((isAuthenticated) =>
							isAuthenticated
								? collectionItems.selectLoadedEntities$()
								: of([])
						),
						tap((items: CollectionItemEntity[]) =>
							patchState(store, {
								profileReleases: items.map(toReleaseView),
							})
						)
					)
				),

				/**
				 * The badges and the points. Resolving the collections is a
				 * pass over the cached catalog, and it is what the section
				 * reports — "four badges, 1240 points" — so the collector is
				 * not asked to publish a page they cannot see.
				 */
				loadStandings: rxMethod<void>(
					pipe(
						switchMap(() =>
							authentication.selectIsAuthenticated$()
						),
						switchMap((isAuthenticated) =>
							isAuthenticated
								? collections.listStandings$()
								: of([])
						),
						tapResponse({
							next: (standings: MusicCollectionStanding[]) =>
								patchState(store, { standings }),
							error: (error) => {
								console.error(
									'Collections not resolved',
									error
								);
							},
						})
					)
				),

				/**
				 * The wishlist, for the count next to the switch and for the
				 * page. The loaded list rather than the plain one: an empty
				 * store would otherwise report "wants nothing" for as long as
				 * the query takes.
				 */
				loadWishes: rxMethod<void>(
					pipe(
						switchMap(() =>
							authentication.selectIsAuthenticated$()
						),
						switchMap((isAuthenticated) =>
							isAuthenticated
								? wishlistItems.selectLoadedOwnEntities$()
								: of([])
						),
						tapResponse({
							next: (wishes: WishlistItemEntity[]) =>
								patchState(store, { wishes }),
							error: (error) => {
								console.error('Wishlist not loaded', error);
							},
						})
					)
				),

				/**
				 * The page as it stands out there. Watched rather than
				 * assumed: if a write were refused, the section would still
				 * be claiming the page exists — this way it reports what a
				 * visitor would actually find.
				 */
				loadSharedProfile: rxMethod<void>(
					pipe(
						switchMap(() =>
							authentication.selectAuthenticatedUser$()
						),
						switchMap((user) =>
							user?.uid
								? collectorProfiles.profile$(user.uid)
								: of(null)
						),
						tap((sharedProfile) =>
							patchState(store, { sharedProfile })
						)
					)
				),

				/**
				 * Changes the sharing and publishes — or withdraws — right
				 * away: a consent taken back has to take effect while the
				 * collector is still looking at the switch.
				 */
				/** Starts the effect's own watch on the shelf; idempotent. */
				watchProfile(): void {
					collectorProfiles.watch();
				},

				setSharing(changes: Partial<CollectorProfileSettings>): void {
					const sharing = { ...store.sharing(), ...changes };
					const source = store.profileSource();

					patchState(store, { sharing });

					if (!source) {
						return;
					}

					collectorProfiles
						.save(sharing, { ...source, settings: sharing })
						.catch((error) => {
							console.error('Collector profile not saved', error);
						});
				},
			};
		}
	),
	withHooks({
		onInit(store) {
			store.load(of(undefined));
			store.loadViews(of(undefined));
			store.loadShelfLayout(of(undefined));
			store.loadCollectionSize(of(undefined));
			store.loadLocation(of(undefined));
			store.loadPlayLog(of(undefined));
			store.loadRatings(of(undefined));
			store.loadAvatar(of(undefined));
			store.loadGenres(of(undefined));
			store.loadSharing(of(undefined));
			store.loadShownCollections(of(undefined));
			// The effect follows the shelf from here on, whatever page the
			// collector files a record from.
			store.watchProfile();
			store.loadProfileShelf(of(undefined));
			store.loadStandings(of(undefined));
			store.loadWishes(of(undefined));
			store.loadSharedProfile(of(undefined));
		},
	})
);
