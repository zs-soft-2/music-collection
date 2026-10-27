import { Observable, from, map, of, switchMap, throwError } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	CollectionReference,
	DocumentData,
	Firestore,
	collection,
	doc,
	docSnapshots,
} from '@angular/fire/firestore';

import {
	Entity,
	EntityDataService,
	ParamItem,
	QueryOperatorEnum,
	SearchParams,
	ownedCollectionPath,
	ownedFeatureKey,
	withOwner,
} from '../../common';
import { AuthenticatedUserService } from './authenticated-user.service';
import {
	FirestoreSyncService,
	toSyncedData,
	withLocalUpdatedAt,
} from './firestore-sync.service';

/** The value of a possibly nested field, the way Firestore reads `a.b`. */
const valueAt = (entity: unknown, field: string): unknown =>
	field
		.split('.')
		.reduce<unknown>(
			(value, key) =>
				value && typeof value === 'object'
					? (value as Record<string, unknown>)[key]
					: undefined,
			entity
		);

/**
 * Whether the entity answers one search parameter. Like the catalog's search
 * it reads every parameter as a `where`; the constraint kind is what a query
 * builder needs, and there is no query here.
 */
const matches = (
	entity: unknown,
	{ field, operation, value }: ParamItem<unknown>
): boolean => {
	const held = valueAt(entity, field);
	const list = Array.isArray(value) ? (value as unknown[]) : [];

	switch (operation) {
		case QueryOperatorEnum.equal:
			return held === value;
		case QueryOperatorEnum.notEqual:
			return held !== value;
		case QueryOperatorEnum.less:
			return (held as number) < (value as number);
		case QueryOperatorEnum.lessEqual:
			return (held as number) <= (value as number);
		case QueryOperatorEnum.greaterEqual:
			return (held as number) >= (value as number);
		case QueryOperatorEnum.greater:
			return (held as number) > (value as number);
		case QueryOperatorEnum.arrayContains:
			return Array.isArray(held) && held.includes(value);
		case QueryOperatorEnum.arrayContainsAny:
			return (
				Array.isArray(held) && list.some((one) => held.includes(one))
			);
		case QueryOperatorEnum.in:
			return list.includes(held);
		case QueryOperatorEnum.notIn:
			return !list.includes(held);
		default:
			return false;
	}
};

/**
 * Data access for what a collector created for themselves: a band the shared
 * catalog has never heard of, and in time the records under it.
 *
 * It is the same entity as the catalog's — same model, same form — kept
 * somewhere else: `user/{uid}/owned-{feature}`, beside the collector's copies
 * and wishes. Three things follow from that, and together they are the whole
 * point of the class.
 *
 * The catalog does not see it. The bundles, the counts, the weekly band and
 * the collection rules all read the catalog's own collections, and an owned
 * document is in none of them — so it cannot reach a score or a statistic by
 * being forgotten in some filter.
 *
 * Nobody else sees it either. The list is one plain collection query under
 * the signed-in user, not a collection-group query filtered by owner, which
 * is what lets the rules keep it to `isSelf(uid)` — and costs no index.
 *
 * And it is not published as a bundle: a collector has a handful of these,
 * where the catalog has hundreds.
 */
@Injectable()
export abstract class OwnedFirebaseDataService<
	R extends Entity,
	S,
	T extends Entity,
> extends EntityDataService<R, S, T> {
	protected firestore = inject(Firestore);
	protected firestoreSync = inject(FirestoreSyncService);

	/** The catalog feature this is the collector's own side of, e.g. `artist`. */
	protected catalogFeatureKey!: string;

	private readonly authenticatedUser = inject(AuthenticatedUserService);

	public add$(entityAdd: S): Observable<R> {
		return this.write$((uid) => {
			const reference = doc(this.ownedCollection(uid));
			const newEntity = withOwner(
				{
					...entityAdd,
					uid: reference.id,
				},
				uid
			);

			return this.firestoreSync
				.set(reference, this.featureKey, newEntity)
				.then(() => withLocalUpdatedAt(newEntity) as unknown as R);
		});
	}

	/**
	 * Deletes the document and leaves a tombstone, so the collector's other
	 * devices drop it from their cache instead of holding it for good.
	 */
	public delete$(entity: R): Observable<R> {
		return this.write$((uid) =>
			this.firestoreSync
				.delete(
					doc(this.ownedCollection(uid), entity.uid),
					this.featureKey
				)
				.then(() => entity)
		);
	}

	/** What the signed-in collector made; nothing at all for a visitor. */
	public list$(): Observable<R[]> {
		return this.forUser$((uid) =>
			this.firestoreSync.list$<R>({
				featureKey: this.featureKey,
				// Whose list it is belongs in the key: two accounts share one
				// browser, and the second must not read the first one's cache.
				cacheKey: `${this.featureKey}?${uid}`,
				query: this.ownedCollection(uid),
				bundle: false,
			})
		);
	}

	public load$(id: string): Observable<R | undefined> {
		return this.authenticatedUser.user$.pipe(
			switchMap((user) =>
				user
					? docSnapshots(
							doc(this.ownedCollection(user.uid), id)
						).pipe(
							map((snapshot) =>
								snapshot.exists()
									? ({
											...toSyncedData(snapshot),
											uid: snapshot.id,
										} as R)
									: undefined
							)
						)
					: of(undefined)
			)
		);
	}

	/**
	 * Searched in the browser, not in Firestore: the list is a handful of
	 * documents the client already holds, and filtering it here asks nothing
	 * of the index that a `where` over a subcollection would.
	 */
	public search$(params: SearchParams): Observable<R[]> {
		return this.list$().pipe(
			map((entities) =>
				entities.filter((entity) =>
					params.every((param) => matches(entity, param.query))
				)
			)
		);
	}

	public update$(entityUpdate: T): Observable<T> {
		return this.write$((uid) => {
			const newEntity = withOwner({ ...entityUpdate }, uid) as T;

			return this.firestoreSync
				.set(
					doc(this.ownedCollection(uid), newEntity.uid),
					this.featureKey,
					newEntity
				)
				.then(() => withLocalUpdatedAt(newEntity) as T);
		});
	}

	/** The sync feature key of the owned side, e.g. `owned-artist`. */
	protected get featureKey(): string {
		return ownedFeatureKey(this.catalogFeatureKey);
	}

	/** The signed-in collector's own collection of the feature. */
	protected ownedCollection(uid: string): CollectionReference<DocumentData> {
		return collection(
			this.firestore,
			...ownedCollectionPath(uid, this.catalogFeatureKey)
		);
	}

	/**
	 * Reads as whoever is signed in, and answers a visitor with nothing.
	 * Nothing is read before the session has settled: the stream says
	 * nothing while Firebase is still restoring it, so a page reload does
	 * not start by looking like a sign-out.
	 */
	private forUser$(read: (uid: string) => Observable<R[]>): Observable<R[]> {
		return this.authenticatedUser.user$.pipe(
			switchMap((user) => (user ? read(user.uid) : of([])))
		);
	}

	/**
	 * Writes as whoever is signed in. There is nowhere to put an owned
	 * document without a collector: the path is the owner.
	 */
	private write$<V>(write: (uid: string) => Promise<V>): Observable<V> {
		const uid = this.authenticatedUser.current?.uid;

		return uid
			? from(write(uid))
			: throwError(
					() =>
						new Error(
							`${this.featureKey}: nobody is signed in to own it`
						)
				);
	}
}
