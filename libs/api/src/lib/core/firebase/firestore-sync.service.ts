import {
	Observable,
	catchError,
	combineLatest,
	concat,
	concatMap,
	defer,
	distinctUntilChanged,
	filter,
	map,
	of,
	shareReplay,
} from 'rxjs';

import {
	EnvironmentInjector,
	Injectable,
	inject,
	runInInjectionContext,
} from '@angular/core';
import {
	DocumentData,
	DocumentSnapshot,
	DocumentReference,
	Firestore,
	Query,
	QueryDocumentSnapshot,
	SetOptions,
	Timestamp,
	UpdateData,
	WriteBatch,
	collection,
	clearIndexedDbPersistence,
	collectionGroup,
	doc,
	getDocFromServer,
	getDocsFromCache,
	getDocsFromServer,
	limit,
	loadBundle,
	onSnapshot,
	query,
	serverTimestamp,
	terminate,
	where,
	writeBatch,
} from '@angular/fire/firestore';
import { Storage, getBlob, ref } from '@angular/fire/storage';

import {
	CatalogScopeService,
	genreScopeKey,
	isGenreScoped,
} from './catalog-scope.service';

/** Collection of the sync bookkeeping documents. */
export const SYNC_COLLECTION = 'sync';
/**
 * `sync/catalog`: per feature key the time of the last change (`modifiedAt`)
 * and of the last forced full refresh (`resetAt`).
 */
export const CATALOG_SYNC_DOCUMENT = 'catalog';
/** `sync/{featureKey}/deletion/{id}`: tombstones of deleted documents. */
export const DELETION_COLLECTION = 'deletion';
/** Server time of a document's last write, set on every write. */
export const UPDATED_AT_FIELD = 'updatedAt';

/**
 * How many documents one batch writes, the feature stamp left room for.
 * Firestore takes 500 operations in a batch; a deletion is two of them,
 * because it writes a tombstone as well.
 */
const BATCH_WRITE_LIMIT = 499;
const BATCH_DELETE_LIMIT = 249;

/** One document written, as `setAll` takes it. */
interface SyncWrite {
	reference: DocumentReference;
	data: DocumentData;
}

/**
 * The work split into batches Firestore will take. Never empty: a call with
 * nothing to write still bumps the feature's stamp, the way it did when this
 * was one batch.
 */
export function toSyncBatches(
	writes: SyncWrite[],
	deletions: DocumentReference[]
): { writes: SyncWrite[]; deletions: DocumentReference[] }[] {
	const rounds: { writes: SyncWrite[]; deletions: DocumentReference[] }[] =
		[];

	for (let at = 0; at < writes.length; at += BATCH_WRITE_LIMIT) {
		rounds.push({
			writes: writes.slice(at, at + BATCH_WRITE_LIMIT),
			deletions: [],
		});
	}
	for (let at = 0; at < deletions.length; at += BATCH_DELETE_LIMIT) {
		rounds.push({
			writes: [],
			deletions: deletions.slice(at, at + BATCH_DELETE_LIMIT),
		});
	}

	return rounds.length ? rounds : [{ writes: [], deletions: [] }];
}

type TimestampMap = Record<string, Timestamp | undefined>;

/**
 * A feature published as a Firestore bundle in Cloud Storage
 * (`tools/sync/build-bundles.mjs`): every document as of `modifiedAt`.
 */
interface CatalogBundle {
	path: string;
	modifiedAt: Timestamp;
	count: number;
}

interface CatalogSync {
	modifiedAt?: TimestampMap;
	resetAt?: TimestampMap;
	bundles?: Record<string, CatalogBundle | undefined>;
	/**
	 * Per genre slug the bundle of that genre's slice of the catalog: its
	 * bands, their albums and the musicians on them, with the tracks,
	 * line-ups and credits that hang off those. One file per genre rather
	 * than one per genre and feature, so a collector who follows two genres
	 * downloads two files however many collections they are spread over.
	 */
	genreBundles?: Record<string, CatalogBundle | undefined>;
}

interface FeatureVersion {
	modifiedAt: Timestamp | null;
	resetAt: Timestamp | null;
	bundle: CatalogBundle | null;
	/**
	 * The genre bundles this query is to be served from, empty where the
	 * catalog is not narrowed. All of the scope's genres or none of them: a
	 * scope half served is a catalog with a genre silently missing from it.
	 */
	scope: CatalogBundle[];
	/** The scope the bundles above belong to, for the cache bookkeeping. */
	scopeKey: string;
}

/** What the local cache of a query holds, kept in localStorage. */
interface SyncMarker {
	seconds: number;
	nanoseconds: number;
	count: number;
}

/** The bundle of a feature last loaded into the local cache. */
interface LoadedBundle {
	path: string;
	seconds: number;
	nanoseconds: number;
}

export interface SyncedQuery {
	/** The feature whose version in `sync/catalog` governs the query. */
	featureKey: string;
	query: Query<DocumentData>;
	/** Key of the local sync marker; defaults to the feature key. */
	cacheKey?: string;
	/**
	 * Download only the documents changed since the last sync. Needs the
	 * collection group index on `updatedAt` (firestore.indexes.json), so it is
	 * meant for whole-collection queries; filtered queries are downloaded again
	 * when their feature changes.
	 */
	incremental?: boolean;
	/**
	 * Whether this query may fill its cache from the feature's bundle.
	 * Defaults to true, which is what a query over the whole feature wants:
	 * one download instead of a document read apiece.
	 *
	 * A bundle holds the feature *whole* — it is built per feature key, not
	 * per query — so a narrow filter over a large feature pays for everything
	 * it did not ask for. `false` leaves the bundle alone and reads the few
	 * documents the filter names. Worth it only where the filter is narrow
	 * and the feature is large; a query that will end up wanting most of the
	 * feature anyway is better served by the bundle.
	 */
	bundle?: boolean;
}

const compareTimestamps = (
	a: { seconds: number; nanoseconds: number },
	b: { seconds: number; nanoseconds: number }
) => a.seconds - b.seconds || a.nanoseconds - b.nanoseconds;

const timestampKey = (timestamp: Timestamp | null) =>
	timestamp ? `${timestamp.seconds}.${timestamp.nanoseconds}` : '';

/**
 * The data of a document with `updatedAt` as epoch milliseconds (undefined
 * missing when never stamped), so models stay serializable and can be ordered by
 * their last change. A pending server timestamp reads as its local estimate.
 */
export const toSyncedData = (snapshot: DocumentSnapshot): DocumentData => {
	const { [UPDATED_AT_FIELD]: updatedAt, ...data } =
		snapshot.data({ serverTimestamps: 'estimate' }) ?? {};

	// Never undefined: embedded copies are written back, Firestore rejects it.
	return updatedAt instanceof Timestamp
		? { ...data, [UPDATED_AT_FIELD]: updatedAt.toMillis() }
		: data;
};

/**
 * The written data as the store should hold it: stamped with the local time
 * in place of the server timestamp the write gets, so a just created or
 * modified entity is ordered as the last changed without reloading it.
 */
export const withLocalUpdatedAt = <T extends object>(
	data: T
): T & { [UPDATED_AT_FIELD]: number } => ({
	...data,
	[UPDATED_AT_FIELD]: Date.now(),
});

/**
 * Client-side cache of the catalog on top of Firestore's persistent
 * (IndexedDB) cache.
 *
 * Reads: a list is served from the local cache first, then kept current by
 * listening to the single `sync/catalog` document. When a feature's
 * `modifiedAt` is newer than what the cache holds, only the documents changed
 * since then are downloaded and deleted ones are evicted by their tombstones.
 * An unchanged catalog costs one document read per app start.
 *
 * Bundles: when a feature is published as a bundle, a query without a
 * current cache loads the bundle from Cloud Storage (no document reads) and
 * downloads only what changed after it.
 *
 * Writes: every write stamps `updatedAt` and bumps the feature's `modifiedAt`
 * in the same batch; deletes leave a tombstone.
 */
@Injectable({ providedIn: 'root' })
export class FirestoreSyncService {
	private readonly firestore = inject(Firestore);
	private readonly injector = inject(EnvironmentInjector);
	private readonly storage = inject(Storage);
	private readonly scope = inject(CatalogScopeService);
	/** Bundle loads in progress or done in this session, by bookkeeping id. */
	private readonly bundleLoads = new Map<string, Promise<boolean>>();
	/** Bundle files downloaded in this session, by storage path. */
	private readonly bundleFiles = new Map<string, Promise<boolean>>();

	private readonly catalog$: Observable<CatalogSync | null> =
		new Observable<CatalogSync | null>((subscriber) =>
			this.run(() =>
				onSnapshot(
					this.catalogReference(),
					{ includeMetadataChanges: true },
					(snapshot) => {
						// Only confirmed server state can tell whether the cache is current.
						if (
							!snapshot.metadata.fromCache &&
							!snapshot.metadata.hasPendingWrites
						) {
							subscriber.next(
								(snapshot.data() as CatalogSync) ?? {}
							);
						}
					},
					(error) => {
						console.warn(
							'Catalog sync state unavailable, caching is off',
							error
						);
						subscriber.next(null);
						subscriber.complete();
					}
				)
			)
		).pipe(shareReplay({ bufferSize: 1, refCount: true }));

	/**
	 * The documents of a query: the local cache at once (when it is known to
	 * be complete), then again whenever the feature changes.
	 */
	public list$<T>(synced: SyncedQuery): Observable<T[]> {
		const cached$ = defer(() => this.readIntactCache(synced)).pipe(
			filter((docs): docs is QueryDocumentSnapshot[] => docs !== null)
		);

		const fresh$ = this.version$(synced.featureKey).pipe(
			concatMap((version) => this.refresh(synced, version)),
			filter((docs): docs is QueryDocumentSnapshot[] => docs !== null)
		);

		return concat(cached$, fresh$).pipe(
			distinctUntilChanged(
				(previous, current) =>
					this.signature(previous) === this.signature(current)
			),
			map((docs) => docs.map((snapshot) => this.toModel<T>(snapshot)))
		);
	}

	/**
	 * Throws away everything this browser holds of the catalog, and the
	 * bookkeeping that says what it holds.
	 *
	 * Narrowing the catalog has to take away what has fallen out of scope,
	 * not merely stop adding to it: the documents of a genre the collector
	 * dropped sit in Firestore's own cache, and a cached query would go on
	 * answering with them — the collector would have chosen jazz and still
	 * be shown the metal they were sent home with. Firestore has no "evict
	 * this feature" call, so the cache goes whole, which it only allows on
	 * a terminated instance. That leaves this Firestore unusable, so the
	 * caller reloads the page afterwards.
	 */
	public async resetLocalCatalog(): Promise<void> {
		this.clearMarkers();

		await this.run(() => terminate(this.firestore));
		await this.run(() => clearIndexedDbPersistence(this.firestore));
	}

	/** Creates or overwrites a document. */
	public set(
		reference: DocumentReference,
		featureKey: string,
		data: DocumentData,
		options: SetOptions = {}
	): Promise<void> {
		return this.commit((batch) => {
			batch.set(reference, this.stamp(data), options);
			this.touch(batch, featureKey);
		});
	}

	/** Updates fields of an existing document. */
	public update(
		reference: DocumentReference,
		featureKey: string,
		data: UpdateData<DocumentData>
	): Promise<void> {
		return this.commit((batch) => {
			batch.update(reference, this.stamp(data));
			this.touch(batch, featureKey);
		});
	}

	/**
	 * Sets (merges) and deletes documents of one feature; deletions leave
	 * tombstones like `delete`.
	 *
	 * One batch where it fits, and Firestore allows 500 writes in one — a
	 * deletion costs two of them (the document and its tombstone), and the
	 * feature's own stamp one more. Beyond that the writes go in batches,
	 * one after the other: half a shelf written is better than a shelf that
	 * could not be written at all, and the caller learns of a failure the
	 * same way either path.
	 */
	public setAll(
		featureKey: string,
		writes: { reference: DocumentReference; data: DocumentData }[],
		deletions: DocumentReference[] = []
	): Promise<void> {
		const rounds = toSyncBatches(writes, deletions);

		return rounds.reduce(
			(done, round) =>
				done.then(() =>
					this.commit((batch) => {
						round.writes.forEach(({ reference, data }) =>
							batch.set(reference, this.stamp(data), {
								merge: true,
							})
						);
						round.deletions.forEach((reference) =>
							this.remove(batch, reference, featureKey)
						);
						this.touch(batch, featureKey);
					})
				),
			Promise.resolve()
		);
	}

	/** Deletes a document and leaves a tombstone for the other clients. */
	public delete(
		reference: DocumentReference,
		featureKey: string
	): Promise<void> {
		return this.commit((batch) => {
			this.remove(batch, reference, featureKey);
			this.touch(batch, featureKey);
		});
	}

	private commit(write: (batch: WriteBatch) => void): Promise<void> {
		return this.run(() => {
			const batch = writeBatch(this.firestore);

			write(batch);
			return batch.commit();
		});
	}

	private remove(
		batch: WriteBatch,
		reference: DocumentReference,
		featureKey: string
	): void {
		batch.delete(reference);
		batch.set(
			doc(
				this.firestore,
				SYNC_COLLECTION,
				featureKey,
				DELETION_COLLECTION,
				reference.path.split('/').join('~')
			),
			{ path: reference.path, deletedAt: serverTimestamp() }
		);
	}

	private stamp<T extends object>(data: T): T {
		return { ...data, [UPDATED_AT_FIELD]: serverTimestamp() };
	}

	private touch(batch: WriteBatch, featureKey: string): void {
		batch.set(
			this.catalogReference(),
			{ modifiedAt: { [featureKey]: serverTimestamp() } },
			{ merge: true }
		);
	}

	private catalogReference(): DocumentReference {
		return doc(this.firestore, SYNC_COLLECTION, CATALOG_SYNC_DOCUMENT);
	}

	/**
	 * The feature's version; null when the sync state cannot be read.
	 *
	 * It follows the scope as well as the catalog, because narrowing the
	 * catalog invalidates every list the same way a catalog change does —
	 * what a query is allowed to hold has changed, and it has to be asked
	 * again rather than left on what it last read.
	 */
	private version$(featureKey: string): Observable<FeatureVersion | null> {
		return combineLatest([this.catalog$, this.scope.scope$]).pipe(
			map(([catalog, slugs]) =>
				catalog
					? {
							modifiedAt:
								catalog.modifiedAt?.[featureKey] ?? null,
							resetAt: catalog.resetAt?.[featureKey] ?? null,
							bundle: catalog.bundles?.[featureKey] ?? null,
							scope: this.scopeBundles(
								catalog,
								featureKey,
								slugs
							),
							scopeKey: genreScopeKey(slugs),
						}
					: null
			),
			distinctUntilChanged(
				(previous, current) =>
					!!previous &&
					!!current &&
					timestampKey(previous.modifiedAt) ===
						timestampKey(current.modifiedAt) &&
					timestampKey(previous.resetAt) ===
						timestampKey(current.resetAt) &&
					previous.bundle?.path === current.bundle?.path &&
					this.bundleId(previous.scope, previous.scopeKey) ===
						this.bundleId(current.scope, current.scopeKey)
			)
		);
	}

	/**
	 * The genre bundles serving this feature, or none.
	 *
	 * None where the collector follows everything, where the feature does
	 * not arrive in a genre bundle (a label belongs to no one genre), and —
	 * deliberately — where any one genre of the scope has no bundle
	 * published yet. Serving the genres that do have one would leave the
	 * other missing from every list without saying so; falling back to the
	 * whole feature is slower, but it is the catalog the collector asked
	 * for.
	 */
	private scopeBundles(
		catalog: CatalogSync,
		featureKey: string,
		slugs: string[]
	): CatalogBundle[] {
		if (!slugs.length || !isGenreScoped(featureKey)) {
			return [];
		}

		const bundles = slugs.map((slug) => catalog.genreBundles?.[slug]);

		return bundles.every((bundle): bundle is CatalogBundle => !!bundle)
			? bundles
			: [];
	}

	/**
	 * Brings the query's cache up to the given version. Returns null when
	 * nothing can be served (e.g. offline without a cache).
	 */
	private refresh(
		synced: SyncedQuery,
		version: FeatureVersion | null
	): Observable<QueryDocumentSnapshot[] | null> {
		return defer(async () => {
			const modifiedAt = version?.modifiedAt ?? null;

			// A narrowed catalog is served from its genre bundles and from
			// nothing else. Downloading the whole feature is the very thing
			// the scope exists to prevent, so it is not a fallback here: a
			// bundle that cannot be loaded leaves the paths below to it, and
			// those only run while the catalog is not narrowed.
			if (version?.scope.length) {
				const scoped = await this.refreshFromScope(synced, version);

				if (scoped) {
					return scoped;
				}
			}

			// Unversioned feature: the cache cannot be trusted.
			if (!modifiedAt) {
				return this.downloadAll(synced, null);
			}

			const marker = await this.catchUpWithBundle(
				synced,
				version?.bundle ?? null,
				version?.resetAt ?? null
			);
			if (
				!marker ||
				(version?.resetAt &&
					compareTimestamps(version.resetAt, marker) > 0)
			) {
				return this.downloadAll(synced, modifiedAt);
			}
			if (compareTimestamps(modifiedAt, marker) <= 0) {
				return (
					(await this.readIntactCache(synced)) ??
					this.downloadAll(synced, modifiedAt)
				);
			}
			if (!synced.incremental) {
				return this.downloadAll(synced, modifiedAt);
			}
			try {
				return await this.downloadChanges(synced, modifiedAt, marker);
			} catch (error) {
				console.warn(
					`Incremental sync of "${this.cacheKey(synced)}" failed, downloading all`,
					error
				);
				return this.downloadAll(synced, modifiedAt);
			}
		}).pipe(
			catchError((error) => {
				console.error(
					`Sync of "${this.cacheKey(synced)}" failed`,
					error
				);
				return of(null);
			})
		);
	}

	/**
	 * The query served from the scope's genre bundles: load them once, then
	 * read the cache they filled.
	 *
	 * Nothing is asked of the server beyond the tombstones — no document
	 * reads, and none of the catch-up the unnarrowed paths do. A catalog
	 * this client holds only part of cannot ask "what changed since?"
	 * without being handed the genres it does not want, so a narrowed
	 * catalog moves forward when a new bundle is published and not before.
	 * That is also how fresh it needs to be: the catalog changes on import,
	 * which is exactly when the bundles are built.
	 *
	 * Null when the bundles could not be loaded, leaving the caller on the
	 * unnarrowed path.
	 */
	private async refreshFromScope(
		synced: SyncedQuery,
		version: FeatureVersion
	): Promise<QueryDocumentSnapshot[] | null> {
		const id = this.bundleId(version.scope, version.scopeKey);

		if (!(await this.loadBundles(synced.featureKey, version.scope, id))) {
			return null;
		}

		const cached = await this.run(() => getDocsFromCache(synced.query));

		this.writeMarker(synced, this.newestOf(version.scope), cached.size);
		return cached.docs;
	}

	private async downloadAll(
		synced: SyncedQuery,
		modifiedAt: Timestamp | null
	): Promise<QueryDocumentSnapshot[]> {
		const cached = await this.run(() =>
			getDocsFromCache(synced.query)
		).catch(() => null);
		const server = await this.run(() => getDocsFromServer(synced.query));

		// Documents deleted without a tombstone would linger in the cache.
		const current = new Set(
			server.docs.map((snapshot) => snapshot.ref.path)
		);
		await this.evict(
			(cached?.docs ?? [])
				.filter((snapshot) => !current.has(snapshot.ref.path))
				.map((snapshot) => snapshot.ref)
		);

		if (modifiedAt) {
			this.writeMarker(
				synced,
				this.latest(modifiedAt, server.docs),
				server.size
			);
		} else {
			this.removeMarker(synced);
		}
		return server.docs;
	}

	private async downloadChanges(
		synced: SyncedQuery,
		modifiedAt: Timestamp,
		marker: SyncMarker
	): Promise<QueryDocumentSnapshot[]> {
		const since = new Timestamp(marker.seconds, marker.nanoseconds);

		const [changes] = await Promise.all([
			this.run(() =>
				getDocsFromServer(
					query(synced.query, where(UPDATED_AT_FIELD, '>', since))
				)
			),
			this.evictDeleted(synced.featureKey, since),
		]);

		const all = await this.run(() => getDocsFromCache(synced.query));

		this.writeMarker(
			synced,
			this.latest(modifiedAt, changes.docs),
			all.size
		);
		return all.docs;
	}

	/**
	 * The query's marker, advanced to the feature's bundle when the cache is
	 * older than the bundle and the bundle could be loaded.
	 */
	private async catchUpWithBundle(
		synced: SyncedQuery,
		bundle: CatalogBundle | null,
		resetAt: Timestamp | null
	): Promise<SyncMarker | null> {
		const marker = this.readMarker(synced);
		const behind =
			!marker ||
			(!!bundle && compareTimestamps(bundle.modifiedAt, marker) > 0) ||
			(!!resetAt && compareTimestamps(resetAt, marker) > 0);

		// A bundle built before a reset misses edits made without `updatedAt`.
		if (
			synced.bundle === false ||
			!bundle ||
			!behind ||
			(resetAt && compareTimestamps(resetAt, bundle.modifiedAt) > 0) ||
			!(await this.loadBundles(synced.featureKey, [bundle], bundle.path))
		) {
			return marker;
		}

		const cached = await this.run(() => getDocsFromCache(synced.query));

		this.writeMarker(synced, bundle.modifiedAt, cached.size);
		return {
			seconds: bundle.modifiedAt.seconds,
			nanoseconds: bundle.modifiedAt.nanoseconds,
			count: cached.size,
		};
	}

	/**
	 * Fills a feature's cache from bundles, once per session: its own single
	 * bundle, or the genre bundles of a narrowed scope. False when they
	 * cannot be used.
	 *
	 * `id` is what the feature's bookkeeping records as loaded — a path for
	 * a lone bundle, the scope and its version for several — so that a
	 * collector who changes which genres they follow is not left on a cache
	 * filled for the previous ones.
	 */
	private loadBundles(
		featureKey: string,
		bundles: CatalogBundle[],
		id: string
	): Promise<boolean> {
		const key = `${featureKey}@${id}`;
		let loading = this.bundleLoads.get(key);

		if (!loading) {
			loading = this.loadBundlesIntoCache(featureKey, bundles, id).catch(
				(error) => {
					console.warn(
						`Bundle "${id}" unavailable, downloading documents`,
						error
					);
					this.bundleLoads.delete(key);
					return false;
				}
			);
			this.bundleLoads.set(key, loading);
		}
		return loading;
	}

	private async loadBundlesIntoCache(
		featureKey: string,
		bundles: CatalogBundle[],
		id: string
	): Promise<boolean> {
		const loaded = this.readJson<LoadedBundle>(
			this.bundleStorageKey(featureKey)
		);

		if (loaded?.path === id && (await this.hasCached(featureKey))) {
			return true;
		}

		const fetched = await Promise.all(
			bundles.map((bundle) => this.fetchBundle(bundle.path))
		);

		// All of them or none: half a scope is a genre missing from every
		// list, and the cache would be marked as holding it.
		if (!fetched.every(Boolean)) {
			return false;
		}

		// Loading never removes documents: evict the ones deleted since the
		// previous bundle, or since ever when there was none.
		await this.evictDeleted(
			featureKey,
			loaded ? new Timestamp(loaded.seconds, loaded.nanoseconds) : null
		);

		const newest = this.newestOf(bundles);

		this.writeJson(this.bundleStorageKey(featureKey), {
			path: id,
			seconds: newest.seconds,
			nanoseconds: newest.nanoseconds,
		} satisfies LoadedBundle);
		return true;
	}

	/**
	 * Downloads one bundle file into the local cache, once per session
	 * however many features are served from it — a genre bundle carries six
	 * of them, and downloading it once per feature would cost six times the
	 * bytes for the very same documents.
	 */
	private fetchBundle(path: string): Promise<boolean> {
		let loading = this.bundleFiles.get(path);

		if (!loading) {
			loading = this.run(() => getBlob(ref(this.storage, path)))
				.then((blob) => blob.arrayBuffer())
				.then((data) =>
					this.run(() => loadBundle(this.firestore, data))
				)
				.then(() => true)
				.catch((error) => {
					console.warn(`Bundle file "${path}" unavailable`, error);
					this.bundleFiles.delete(path);
					return false;
				});
			this.bundleFiles.set(path, loading);
		}
		return loading;
	}

	/** The version of the newest bundle of a set. */
	private newestOf(bundles: CatalogBundle[]): Timestamp {
		return bundles.reduce(
			(newest, bundle) =>
				compareTimestamps(bundle.modifiedAt, newest) > 0
					? bundle.modifiedAt
					: newest,
			bundles[0].modifiedAt
		);
	}

	/** What a set of bundles is recorded as, in the cache bookkeeping. */
	private bundleId(bundles: CatalogBundle[], scopeKey: string): string {
		if (!bundles.length) {
			return '';
		}

		const newest = this.newestOf(bundles);

		return `genre:${scopeKey}@${newest.seconds}.${newest.nanoseconds}`;
	}

	/** Whether the cache holds any document of the feature. */
	private async hasCached(featureKey: string): Promise<boolean> {
		// A collection group: a nested feature (`artist/{uid}/album`) has no
		// document directly under its own name, and would always read empty.
		const cached = await this.run(() =>
			getDocsFromCache(
				query(collectionGroup(this.firestore, featureKey), limit(1))
			)
		).catch(() => null);

		return !!cached && !cached.empty;
	}

	/** Evicts the documents deleted after `since` (all when null). */
	private async evictDeleted(
		featureKey: string,
		since: Timestamp | null
	): Promise<void> {
		const tombstones = collection(
			this.firestore,
			SYNC_COLLECTION,
			featureKey,
			DELETION_COLLECTION
		);
		const deletions = await this.run(() =>
			getDocsFromServer(
				since
					? query(tombstones, where('deletedAt', '>', since))
					: tombstones
			)
		);

		await this.evict(
			deletions.docs.map((snapshot) =>
				doc(this.firestore, snapshot.get('path') as string)
			)
		);
	}

	/** The cached documents, or null when the cache is missing or partial. */
	private async readIntactCache(
		synced: SyncedQuery
	): Promise<QueryDocumentSnapshot[] | null> {
		const marker = this.readMarker(synced);

		if (!marker) {
			return null;
		}

		const cached = await this.run(() =>
			getDocsFromCache(synced.query)
		).catch(() => null);

		// Fewer documents than synced: site data was cleared in the meantime.
		if (!cached || cached.size < marker.count) {
			this.removeMarker(synced);
			return null;
		}
		return cached.docs;
	}

	/** Reading a document from the server replaces its cached copy. */
	private async evict(references: DocumentReference[]): Promise<void> {
		await Promise.all(
			references.map((reference) =>
				this.run(() => getDocFromServer(reference)).catch(
					() => undefined
				)
			)
		);
	}

	private latest(
		modifiedAt: Timestamp,
		docs: QueryDocumentSnapshot[]
	): Timestamp {
		return docs.reduce((latest, snapshot) => {
			const updatedAt = snapshot.get(UPDATED_AT_FIELD);

			return updatedAt instanceof Timestamp &&
				compareTimestamps(updatedAt, latest) > 0
				? updatedAt
				: latest;
		}, modifiedAt);
	}

	private toModel<T>(snapshot: QueryDocumentSnapshot): T {
		return { ...toSyncedData(snapshot), uid: snapshot.id } as T;
	}

	private signature(docs: QueryDocumentSnapshot[]): string {
		return docs
			.map(
				(snapshot) =>
					`${snapshot.ref.path}@${timestampKey(
						(snapshot.get(UPDATED_AT_FIELD) as Timestamp) ?? null
					)}`
			)
			.join('|');
	}

	private cacheKey(synced: SyncedQuery): string {
		return synced.cacheKey ?? synced.featureKey;
	}

	private storageKey(synced: SyncedQuery): string {
		return `${this.keyPrefix()}${this.cacheKey(synced)}${this.scopeSuffix(synced.featureKey)}`;
	}

	private bundleStorageKey(featureKey: string): string {
		return `${this.keyPrefix()}bundle:${featureKey}${this.scopeSuffix(featureKey)}`;
	}

	private keyPrefix(): string {
		return `mc.sync.${this.firestore.app.options.projectId}.`;
	}

	/**
	 * What tells one scope's bookkeeping from another's. Empty while the
	 * catalog is not narrowed, so a client that never narrows goes on
	 * reading the keys it has always written.
	 */
	private scopeSuffix(featureKey: string): string {
		const scope = isGenreScoped(featureKey)
			? genreScopeKey(this.scope.slugs())
			: '';

		return scope ? `#${scope}` : '';
	}

	private readMarker(synced: SyncedQuery): SyncMarker | null {
		return this.readJson<SyncMarker>(this.storageKey(synced));
	}

	private writeMarker(
		synced: SyncedQuery,
		syncedAt: Timestamp,
		count: number
	): void {
		this.writeJson(this.storageKey(synced), {
			seconds: syncedAt.seconds,
			nanoseconds: syncedAt.nanoseconds,
			count,
		} satisfies SyncMarker);
	}

	private readJson<T>(key: string): T | null {
		try {
			const raw = localStorage.getItem(key);

			return raw ? (JSON.parse(raw) as T) : null;
		} catch {
			return null;
		}
	}

	private writeJson(key: string, value: object): void {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// Storage unavailable — the next start downloads again.
		}
	}

	/** Every sync marker of this project, whatever scope wrote it. */
	private clearMarkers(): void {
		try {
			const prefix = this.keyPrefix();

			Object.keys(localStorage)
				.filter((key) => key.startsWith(prefix))
				.forEach((key) => localStorage.removeItem(key));
		} catch {
			// Storage unavailable — there is nothing kept to remove.
		}
	}

	private removeMarker(synced: SyncedQuery): void {
		try {
			localStorage.removeItem(this.storageKey(synced));
		} catch {
			// Storage unavailable — nothing to remove.
		}
	}

	private run<T>(action: () => T): T {
		// AngularFire expects its APIs to be called in an injection context.
		return runInInjectionContext(this.injector, action);
	}
}
