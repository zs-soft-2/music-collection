import { Observable, combineLatest, filter, map, tap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	AlbumStateService,
	ArtistStateService,
	CollectionItemStateService,
} from '@music-collection/api';
import {
	MusicCollectionCatalog,
	MusicCollectionEntity,
	MusicCollectionProgress,
	MusicCollectionRepository,
	ResolvedMusicCollection,
} from '@music-collection/domain/music-collection/api';
import {
	compareWithCollection,
	resolveMusicCollection,
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
			this.catalog$(),
			this.collectionItemStateService.selectLoadedEntities$(),
		]).pipe(
			map(([collections, catalog, items]) => {
				const copies = toOwnedCopies(items);

				return collections.map((collection) =>
					this.toStanding(collection, catalog, copies)
				);
			})
		);
	}

	/** One collection by its slug; null while the catalog has no such one. */
	public loadStanding$(
		slug: string
	): Observable<MusicCollectionStanding | null> {
		return combineLatest([
			this.repository.loadBySlug$(slug),
			this.catalog$(),
			this.collectionItemStateService.selectLoadedEntities$(),
		]).pipe(
			map(([collection, catalog, items]) =>
				collection
					? this.toStanding(collection, catalog, toOwnedCopies(items))
					: null
			)
		);
	}

	private toStanding(
		collection: MusicCollectionEntity,
		catalog: MusicCollectionCatalog,
		copies: ReturnType<typeof toOwnedCopies>
	): MusicCollectionStanding {
		const resolved = resolveMusicCollection(collection, catalog);

		return {
			collection,
			resolved,
			progress: compareWithCollection(resolved, copies),
		};
	}

	private catalog$(): Observable<MusicCollectionCatalog> {
		return combineLatest([
			entities$(
				() => this.albumStateService.selectEntities$(),
				() => this.albumStateService.dispatchListEntitiesAction()
			),
			entities$(
				() => this.artistStateService.selectEntities$(),
				() => this.artistStateService.dispatchListEntitiesAction()
			),
		]).pipe(
			map(([albums, artists]) => ({
				albums: albums.map(toCatalogAlbum),
				artists: artists.map(toCatalogArtist),
			}))
		);
	}
}
