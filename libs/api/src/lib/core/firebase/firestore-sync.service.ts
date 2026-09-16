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
	DocumentReference,
	Firestore,
	Query,
	QueryDocumentSnapshot,
	SetOptions,
	Timestamp,
	UpdateData,
	WriteBatch,
	collection,
	doc,
	getDocFromServer,
	getDocsFromCache,
	getDocsFromServer,
	onSnapshot,
	query,
	serverTimestamp,
	where,
	writeBatch,
} from '@angular/fire/firestore';

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

interface CatalogSync {
	modifiedAt?: TimestampMap;
	resetAt?: TimestampMap;
}

interface FeatureVersion {
	modifiedAt: Timestamp | null;
	resetAt: Timestamp | null;
}

/** What the local cache of a query holds, kept in localStorage. */
interface SyncMarker {
	seconds: number;
	nanoseconds: number;
	count: number;
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
}

const compareTimestamps = (
	a: { seconds: number; nanoseconds: number },
	b: { seconds: number; nanoseconds: number }
) => a.seconds - b.seconds || a.nanoseconds - b.nanoseconds;

const timestampKey = (timestamp: Timestamp | null) =>
	timestamp ? `${timestamp.seconds}.${timestamp.nanoseconds}` : '';

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
 * Writes: every write stamps `updatedAt` and bumps the feature's `modifiedAt`
 * in the same batch; deletes leave a tombstone.
 */
@Injectable({ providedIn: 'root' })
export class FirestoreSyncService {
	private readonly firestore = inject(Firestore);
	private readonly injector = inject(EnvironmentInjector);

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

	/** Deletes a document and leaves a tombstone for the other clients. */
	public delete(
		reference: DocumentReference,
		featureKey: string
	): Promise<void> {
		return this.commit((batch) => {
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
						timestampKey(current.resetAt)
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
			const marker = this.readMarker(synced);

			// Unversioned feature: the cache cannot be trusted.
			if (!modifiedAt) {
				return this.downloadAll(synced, null);
			}
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

		const [deletions, changes] = await this.run(() =>
			Promise.all([
				getDocsFromServer(
					query(
						collection(
							this.firestore,
							SYNC_COLLECTION,
							synced.featureKey,
							DELETION_COLLECTION
						),
						where('deletedAt', '>', since)
					)
				),
				getDocsFromServer(
					query(synced.query, where(UPDATED_AT_FIELD, '>', since))
				),
			])
		);

		await this.evict(
			deletions.docs.map((snapshot) =>
				doc(this.firestore, snapshot.get('path') as string)
			)
		);

		const all = await this.run(() => getDocsFromCache(synced.query));

		this.writeMarker(
			synced,
			this.latest(modifiedAt, changes.docs),
			all.size
		);
		return all.docs;
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
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { [UPDATED_AT_FIELD]: updatedAt, ...data } = snapshot.data();

		return { ...data, uid: snapshot.id } as T;
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

	private readMarker(synced: SyncedQuery): SyncMarker | null {
		try {
			const raw = localStorage.getItem(this.storageKey(synced));

			return raw ? (JSON.parse(raw) as SyncMarker) : null;
		} catch {
			return null;
		}
	}

	private writeMarker(
		synced: SyncedQuery,
		syncedAt: Timestamp,
		count: number
	): void {
		try {
			localStorage.setItem(
				this.storageKey(synced),
				JSON.stringify({
					seconds: syncedAt.seconds,
					nanoseconds: syncedAt.nanoseconds,
					count,
				} satisfies SyncMarker)
			);
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
