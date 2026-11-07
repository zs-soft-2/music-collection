import { BehaviorSubject, NEVER, Subject, of, throwError } from 'rxjs';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, convertToParamMap } from '@angular/router';
import {
	AlbumEntity,
	AlbumStateService,
	ArtistEntity,
	ArtistStateService,
	AuthenticationStateService,
	CollectionItemEntity,
	CollectionItemPermissionsService,
	CollectionItemStateService,
	DiscogsVersion,
	ReleaseEntity,
	ReleaseRequest,
	ReleaseStateService,
	RoleNames,
	ScanCandidate,
	TrackEntity,
	WishlistItemEntity,
	WishlistItemPermissionsService,
	WishlistItemStateService,
} from '@music-collection/api';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import {
	MusicCollectionEffect,
	MusicCollectionStanding,
} from '@music-collection/domain/music-collection/core';
import { NgxPermissionsService } from 'ngx-permissions';

import { AlbumDetailsEffect } from '../../data/album-details';
import { CopySerialEffect, CopySerialTakenError } from '../../data/copy-serial';
import { PlayLogEffect, PlayLogEntry } from '../../data/play-log';
import {
	AlbumRating,
	AlbumRatingSummary,
	RatingEffect,
} from '../../data/rating';
import { UserSettingsEffect } from '../../data/user-settings';
import { PhotoScanEffect, PreparedPhoto } from '../../data/photo-scan';
import { ReleaseRequestEffect } from '../../data/release-request';
import { NowPlaying, PlayRequest, PlayerStore } from '../../shared/player';
import { SHELF_LAYOUT_SETTING } from '../collection/shelf-layout.setting';
import { ALBUM_VIEW_SETTING } from './album-view.setting';
import { AlbumPageStore } from './album-page.store';

/*
 * Characterization of the album page store: what the page sees and what it
 * sets off, with every collaborator faked at its edge. Written before the
 * store was split up, and meant to stay unchanged through it.
 */

const album = (fields: Partial<AlbumEntity> = {}): AlbumEntity =>
	({
		uid: 'al1',
		name: 'Bonded by Blood',
		year: new Date(Date.UTC(1985, 3, 1)),
		artist: { uid: 'ar1', name: 'Exodus' },
		discogs: { masterId: 501 },
		coverImage: null,
		...fields,
	}) as unknown as AlbumEntity;

const artist = (fields: Partial<ArtistEntity> = {}): ArtistEntity =>
	({ uid: 'ar1', name: 'Exodus', ...fields }) as unknown as ArtistEntity;

const release = (fields: Partial<ReleaseEntity> = {}): ReleaseEntity =>
	({
		uid: 'rel1',
		name: 'Bonded by Blood',
		media: 'vinyl',
		album: { uid: 'al1', name: 'Bonded by Blood' },
		artist: { uid: 'ar1', name: 'Exodus' },
		...fields,
	}) as unknown as ReleaseEntity;

const item = (
	fields: Partial<CollectionItemEntity> = {}
): CollectionItemEntity =>
	({
		uid: 'ci1',
		userId: 'u1',
		date: 1,
		release: release(),
		...fields,
	}) as unknown as CollectionItemEntity;

const track = (uid: string, index: number): TrackEntity =>
	({
		uid,
		name: `Track ${index}`,
		index,
		album: { uid: 'al1' },
	}) as unknown as TrackEntity;

const rating = (fields: Partial<AlbumRating> = {}): AlbumRating => ({
	uid: 'al1',
	albumId: 'al1',
	albumTitle: 'Bonded by Blood',
	artistName: 'Exodus',
	artistId: 'ar1',
	stars: 4,
	note: 'Ferocious.',
	ratedAt: 1,
	...fields,
});

const summary = (count: number, average = 4.2): AlbumRatingSummary => ({
	albumId: 'al1',
	count,
	average,
	histogram: [0, 0, 0, 0, 0],
	updatedAt: 1,
});

const request = (fields: Partial<ReleaseRequest> = {}): ReleaseRequest =>
	({
		uid: 'rq1',
		userId: 'u1',
		album: { uid: 'al1', name: 'Bonded by Blood' },
		status: 'pending',
		discogsReleaseId: 9001,
		createdAt: 1,
		...fields,
	}) as unknown as ReleaseRequest;

const version = (id: number): DiscogsVersion =>
	({
		id,
		majorFormats: ['Vinyl'],
		format: 'LP',
		label: 'Combat',
		catno: 'MX 8015',
		country: 'US',
		year: 1985,
		thumbUrl: null,
	}) as unknown as DiscogsVersion;

const candidate = (discogsReleaseId: number | null): ScanCandidate =>
	({
		discogsReleaseId,
		discogsMasterId: 501,
		title: 'Exodus - Bonded by Blood',
		artistName: 'Exodus',
		albumName: 'Bonded by Blood',
		formats: ['Vinyl'],
		label: 'Combat',
		catno: 'MX 8015',
		country: 'US',
		year: 1985,
		thumbUrl: null,
		match: 'catno',
	}) as unknown as ScanCandidate;

const photo = (previewUrl = 'blob:one'): PreparedPhoto =>
	({
		data: 'AAAA',
		mimeType: 'image/jpeg',
		blob: new Blob(),
		previewUrl,
	}) as unknown as PreparedPhoto;

const flush = (): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, 0));

type Mocks<K extends string> = Record<K, jest.Mock>;

interface Fakes {
	paramMap: BehaviorSubject<ParamMap>;
	queryParamMap: BehaviorSubject<ParamMap>;
	albums: BehaviorSubject<AlbumEntity[]>;
	artists: BehaviorSubject<ArtistEntity[]>;
	catalog: BehaviorSubject<ReleaseEntity[]>;
	owned: BehaviorSubject<CollectionItemEntity[]>;
	disposed: BehaviorSubject<CollectionItemEntity[]>;
	adding: BehaviorSubject<boolean>;
	itemError: BehaviorSubject<string | null>;
	placing: BehaviorSubject<boolean>;
	disposal: BehaviorSubject<{ disposing: boolean; error: string | null }>;
	wishlist: BehaviorSubject<WishlistItemEntity[]>;
	wishing: BehaviorSubject<boolean>;
	wishError: BehaviorSubject<string | null>;
	user: BehaviorSubject<{ uid: string; displayName: string } | null>;
	permissions: BehaviorSubject<Record<string, unknown>>;
	ratings: BehaviorSubject<AlbumRating[]>;
	shelf: BehaviorSubject<{ units: unknown[] }>;
	view: BehaviorSubject<{ compact: boolean | null }>;
	now: ReturnType<typeof signal<NowPlaying | null>>;
	pagePlayable: ReturnType<typeof signal<boolean>>;
	albumState: {
		selectEntities$: jest.Mock;
		dispatchListEntitiesAction: jest.Mock;
	};
	artistState: {
		selectEntities$: jest.Mock;
		dispatchListEntitiesAction: jest.Mock;
	};
	releaseState: {
		selectEntities$: jest.Mock;
		dispatchListEntitiesAction: jest.Mock;
	};
	itemState: Mocks<
		| 'selectLoadedEntities$'
		| 'selectLoadedDisposedEntities$'
		| 'selectAdding$'
		| 'selectError$'
		| 'selectPlacing$'
		| 'selectDisposalStatus$'
		| 'dispatchAddEntityAction'
		| 'dispatchPlaceEntityAction'
		| 'dispatchDisposeEntityAction'
		| 'dispatchRestoreEntityAction'
	>;
	wishlistState: Mocks<
		| 'dispatchListOwnEntitiesAction'
		| 'selectEntities$'
		| 'selectAdding$'
		| 'selectError$'
		| 'dispatchAddEntityAction'
	>;
	details: { load$: jest.Mock };
	requests: Mocks<
		| 'listByUser$'
		| 'listDiscogsVersions$'
		| 'request$'
		| 'ensureGenericRelease$'
	>;
	photoScan: { prepare: jest.Mock; identify$: jest.Mock };
	collections: { listStandings$: jest.Mock; loadDefinition$: jest.Mock };
	playLog: { list$: jest.Mock };
	serial: { hold: jest.Mock; release: jest.Mock };
	rating: {
		list$: jest.Mock;
		summary$: jest.Mock;
		rate: jest.Mock;
		clear: jest.Mock;
	};
	settings: { value$: jest.Mock; save: jest.Mock };
	player: Record<string, unknown> & {
		setPage: jest.Mock;
		clearPage: jest.Mock;
		playPageTrack: jest.Mock;
		openStage: jest.Mock;
	};
}

const COLLECTOR = { uid: 'u1', displayName: 'Kirk' };
const MAY_COLLECT = {
	[CollectionItemPermissionsService.createCollectionItemEntity]: {},
	[CollectionItemPermissionsService.updateCollectionItemEntity]: {},
	[WishlistItemPermissionsService.createWishlistItemEntity]: {},
};

function setUp(
	options: {
		albums?: AlbumEntity[];
		tracks?: TrackEntity[];
		owned?: CollectionItemEntity[];
		user?: { uid: string; displayName: string } | null;
		permissions?: Record<string, unknown>;
		query?: Record<string, string>;
		requests?: ReleaseRequest[];
		summaries?: Record<string, AlbumRatingSummary | null>;
		standings?: MusicCollectionStanding[];
		playLog?: PlayLogEntry[];
	} = {}
): { store: InstanceType<typeof AlbumPageStore>; fakes: Fakes } {
	const fakes = {
		paramMap: new BehaviorSubject(convertToParamMap({ albumId: 'al1' })),
		queryParamMap: new BehaviorSubject(
			convertToParamMap(options.query ?? {})
		),
		albums: new BehaviorSubject(options.albums ?? [album()]),
		artists: new BehaviorSubject([artist()]),
		catalog: new BehaviorSubject<ReleaseEntity[]>([release()]),
		owned: new BehaviorSubject(options.owned ?? []),
		disposed: new BehaviorSubject<CollectionItemEntity[]>([]),
		adding: new BehaviorSubject(false),
		itemError: new BehaviorSubject<string | null>(null),
		placing: new BehaviorSubject(false),
		disposal: new BehaviorSubject({
			disposing: false,
			error: null as string | null,
		}),
		wishlist: new BehaviorSubject<WishlistItemEntity[]>([]),
		wishing: new BehaviorSubject(false),
		wishError: new BehaviorSubject<string | null>(null),
		user: new BehaviorSubject(
			options.user === undefined ? COLLECTOR : options.user
		),
		permissions: new BehaviorSubject(options.permissions ?? MAY_COLLECT),
		ratings: new BehaviorSubject<AlbumRating[]>([]),
		shelf: new BehaviorSubject<{ units: unknown[] }>({ units: [] }),
		view: new BehaviorSubject<{ compact: boolean | null }>({
			compact: null,
		}),
		now: signal<NowPlaying | null>(null),
		pagePlayable: signal(false),
	} as Fakes;

	fakes.albumState = {
		selectEntities$: jest.fn(() => fakes.albums),
		dispatchListEntitiesAction: jest.fn(),
	};
	fakes.artistState = {
		selectEntities$: jest.fn(() => fakes.artists),
		dispatchListEntitiesAction: jest.fn(),
	};
	fakes.releaseState = {
		selectEntities$: jest.fn(() => fakes.catalog),
		dispatchListEntitiesAction: jest.fn(),
	};
	fakes.itemState = {
		selectLoadedEntities$: jest.fn(() => fakes.owned),
		selectLoadedDisposedEntities$: jest.fn(() => fakes.disposed),
		selectAdding$: jest.fn(() => fakes.adding),
		selectError$: jest.fn(() => fakes.itemError),
		selectPlacing$: jest.fn(() => fakes.placing),
		selectDisposalStatus$: jest.fn(() => fakes.disposal),
		dispatchAddEntityAction: jest.fn(),
		dispatchPlaceEntityAction: jest.fn(),
		dispatchDisposeEntityAction: jest.fn(),
		dispatchRestoreEntityAction: jest.fn(),
	};
	fakes.wishlistState = {
		dispatchListOwnEntitiesAction: jest.fn(),
		selectEntities$: jest.fn(() => fakes.wishlist),
		selectAdding$: jest.fn(() => fakes.wishing),
		selectError$: jest.fn(() => fakes.wishError),
		dispatchAddEntityAction: jest.fn(),
	};
	fakes.details = {
		load$: jest.fn(() =>
			of({
				tracks: options.tracks ?? [track('t1', 1)],
				contributions: [],
			})
		),
	};
	fakes.requests = {
		listByUser$: jest.fn(() => of(options.requests ?? [])),
		listDiscogsVersions$: jest.fn(() => of([version(9001), version(9002)])),
		request$: jest.fn(() => of(undefined)),
		ensureGenericRelease$: jest.fn(() =>
			of(
				release({
					uid: 'al1~vinyl',
					generic: true,
				} as Partial<ReleaseEntity>)
			)
		),
	};
	fakes.photoScan = {
		prepare: jest.fn(() => Promise.resolve(photo())),
		identify$: jest.fn(() =>
			of({ candidates: [candidate(9002), candidate(null)] })
		),
	};
	fakes.collections = {
		listStandings$: jest.fn(() => of(options.standings ?? [])),
		loadDefinition$: jest.fn((slug: string) =>
			of({ uid: 'c1', slug, name: 'Bay Area Thrash' })
		),
	};
	fakes.playLog = { list$: jest.fn(() => of(options.playLog ?? [])) };
	fakes.serial = {
		hold: jest.fn(() => Promise.resolve()),
		release: jest.fn(() => Promise.resolve()),
	};
	fakes.rating = {
		list$: jest.fn(() => fakes.ratings),
		summary$: jest.fn((albumId: string) =>
			of(options.summaries?.[albumId] ?? null)
		),
		rate: jest.fn(() => Promise.resolve()),
		clear: jest.fn(() => Promise.resolve()),
	};
	fakes.settings = {
		value$: jest.fn((setting) =>
			setting === SHELF_LAYOUT_SETTING
				? fakes.shelf
				: setting === ALBUM_VIEW_SETTING
					? fakes.view
					: NEVER
		),
		save: jest.fn(() => Promise.resolve()),
	};
	fakes.player = {
		now: fakes.now,
		pagePlayable: fakes.pagePlayable,
		setPage: jest.fn(),
		clearPage: jest.fn(),
		playPageTrack: jest.fn(() => Promise.resolve()),
		openStage: jest.fn(),
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			AlbumPageStore,
			{
				provide: ActivatedRoute,
				useValue: {
					paramMap: fakes.paramMap,
					queryParamMap: fakes.queryParamMap,
				},
			},
			{ provide: AlbumStateService, useValue: fakes.albumState },
			{ provide: ArtistStateService, useValue: fakes.artistState },
			{ provide: ReleaseStateService, useValue: fakes.releaseState },
			{ provide: CollectionItemStateService, useValue: fakes.itemState },
			{
				provide: WishlistItemStateService,
				useValue: fakes.wishlistState,
			},
			{
				provide: AuthenticationStateService,
				useValue: { selectAuthenticatedUser$: () => fakes.user },
			},
			{
				provide: NgxPermissionsService,
				useValue: { permissions$: fakes.permissions },
			},
			{ provide: AlbumDetailsEffect, useValue: fakes.details },
			{ provide: ReleaseRequestEffect, useValue: fakes.requests },
			{ provide: PhotoScanEffect, useValue: fakes.photoScan },
			{ provide: MusicCollectionEffect, useValue: fakes.collections },
			{ provide: PlayLogEffect, useValue: fakes.playLog },
			{ provide: CopySerialEffect, useValue: fakes.serial },
			{ provide: RatingEffect, useValue: fakes.rating },
			{ provide: UserSettingsEffect, useValue: fakes.settings },
			{ provide: PlayerStore, useValue: fakes.player },
		],
	});

	const store = TestBed.inject(AlbumPageStore);
	TestBed.tick();

	return { store, fakes };
}

beforeAll(() => {
	// jsdom has no object URLs; the store only lets go of them.
	if (!URL.revokeObjectURL) {
		URL.revokeObjectURL = () => undefined;
	}
});

beforeEach(() => {
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
	// `openPicker` starts the catalog load outside an injection context,
	// which NgRx warns about; the behaviour itself is what is pinned here.
	jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe('AlbumPageStore', () => {
	describe('the album in the route', () => {
		it('follows :albumId and loads its tracklist and credits', () => {
			const { store, fakes } = setUp();

			expect(store.albumId()).toBe('al1');
			expect(fakes.details.load$).toHaveBeenCalledWith('al1');
			expect(store.tracks().map((t) => t.uid)).toEqual(['t1']);
			expect(store.detailsLoading()).toBe(false);
			expect(store.detailsFailed()).toBe(false);
		});

		it('starts over on another album of the same page', () => {
			const { store, fakes } = setUp({
				albums: [
					album(),
					album({ uid: 'al2', name: 'Pleasures of the Flesh' }),
				],
			});
			const pending = new Subject<{
				tracks: TrackEntity[];
				contributions: [];
			}>();

			fakes.details.load$.mockReturnValue(pending);
			fakes.paramMap.next(convertToParamMap({ albumId: 'al2' }));

			expect(store.albumId()).toBe('al2');
			expect(store.tracks()).toEqual([]);
			expect(store.detailsLoading()).toBe(true);
			expect(store.album()?.title).toBe('Pleasures of the Flesh');
		});

		it('says so when the details cannot be read', () => {
			const { store, fakes } = setUp();

			fakes.details.load$.mockReturnValue(
				throwError(() => new Error('denied'))
			);
			fakes.paramMap.next(convertToParamMap({ albumId: 'al1' }));

			expect(store.detailsFailed()).toBe(true);
			expect(store.detailsLoading()).toBe(false);
		});

		it('asks for the catalog while it is empty, and waits for it', () => {
			const { store, fakes } = setUp({ albums: [] });

			expect(
				fakes.albumState.dispatchListEntitiesAction
			).toHaveBeenCalled();
			expect(store.albumsLoading()).toBe(true);
			expect(store.notFound()).toBe(false);

			fakes.albums.next([album()]);

			expect(store.albumsLoading()).toBe(false);
			expect(store.album()?.id).toBe('al1');
		});

		it('is not found once the catalog is in and lacks it', () => {
			const { store } = setUp({ albums: [album({ uid: 'other' })] });

			expect(store.album()).toBeNull();
			expect(store.notFound()).toBe(true);
		});

		it('draws the trail through the band to the album', () => {
			const { store } = setUp();
			const trail = store.trail();

			expect(trail).toHaveLength(3);
			expect(trail[0].link).toBe('/home');
			expect(trail[1]).toEqual({
				label: 'Exodus',
				link: ['/artist', 'ar1'],
			});
			expect(trail[2]).toEqual({ label: 'Bonded by Blood' });
		});

		it('finds the album artist', () => {
			const { store } = setUp();

			expect(store.artist()?.id).toBe('ar1');
		});

		it('names the collection it was opened from', () => {
			const { store, fakes } = setUp({
				query: { from: 'collection:bay-area-thrash' },
			});

			expect(fakes.collections.loadDefinition$).toHaveBeenCalledWith(
				'bay-area-thrash'
			);
			expect(store.backLabel()).toBe('Bay Area Thrash');
		});

		it('says which collections ask for the album', () => {
			const standing = {
				collection: {
					uid: 'c1',
					slug: 'thrash',
					name: 'Thrash',
					badge: null,
				},
				resolved: { albums: [{ albumUid: 'al1' }] },
				progress: {
					owned: 1,
					total: 4,
					percentage: 25,
					completed: false,
					ownedAlbumUids: [],
				},
			} as unknown as MusicCollectionStanding;
			const { store } = setUp({ standings: [standing] });

			expect(store.collections()).toEqual([
				expect.objectContaining({
					slug: 'thrash',
					percentage: 25,
					ownsThisAlbum: false,
				}),
			]);
		});
	});

	describe('the collector', () => {
		it('may collect and wish with the rights to', () => {
			const { store } = setUp();

			expect(store.userId()).toBe('u1');
			expect(store.userName()).toBe('Kirk');
			expect(store.canCollect()).toBe(true);
			expect(store.canWish()).toBe(true);
			expect(store.canManageCopies()).toBe(true);
		});

		it('may do neither signed out, whatever roles are left behind', () => {
			const { store } = setUp({ user: null });

			expect(store.canCollect()).toBe(false);
			expect(store.canWish()).toBe(false);
			expect(store.canRate()).toBe(false);
		});

		it('may do both as an admin', () => {
			const { store } = setUp({ permissions: { [RoleNames.ADMIN]: {} } });

			expect(store.canCollect()).toBe(true);
			expect(store.canWish()).toBe(true);
		});

		it('may do neither without the rights', () => {
			const { store } = setUp({ permissions: {} });

			expect(store.canCollect()).toBe(false);
			expect(store.canWish()).toBe(false);
		});
	});

	describe('the copies', () => {
		it('lists the copies of this album only', () => {
			const { store } = setUp({
				owned: [
					item(),
					item({
						uid: 'ci2',
						release: release({
							uid: 'rel9',
							album: { uid: 'al9', name: 'Other' },
						} as Partial<ReleaseEntity>),
					}),
				],
			});

			expect(store.copies().map((copy) => copy.id)).toEqual(['ci1']);
			expect(store.releasesLoading()).toBe(false);
		});

		it('lists the copies of this album gone from the collection', () => {
			const { store, fakes } = setUp();

			fakes.disposed.next([
				item({
					uid: 'gone',
					disposal: { reason: 'sold', date: 5, note: null },
				} as Partial<CollectionItemEntity>),
			]);

			expect(store.pastCopies()).toEqual([
				expect.objectContaining({
					id: 'gone',
					reason: 'sold',
					disposedAt: 5,
				}),
			]);
		});

		it('offers the pressings of this album, marking the owned one', () => {
			const { store, fakes } = setUp({ owned: [item()] });

			store.openPicker();
			fakes.catalog.next([
				release(),
				release({ uid: 'rel2', media: 'cd' } as Partial<ReleaseEntity>),
				release({
					uid: 'al1~vinyl',
					generic: true,
				} as Partial<ReleaseEntity>),
				release({
					uid: 'rel9',
					album: { uid: 'al9', name: 'Other' },
				} as Partial<ReleaseEntity>),
			]);

			const options = store.releaseOptions();

			expect(options.map((option) => option.id).sort()).toEqual([
				'rel1',
				'rel2',
			]);
			expect(options.find((option) => option.id === 'rel1')).toEqual(
				expect.objectContaining({ owned: true, ownedCopyId: 'ci1' })
			);
		});

		it('knows the media it is owned on without a pressing', () => {
			const { store } = setUp({
				owned: [
					item({
						release: release({
							uid: 'al1~cd',
							media: 'cd',
							generic: true,
						} as Partial<ReleaseEntity>),
					}),
				],
			});

			expect(store.ownedGenericMedia()).toEqual(['cd']);
		});

		it('files a copy only into drawn furniture', () => {
			const { store, fakes } = setUp();

			expect(store.canPlaceCopies()).toBe(false);

			fakes.shelf.next({ units: [{ id: 'unit-1' }] });

			expect(store.canPlaceCopies()).toBe(true);
		});

		it('leaves the copy being placed out of where the others stand', () => {
			const placed = { unitId: 'unit-1', row: 0, position: 1 };
			const { store } = setUp({
				owned: [
					item({
						placement: placed,
					} as Partial<CollectionItemEntity>),
					item({
						uid: 'ci2',
						placement: { unitId: 'unit-1', row: 0, position: 2 },
					} as Partial<CollectionItemEntity>),
				],
			});

			store.openPlacement('ci2');

			expect(store.placingCopy()?.id).toBe('ci2');
			expect(store.filedElsewhere()).toEqual([placed]);
		});

		it('files the copy and closes once the place is saved', () => {
			const { store, fakes } = setUp({ owned: [item()] });

			store.openPlacement('ci1');
			store.placeCopy(null);

			expect(
				fakes.itemState.dispatchPlaceEntityAction
			).toHaveBeenCalledWith(
				expect.objectContaining({ uid: 'ci1' }),
				null
			);

			fakes.placing.next(true);
			expect(store.placing()).toBe(true);
			fakes.placing.next(false);

			expect(store.placingCopyId()).toBeNull();
			expect(store.placeError()).toBeNull();
		});

		it('keeps the placement open when the place is refused', () => {
			const { store, fakes } = setUp({ owned: [item()] });

			store.openPlacement('ci1');
			fakes.placing.next(true);
			fakes.itemError.next('denied');
			fakes.placing.next(false);

			expect(store.placingCopyId()).toBe('ci1');
			expect(store.placeError()).toBe('denied');
		});

		it('lets a copy go through the shared removal', () => {
			const { store, fakes } = setUp({ owned: [item()] });

			store.openRemoval('ci1');
			expect(store.removingCopy()?.id).toBe('ci1');

			store.removeCopy({ reason: 'sold', date: 1, note: null });

			expect(
				fakes.itemState.dispatchDisposeEntityAction
			).toHaveBeenCalledWith(expect.objectContaining({ uid: 'ci1' }), {
				reason: 'sold',
				date: 1,
				note: null,
			});
		});

		it('opens the removal from the picker, closing the picker', () => {
			const { store } = setUp({ owned: [item()] });

			store.openPicker();
			store.removeFromPicker('ci1');

			expect(store.pickerOpen()).toBe(false);
			expect(store.removingCopyId()).toBe('ci1');
		});

		it('takes a copy back only while its release is not owned again', () => {
			const gone = item({ uid: 'gone' });
			const { store, fakes } = setUp({ owned: [item()] });

			fakes.disposed.next([gone]);
			store.restoreCopy('gone');
			expect(
				fakes.itemState.dispatchRestoreEntityAction
			).not.toHaveBeenCalled();

			fakes.owned.next([]);
			store.restoreCopy('gone');
			expect(
				fakes.itemState.dispatchRestoreEntityAction
			).toHaveBeenCalledWith(gone);
		});
	});

	describe('the picker', () => {
		it('loads the catalog the first time it opens, and only then', () => {
			const { store, fakes } = setUp();

			expect(fakes.releaseState.selectEntities$).not.toHaveBeenCalled();
			store.openPicker();
			store.closePicker();
			store.openPicker();

			expect(fakes.releaseState.selectEntities$).toHaveBeenCalledTimes(1);
			expect(store.pickerOpen()).toBe(true);
			expect(store.catalogReleasesLoading()).toBe(false);
		});

		it('opens on the release a photo scan recognised', () => {
			const { store } = setUp({ query: { pick: 'release:rel1' } });

			expect(store.pickerOpen()).toBe(true);
			expect(store.pickedReleaseUid()).toBe('rel1');
			expect(store.pickerView()).toBe('catalog');
		});

		it('opens on the Discogs pressing a photo scan recognised', () => {
			const { store, fakes } = setUp({ query: { pick: 'discogs:9002' } });

			expect(store.pickerOpen()).toBe(true);
			expect(store.pickedDiscogsReleaseId()).toBe(9002);
			expect(store.pickerView()).toBe('discogs');
			// The pick is read before the catalog is, so on first open the
			// master is not known yet and nothing is looked up here.
			expect(fakes.requests.listDiscogsVersions$).not.toHaveBeenCalled();
		});

		it('looks up the pressings for a pick that arrives on an open page', () => {
			const { store, fakes } = setUp();

			fakes.queryParamMap.next(
				convertToParamMap({ pick: 'discogs:9002' })
			);

			expect(store.pickerView()).toBe('discogs');
			expect(fakes.requests.listDiscogsVersions$).toHaveBeenCalledWith(
				501
			);
		});

		it('ignores a pick that names no number', () => {
			const { store } = setUp({ query: { pick: 'discogs:abc' } });

			expect(store.pickedDiscogsReleaseId()).toBeNull();
			expect(store.pickerView()).toBe('catalog');
		});

		it('forgets the pick and the photo when it closes', () => {
			const { store } = setUp({ query: { pick: 'release:rel1' } });

			store.closePicker();

			expect(store.pickerOpen()).toBe(false);
			expect(store.pickedReleaseUid()).toBeNull();
			expect(store.photo()).toBeNull();
			expect(store.photoScanned()).toBe(false);
		});
	});

	describe('Discogs pressings', () => {
		it('looks up the pressings once per master, marking the requested', () => {
			const { store, fakes } = setUp({ requests: [request()] });

			expect(store.discogsMasterId()).toBe(501);
			expect(store.discogsOptions()).toEqual([]);

			store.showDiscogsVersions();
			store.showDiscogsVersions();

			expect(fakes.requests.listDiscogsVersions$).toHaveBeenCalledTimes(
				1
			);
			expect(store.discogsLoading()).toBe(false);
			expect(
				store
					.discogsOptions()
					.map(({ id, requested }) => ({ id, requested }))
			).toEqual([
				{ id: 9001, requested: true },
				{ id: 9002, requested: false },
			]);
		});

		it('says why the lookup failed, and lets it be tried again', () => {
			const { store, fakes } = setUp();

			fakes.requests.listDiscogsVersions$.mockReturnValueOnce(
				throwError(() => ({ code: 'functions/resource-exhausted' }))
			);
			store.showDiscogsVersions();

			expect(store.discogsError()).toBe(
				'Discogs is busy right now. Try again in a minute.'
			);

			store.showDiscogsVersions();

			expect(fakes.requests.listDiscogsVersions$).toHaveBeenCalledTimes(
				2
			);
			expect(store.discogsError()).toBeNull();
		});

		it('splits the requests for this album by status', () => {
			const { store } = setUp({
				requests: [
					request(),
					request({ uid: 'rq2', status: 'rejected' }),
					request({
						uid: 'rq3',
						album: { uid: 'al9' },
					} as Partial<ReleaseRequest>),
				],
			});

			expect(store.pendingRequests().map((view) => view.id)).toEqual([
				'rq1',
			]);
			expect(store.rejectedRequests().map((view) => view.id)).toEqual([
				'rq2',
			]);
		});

		it('sends a release request for the album and closes the picker', () => {
			const { store, fakes } = setUp();

			store.openPicker();
			store.requestRelease({
				discogsReleaseId: 9002,
				pressing: null,
				note: 'Red vinyl',
			});

			expect(fakes.requests.request$).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'u1',
					album: {
						uid: 'al1',
						name: 'Bonded by Blood',
						artistUid: 'ar1',
						artistName: 'Exodus',
					},
					status: 'pending',
					discogsMasterId: 501,
					discogsReleaseId: 9002,
					note: 'Red vinyl',
				})
			);
			expect(store.requesting()).toBe(false);
			expect(store.pickerOpen()).toBe(false);
		});

		it('keeps the picker open when the request is refused', () => {
			const { store, fakes } = setUp();

			fakes.requests.request$.mockReturnValue(
				throwError(() => ({ code: 'permission-denied' }))
			);
			store.openPicker();
			store.requestRelease({
				discogsReleaseId: 9002,
				pressing: null,
				note: null,
			});

			expect(store.pickerOpen()).toBe(true);
			expect(store.requestError).toBeDefined();
			expect(store.requestError()).toBe(
				'You are not allowed to do this.'
			);
		});
	});

	describe('the photo scan', () => {
		it('reads the pressing from a photo, with the album as a hint', async () => {
			const { store, fakes } = setUp();

			store.scanPressingPhoto(new Blob());
			expect(store.photoScanning()).toBe(true);
			await flush();

			expect(fakes.photoScan.identify$).toHaveBeenCalledWith(photo(), {
				name: 'Bonded by Blood',
				artistName: 'Exodus',
			});
			expect(store.photoScanning()).toBe(false);
			expect(store.photoScanned()).toBe(true);
			expect(store.photoPreviewUrl()).toBe('blob:one');
			expect(store.photoOptions().map((option) => option.id)).toEqual([
				9002,
			]);
		});

		it('says so when the image cannot be decoded', async () => {
			const { store, fakes } = setUp();

			fakes.photoScan.prepare.mockReturnValue(
				Promise.reject(new Error('heic'))
			);
			store.scanPressingPhoto(new Blob());
			await flush();

			expect(store.photoError()).toMatch(/^This image could not be read/);
			expect(fakes.photoScan.identify$).not.toHaveBeenCalled();
		});

		it('tells a busy photo reader from Discogs', async () => {
			const { store, fakes } = setUp();

			fakes.photoScan.identify$.mockReturnValue(
				throwError(() => ({
					code: 'functions/resource-exhausted',
					details: { source: 'vision' },
				}))
			);
			store.scanPressingPhoto(new Blob());
			await flush();

			expect(store.photoError()).toBe(
				'The photo reader is busy right now. Try again in a moment.'
			);
		});

		it('sends the same photo again, and nothing without one', async () => {
			const { store, fakes } = setUp();

			store.scanPressingPhoto('again');
			await flush();
			expect(fakes.photoScan.identify$).not.toHaveBeenCalled();

			store.scanPressingPhoto(new Blob());
			await flush();
			store.scanPressingPhoto('again');
			await flush();

			expect(fakes.photoScan.prepare).toHaveBeenCalledTimes(1);
			expect(fakes.photoScan.identify$).toHaveBeenCalledTimes(2);
		});
	});

	describe('adding a copy', () => {
		it('adds a copy of the picked release', async () => {
			const { store, fakes } = setUp();

			store.openPicker();
			await store.addToCollection({
				releaseId: 'rel1',
				serialNumber: '',
				serialTotal: '',
			});

			expect(fakes.serial.hold).not.toHaveBeenCalled();
			expect(
				fakes.itemState.dispatchAddEntityAction
			).toHaveBeenCalledWith(
				expect.objectContaining({
					release: expect.objectContaining({ uid: 'rel1' }),
					userId: 'u1',
					serial: null,
				})
			);
		});

		it('refuses a release already in the collection', async () => {
			const { store, fakes } = setUp({ owned: [item()] });

			store.openPicker();
			await store.addToCollection({
				releaseId: 'rel1',
				serialNumber: '',
				serialTotal: '',
			});

			expect(
				fakes.itemState.dispatchAddEntityAction
			).not.toHaveBeenCalled();
			expect(store.addError()).toBe(
				'This release is already in your collection.'
			);
		});

		it('takes the number before writing a numbered copy', async () => {
			const { store, fakes } = setUp();

			store.openPicker();
			await store.addToCollection({
				releaseId: 'rel1',
				serialNumber: '12',
				serialTotal: '500',
			});

			expect(fakes.serial.hold).toHaveBeenCalledWith(
				'rel1',
				{ number: 12, total: 500 },
				'u1',
				null
			);
			expect(store.claiming()).toBe(false);
			expect(store.claimedSerial()).toEqual({
				releaseId: 'rel1',
				number: 12,
			});
			expect(fakes.itemState.dispatchAddEntityAction).toHaveBeenCalled();
		});

		it('writes nothing when the number is taken', async () => {
			const { store, fakes } = setUp();

			fakes.serial.hold.mockRejectedValue(
				new CopySerialTakenError('mine', 'ci7')
			);
			store.openPicker();
			await store.addToCollection({
				releaseId: 'rel1',
				serialNumber: '12',
				serialTotal: '',
			});

			expect(
				fakes.itemState.dispatchAddEntityAction
			).not.toHaveBeenCalled();
			expect(store.addError()).toBe(
				'You have already registered this number on another copy.'
			);
		});

		it('closes the picker once the copy is saved', async () => {
			const { store, fakes } = setUp();

			store.openPicker();
			await store.addToCollection({
				releaseId: 'rel1',
				serialNumber: '12',
				serialTotal: '',
			});
			fakes.adding.next(true);
			expect(store.adding()).toBe(true);
			fakes.adding.next(false);

			expect(store.pickerOpen()).toBe(false);
			expect(store.claimedSerial()).toBeNull();
			expect(fakes.serial.release).not.toHaveBeenCalled();
		});

		it('gives the number back when the copy is refused', async () => {
			const { store, fakes } = setUp();

			store.openPicker();
			await store.addToCollection({
				releaseId: 'rel1',
				serialNumber: '12',
				serialTotal: '',
			});
			fakes.adding.next(true);
			fakes.itemError.next('denied');
			fakes.adding.next(false);

			expect(store.pickerOpen()).toBe(true);
			expect(store.addError()).toBe('denied');
			expect(fakes.serial.release).toHaveBeenCalledWith('rel1', 12);
		});

		it('adds the album on a medium through its generic release', async () => {
			const { store, fakes } = setUp();

			await store.addGenericCopy('vinyl' as never);

			expect(fakes.requests.ensureGenericRelease$).toHaveBeenCalledWith(
				'ar1',
				'al1',
				'vinyl'
			);
			expect(store.preparingGeneric()).toBe(false);
			expect(
				fakes.itemState.dispatchAddEntityAction
			).toHaveBeenCalledWith(
				expect.objectContaining({
					release: expect.objectContaining({ uid: 'al1~vinyl' }),
					userId: 'u1',
				})
			);
		});

		it('says so when the album has left the catalog', async () => {
			const { store, fakes } = setUp();

			fakes.requests.ensureGenericRelease$.mockReturnValue(
				throwError(() => ({ code: 'functions/not-found' }))
			);
			await store.addGenericCopy('vinyl' as never);

			expect(store.addError()).toBe(
				'This album is no longer in the catalog.'
			);
			expect(
				fakes.itemState.dispatchAddEntityAction
			).not.toHaveBeenCalled();
		});
	});

	describe('the wishlist', () => {
		/**
		 * AC-1 of #79: the wish keeps the entered cover address, because the
		 * wishlist surfaces read this copy and never the album.
		 */
		it('puts the album on the wishlist and closes once it is wanted', () => {
			const { store, fakes } = setUp({
				albums: [album({ coverImageUrl: 'https://a/url.jpg' })],
			});

			expect(
				fakes.wishlistState.dispatchListOwnEntitiesAction
			).toHaveBeenCalled();
			store.openWishlist();
			store.addToWishlist({ medias: [], sourceLink: null } as never);

			expect(
				fakes.wishlistState.dispatchAddEntityAction
			).toHaveBeenCalledWith(
				expect.objectContaining({
					albumReference: {
						coverImage: null,
						coverImageUrl: 'https://a/url.jpg',
						name: 'Bonded by Blood',
						uid: 'al1',
					},
					artistReference: { name: 'Exodus', uid: 'ar1' },
					userReference: { displayName: 'Kirk', uid: 'u1' },
					sourceLink: '',
					isActive: true,
				})
			);

			fakes.wishing.next(true);
			fakes.wishing.next(false);

			expect(store.wishlistOpen()).toBe(false);
		});

		it('keeps the dialog open when the wish is refused', () => {
			const { store, fakes } = setUp();

			store.openWishlist();
			fakes.wishing.next(true);
			fakes.wishError.next('denied');
			fakes.wishing.next(false);

			expect(store.wishlistOpen()).toBe(true);
			expect(store.wishError()).toBe('denied');
		});

		it('knows the album is wanted, and does not want it twice', () => {
			const { store, fakes } = setUp();

			fakes.wishlist.next([
				{
					uid: 'w1',
					userReference: { uid: 'u1' },
					albumReference: { uid: 'al1' },
					isActive: true,
				} as unknown as WishlistItemEntity,
			]);
			store.addToWishlist({ medias: [], sourceLink: null } as never);

			expect(store.wanted()?.uid).toBe('w1');
			expect(
				fakes.wishlistState.dispatchAddEntityAction
			).not.toHaveBeenCalled();
			expect(store.wishError()).toBe(
				'This album is already on your wishlist.'
			);
		});
	});

	describe('the view', () => {
		it('opens in the layout kept for the collector, and keeps a change', () => {
			const { store, fakes } = setUp();

			expect(store.compact()).toBe(false);
			fakes.view.next({ compact: true });
			expect(store.compact()).toBe(true);

			store.toggleCompact();

			expect(store.compact()).toBe(false);
			expect(fakes.settings.save).toHaveBeenCalledWith(
				ALBUM_VIEW_SETTING,
				{
					compact: false,
				}
			);
		});
	});

	describe('more of the band', () => {
		it('offers the six albums nearest in years, in order', () => {
			const others = [1982, 1987, 1989, 1990, 1992, 2004, 2010, 2021].map(
				(year, index) =>
					album({
						uid: `o${index}`,
						name: `Album ${year}`,
						year: new Date(Date.UTC(year, 3, 1)),
					})
			);
			const { store } = setUp({
				albums: [
					album(),
					...others,
					album({
						uid: 'x',
						artist: { uid: 'ar2', name: 'Testament' },
					} as Partial<AlbumEntity>),
				],
			});

			expect(store.moreAlbums().map((other) => other.year)).toEqual([
				1982, 1987, 1989, 1990, 1992, 2004,
			]);
		});
	});

	describe('listening and rating', () => {
		it('counts how often the record went on', () => {
			const { store } = setUp({
				playLog: [
					{ albumId: 'al1', startedAt: 10, completed: true },
					{ albumId: 'al1', startedAt: 20, completed: false },
					{ albumId: 'al9', startedAt: 30, completed: true },
				] as PlayLogEntry[],
			});

			expect(store.listening()).toEqual({
				plays: 2,
				fullPlays: 1,
				lastPlayedAt: 20,
			});
		});

		it('shows the collector their own verdict', () => {
			const { store, fakes } = setUp();

			expect(store.canRate()).toBe(true);
			expect(store.myRating()).toBeNull();

			fakes.ratings.next([
				rating(),
				rating({ uid: 'al9', albumId: 'al9' }),
			]);

			expect(store.myRating()?.stars).toBe(4);
		});

		it('keeps quiet about the community until enough have spoken', () => {
			const { store } = setUp({ summaries: { al1: summary(2) } });

			expect(store.ratingSummary()?.count).toBe(2);
			expect(store.community()).toBeNull();
		});

		it('compares the collector with the community', () => {
			const { store, fakes } = setUp({
				summaries: { al1: summary(5, 3.5) },
			});

			fakes.ratings.next([rating()]);

			expect(store.community()).toEqual({
				average: 3.5,
				count: 5,
				differsBy: 0.5,
			});
		});

		it('follows the album with the community verdict', () => {
			const { store, fakes } = setUp({
				albums: [album(), album({ uid: 'al2' })],
				summaries: { al1: summary(5), al2: null },
			});

			expect(store.ratingSummary()?.albumId).toBe('al1');

			fakes.paramMap.next(convertToParamMap({ albumId: 'al2' }));
			TestBed.tick();

			expect(fakes.rating.summary$).toHaveBeenLastCalledWith('al2');
			expect(store.ratingSummary()).toBeNull();
		});

		it('gives the record its stars, keeping the note', async () => {
			const { store, fakes } = setUp();

			fakes.ratings.next([rating()]);
			await store.rate(5);

			expect(fakes.rating.rate).toHaveBeenCalledWith(
				{
					albumId: 'al1',
					albumTitle: 'Bonded by Blood',
					artistName: 'Exodus',
					artistId: 'ar1',
				},
				{ stars: 5, note: 'Ferocious.' }
			);
			expect(store.ratingWriting()).toBe(false);
		});

		it('writes a note only next to stars', async () => {
			const { store, fakes } = setUp();

			await store.writeRatingNote('Why');
			expect(fakes.rating.rate).not.toHaveBeenCalled();

			fakes.ratings.next([rating()]);
			await store.writeRatingNote('Why');

			expect(fakes.rating.rate).toHaveBeenCalledWith(
				expect.objectContaining({ albumId: 'al1' }),
				{ stars: 4, note: 'Why' }
			);
		});

		it('leaves the record unjudged again', async () => {
			const { store, fakes } = setUp();

			await store.clearRating();

			expect(fakes.rating.clear).toHaveBeenCalledWith('al1');
		});

		it('keeps no verdict signed out', async () => {
			const { store, fakes } = setUp({ user: null });

			await store.rate(3);

			expect(fakes.rating.rate).not.toHaveBeenCalled();
		});

		it('writes one verdict at a time', async () => {
			const { store, fakes } = setUp();
			let finish: () => void = () => undefined;

			fakes.rating.rate.mockReturnValueOnce(
				new Promise<void>((resolve) => (finish = resolve))
			);
			const first = store.rate(3);

			expect(store.ratingWriting()).toBe(true);
			await store.rate(4);
			finish();
			await first;

			expect(fakes.rating.rate).toHaveBeenCalledTimes(1);
			expect(store.ratingWriting()).toBe(false);
		});

		it('says why a verdict was not kept', async () => {
			const { store, fakes } = setUp();

			fakes.rating.rate.mockRejectedValue(new Error('offline'));
			await store.rate(3);

			expect(store.ratingError()).toBe('offline');
			expect(store.ratingWriting()).toBe(false);
		});
	});

	describe('the player', () => {
		it('gets the player ready for the album shown, and lets go on leaving', () => {
			const { fakes } = setUp({
				tracks: [track('t1', 1), track('t2', 2)],
			});
			const page = fakes.player.setPage.mock.lastCall?.[0] as PlayRequest;

			expect(page).toEqual(
				expect.objectContaining({
					context: 'album',
					albumId: 'al1',
					albumTitle: 'Bonded by Blood',
					artistName: 'Exodus',
				})
			);
			expect(page.tracks.map((t) => t.id)).toEqual(['t1', 't2']);

			TestBed.resetTestingModule();

			expect(fakes.player.clearPage).toHaveBeenCalledWith(page);
		});

		it('tells the player there is nothing to play without the album', () => {
			const { fakes } = setUp({ albums: [album({ uid: 'other' })] });

			expect(fakes.player.setPage).toHaveBeenLastCalledWith(null);
		});

		it('marks the track playing only when it is of this album', () => {
			const { store, fakes } = setUp();

			fakes.now.set({ albumId: 'al9', trackId: 't9' } as NowPlaying);
			expect(store.playingTrackId()).toBeNull();

			fakes.now.set({ albumId: 'al1', trackId: 't1' } as NowPlaying);
			expect(store.playingTrackId()).toBe('t1');
		});

		it('has a player to show when the page is playable', () => {
			const { store, fakes } = setUp();

			expect(store.playable()).toBe(false);
			fakes.pagePlayable.set(true);
			expect(store.playable()).toBe(true);
		});

		it('hands the play and the stage to the player', async () => {
			const { store, fakes } = setUp();

			await store.playTrack('t1');
			store.openPlayer();

			expect(fakes.player.playPageTrack).toHaveBeenCalledWith('t1');
			expect(fakes.player.openStage).toHaveBeenCalled();
		});
	});
});
