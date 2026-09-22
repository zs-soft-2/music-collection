import {
	Observable,
	catchError,
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
	where,
	writeBatch,
} from '@angular/fire/firestore';
import { Storage, getBlob, ref } from '@angular/fire/storage';

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
}

interface FeatureVersion {
	modifiedAt: Timestamp | null;
	resetAt: Timestamp | null;
	bundle: CatalogBundle | null;
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
	/** Bundle loads in progress or done in this session, by path. */
	private readonly bundleLoads = new Map<string, Promise<boolean>>();

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
	 * Sets (merges) and deletes documents of one feature in a single batch;
	 * deletions leave tombstones like `delete`.
	 */
	public setAll(
		featureKey: string,
		writes: { reference: DocumentReference; data: DocumentData }[],
		deletions: DocumentReference[] = []
	): Promise<void> {
		return this.commit((batch) => {
			writes.forEach(({ reference, data }) =>
				batch.set(reference, this.stamp(data), { merge: true })
			);
			deletions.forEach((reference) =>
				this.remove(batch, reference, featureKey)
			);
			this.touch(batch, featureKey);
		});
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

	/** The feature's version; null when the sync state cannot be read. */
	private version$(featureKey: string): Observable<FeatureVersion | null> {
		return this.catalog$.pipe(
			map((catalog) =>
				catalog
					? {
							modifiedAt:
								catalog.modifiedAt?.[featureKey] ?? null,
							resetAt: catalog.resetAt?.[featureKey] ?? null,
							bundle: catalog.bundles?.[featureKey] ?? null,
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
					previous.bundle?.path === current.bundle?.path
			)
		);
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
			!(await this.loadFeatureBundle(synced.featureKey, bundle))
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

	/** Loads the bundle once per session; false when it cannot be used. */
	private loadFeatureBundle(
		featureKey: string,
		bundle: CatalogBundle
	): Promise<boolean> {
		let loading = this.bundleLoads.get(bundle.path);

		if (!loading) {
			loading = this.loadBundleIntoCache(featureKey, bundle).catch(
				(error) => {
					console.warn(
						`Bundle "${bundle.path}" unavailable, downloading documents`,
						error
					);
					this.bundleLoads.delete(bundle.path);
					return false;
				}
			);
			this.bundleLoads.set(bundle.path, loading);
		}
		return loading;
	}

	private async loadBundleIntoCache(
		featureKey: string,
		bundle: CatalogBundle
	): Promise<boolean> {
		const loaded = this.readJson<LoadedBundle>(
			this.bundleStorageKey(featureKey)
		);

		if (
			loaded?.path === bundle.path &&
			(await this.hasCached(featureKey))
		) {
			return true;
		}

		const blob = await this.run(() =>
			getBlob(ref(this.storage, bundle.path))
		);
		const data = await blob.arrayBuffer();

		await this.run(() => loadBundle(this.firestore, data));
		// Loading never removes documents: evict the ones deleted since the
		// previous bundle, or since ever when there was none.
		await this.evictDeleted(
			featureKey,
			loaded ? new Timestamp(loaded.seconds, loaded.nanoseconds) : null
		);

		this.writeJson(this.bundleStorageKey(featureKey), {
			path: bundle.path,
			seconds: bundle.modifiedAt.seconds,
			nanoseconds: bundle.modifiedAt.nanoseconds,
		} satisfies LoadedBundle);
		return true;
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
		return `mc.sync.${this.firestore.app.options.projectId}.${this.cacheKey(synced)}`;
	}

	private bundleStorageKey(featureKey: string): string {
		return `mc.sync.${this.firestore.app.options.projectId}.bundle:${featureKey}`;
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
