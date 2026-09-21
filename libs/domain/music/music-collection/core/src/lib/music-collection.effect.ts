import {
	Observable,
	combineLatest,
	filter,
	map,
	of,
	switchMap,
	tap,
} from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { performanceLog } from '@music-collection/common/engine';
import {
	AlbumStateService,
	ArtistStateService,
	CollectionItemStateService,
} from '@music-collection/api';
import {
	CreateMusicCollectionResult,
	MusicCollectionCatalog,
	MusicCollectionCriteria,
	MusicCollectionDraft,
	MusicCollectionEntity,
	MusicCollectionProgress,
	MusicCollectionRepository,
	MusicCollectionScore,
	ResolvedMusicCollection,
	UpdateMusicCollectionResult,
} from '@music-collection/domain/music-collection/api';
import {
	compareWithCollection,
	resolveMusicCollection,
	scoreCollection,
} from '@music-collection/domain/music-collection/engine';

import {
	toCatalogAlbum,
	toCatalogArtist,
	toOwnedCopies,
} from './music-collection.mapper';

/** A collection with where the signed-in collector stands on it. */
export interface MusicCollectionStanding {
	collection: MusicCollectionEntity;
	resolved: ResolvedMusicCollection;
	progress: MusicCollectionProgress;
	/** What it is worth, and what the collector has earned of that. */
	score: MusicCollectionScore;
}

/**
 * A definition with what it resolves to, without anyone's progress: what the
 * admin needs to see, where the question is what the rule catches.
 */
export interface MusicCollectionResolution {
	collection: MusicCollectionEntity;
	resolved: ResolvedMusicCollection;
}

/** The uid a criteria object is resolved under while it is still being written. */
const PREVIEW_UID = 'preview';

/**
 * Whether any of these rules asks about who played on a record. The credits
 * outnumber the albums by far, so they are only fetched when a criterion
 * actually reads them.
 */
function wantsCredits(
	collections: readonly { criteria: MusicCollectionCriteria }[]
): boolean {
	return collections.some(({ criteria }) => !!criteria.credits);
}

/** Selects a feature's entities and asks for the list while it is empty. */
function entities$<T>(
	select: () => Observable<T[]>,
	dispatchList: () => void
): Observable<T[]> {
	return select().pipe(
		tap((items) => {
			if (!items?.length) {
				dispatchList();
			}
		}),
		filter((items) => items?.length > 0)
	);
}

/**
 * Abstract collections against the catalog and the collector's shelf.
 *
 * Resolving happens here, on the client, because the catalog is already
 * there: the sync service keeps `album` and `artist` in the local cache, so
 * a collection costs a pass over memory rather than a query. The moment the
 * catalog outgrows that, the same result can come from a precomputed
 * membership without anything above this effect noticing.
 */
@Injectable({ providedIn: 'root' })
export class MusicCollectionEffect {
	private readonly repository = inject(MusicCollectionRepository);
	private readonly albumStateService = inject(AlbumStateService);
	private readonly artistStateService = inject(ArtistStateService);
	private readonly collectionItemStateService = inject(
		CollectionItemStateService
	);

	/** Every published collection with the collector's progress on it. */
	public listStandings$(): Observable<MusicCollectionStanding[]> {
		return combineLatest([
			this.repository.listPublished$(),
			this.collectionItemStateService.selectLoadedEntities$(),
		]).pipe(
			switchMap(([collections, items]) =>
				this.catalog$(wantsCredits(collections)).pipe(
					map((catalog) => {
						const copies = toOwnedCopies(items);

						return collections.map((collection) =>
							this.toStanding(collection, catalog, copies)
						);
					})
				)
			)
		);
	}

	/** One collection by its slug; null while the catalog has no such one. */
	public loadStanding$(
		slug: string
	): Observable<MusicCollectionStanding | null> {
		return combineLatest([
			this.repository.loadBySlug$(slug),
			this.collectionItemStateService.selectLoadedEntities$(),
		]).pipe(
			switchMap(([collection, items]) =>
				this.catalog$(
					wantsCredits(collection ? [collection] : [])
				).pipe(
					map((catalog) =>
						collection
							? this.toStanding(
									collection,
									catalog,
									toOwnedCopies(items)
								)
							: null
					)
				)
			)
		);
	}

	/**
	 * One collection's definition by its slug, without resolving it: what a
	 * page needs when all it asks is the name of the collection it was
	 * opened from. The definitions are cached whole, so this costs nothing.
	 */
	public loadDefinition$(
		slug: string
	): Observable<MusicCollectionEntity | null> {
		return this.repository
			.loadBySlug$(slug)
			.pipe(map((collection) => collection ?? null));
	}

	/** Every definition with what it resolves to, drafts included (admin). */
	public listAllResolutions$(): Observable<MusicCollectionResolution[]> {
		return this.repository.listAll$().pipe(
			switchMap((collections) =>
				this.catalog$(wantsCredits(collections)).pipe(
					map((catalog) => {
						// Every rule against the whole catalog, on the main
						// thread. Timed so it is known whether this too
						// belongs in a worker.
						const run = performanceLog.start(
							'collection.resolveAll',
							{
								collections: collections.length,
								albums: catalog.albums.length,
							}
						);
						const resolutions = collections.map((collection) => ({
							collection,
							resolved: resolveMusicCollection(
								collection,
								catalog
							),
						}));

						run.end();

						return resolutions;
					})
				)
			)
		);
	}

	/** One definition by its uid, with what it resolves to (admin). */
	public loadResolution$(
		uid: string
	): Observable<MusicCollectionResolution | null> {
		return this.repository.loadByUid$(uid).pipe(
			switchMap((collection) =>
				this.catalog$(
					wantsCredits(collection ? [collection] : [])
				).pipe(
					map((catalog) =>
						collection
							? {
									collection,
									resolved: resolveMusicCollection(
										collection,
										catalog
									),
								}
							: null
					)
				)
			)
		);
	}

	/**
	 * What a rule would catch right now, for the editor: the criteria are
	 * resolved without being saved, so the admin sees the records before
	 * anyone earns a badge for them.
	 */
	public preview$(
		criteria: MusicCollectionCriteria
	): Observable<ResolvedMusicCollection> {
		return this.catalog$(wantsCredits([{ criteria }])).pipe(
			map((catalog) =>
				resolveMusicCollection(
					{ uid: PREVIEW_UID, criteria, criteriaVersion: 0 },
					catalog
				)
			)
		);
	}

	public create$(
		collection: MusicCollectionDraft
	): Observable<CreateMusicCollectionResult> {
		return this.repository.create$(collection);
	}

	public update$(
		uid: string,
		collection: MusicCollectionDraft
	): Observable<UpdateMusicCollectionResult> {
		return this.repository.update$(uid, collection);
	}

	public delete$(uid: string): Observable<void> {
		return this.repository.delete$(uid);
	}

	private toStanding(
		collection: MusicCollectionEntity,
		catalog: MusicCollectionCatalog,
		copies: ReturnType<typeof toOwnedCopies>
	): MusicCollectionStanding {
		const run = performanceLog.start('collection.standing', {
			albums: catalog.albums.length,
			credits: catalog.credits?.length ?? 0,
		});
		const resolved = resolveMusicCollection(collection, catalog);
		const progress = compareWithCollection(resolved, copies);
		const standing: MusicCollectionStanding = {
			collection,
			resolved,
			progress,
			score: scoreCollection(
				resolved,
				copies,
				collection.basePoints,
				progress.completed
			),
		};

		run.end({ matched: resolved.total });

		return standing;
	}

	private catalog$(withCredits: boolean): Observable<MusicCollectionCatalog> {
		return combineLatest([
			entities$(
				() => this.albumStateService.selectEntities$(),
				() => this.albumStateService.dispatchListEntitiesAction()
			),
			entities$(
				() => this.artistStateService.selectEntities$(),
				() => this.artistStateService.dispatchListEntitiesAction()
			),
			withCredits ? this.repository.listCredits$() : of([]),
		]).pipe(
			map(([albums, artists, credits]) => ({
				albums: albums.map(toCatalogAlbum),
				artists: artists.map(toCatalogArtist),
				credits,
			}))
		);
	}
}
