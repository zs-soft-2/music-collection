import { Observable, map, of, switchMap, take, tap, throwError } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	AnalyticsService,
	AuthenticatedUserService,
	DecideRequestInput,
	DecideRequestResult,
	EntityRequest,
	EntityRequestAdd,
	EntityRequestReference,
	EntityResponse,
	EntityTypeEnum,
	MAX_ENTITY_REQUEST_CHANGES,
	User,
	ownedCollectionPath,
} from '@music-collection/api';

import { toRequestChanges, toRequestSnapshot } from './request-change';
import { RequestRepository } from './request.repository';

const newestFirst = (requests: EntityRequest[]) =>
	[...requests].sort((a, b) => b.createdAt - a.createdAt);

/** What a collector asks the catalog to change about what it already holds. */
export interface SubmitUpdateRequestParams {
	/** The catalog feature, e.g. `artist`. */
	featureKey: string;
	entityType: EntityTypeEnum;
	/** The catalog document the request is about, e.g. `artist/{uid}`. */
	path: string;
	/** The catalog's state, as it was read. */
	before: Record<string, unknown>;
	/** The same state with the collector's changes in it. */
	after: Record<string, unknown>;
	/** What backs each changed field, by field name. */
	references: Record<string, EntityRequestReference>;
	/** `updatedAt` of the catalog document when it was read. */
	baseUpdatedAt: number | null;
	note?: string | null;
}

/** What a collector asks the catalog to take in, out of what they own. */
export interface SubmitOwnedRequestParams {
	/** The catalog feature the owned entity mirrors, e.g. `artist`. */
	featureKey: string;
	entityType: EntityTypeEnum;
	/** The collector's own document, as they saved it. */
	entity: Record<string, unknown> & { uid: string };
	/** What the new document would go under, e.g. `artist/{uid}`. */
	parentPath?: string | null;
	/** The collector's own words about the request as a whole. */
	note?: string | null;
}

/**
 * The collector's requests to the catalog.
 *
 * A collector may not write the catalog, so what they enter stays theirs
 * until an admin takes it in. This is the asking: the submitted state is kept
 * whole in the request, and beside it the fields it is made of, which is what
 * an admin decides on one at a time.
 *
 * Who is asking is read here rather than passed in: it is the session, and a
 * page should not have to carry it just to hand it back.
 */
@Injectable({ providedIn: 'root' })
export class RequestEffect {
	private readonly analytics = inject(AnalyticsService);
	private readonly authenticatedUser = inject(AuthenticatedUserService);
	private readonly repository = inject(RequestRepository);

	/** Every request, newest first (admin). */
	public listAll$(): Observable<EntityRequest[]> {
		return this.repository.listAll$().pipe(map(newestFirst));
	}

	/** The answers written to the signed-in collector; none for a visitor. */
	public listMyResponses$(): Observable<EntityResponse[]> {
		return this.authenticatedUser.user$.pipe(
			switchMap((user) =>
				user ? this.repository.listResponsesByUser$(user.uid) : of([])
			)
		);
	}

	/** Every answer (admin), to show what was decided on a request. */
	public listAllResponses$(): Observable<EntityResponse[]> {
		return this.repository.listAllResponses$();
	}

	/** How many requests wait for a decision (admin). */
	public countPending$(): Observable<number> {
		return this.repository
			.listAll$()
			.pipe(
				map(
					(requests) =>
						requests.filter(
							(request) => request.status === 'pending'
						).length
				)
			);
	}

	/** The users, to name the collectors who asked (admin). */
	public listUsers$(): Observable<User[]> {
		return this.repository.listUsers$();
	}

	/**
	 * Decides a request field by field. The catalog and the answer are
	 * written on the server — a rejection without a reason is refused there,
	 * not merely discouraged here.
	 */
	public decide$(input: DecideRequestInput): Observable<DecideRequestResult> {
		return this.repository.decide$(input);
	}

	/** The signed-in collector's requests, newest first; none for a visitor. */
	public listMine$(): Observable<EntityRequest[]> {
		return this.authenticatedUser.user$.pipe(
			switchMap((user) =>
				user ? this.repository.listByUser$(user.uid) : of([])
			),
			map(newestFirst)
		);
	}

	/**
	 * Submits a change to something the catalog already holds.
	 *
	 * Every changed field has to carry what backs it. That is not manners:
	 * an admin decides field by field, and a field with nothing behind it
	 * gives them nothing to decide on — so it is refused here rather than
	 * sent to be refused there.
	 */
	public submitUpdate$({
		featureKey,
		entityType,
		path,
		before,
		after,
		references,
		baseUpdatedAt,
		note = null,
	}: SubmitUpdateRequestParams): Observable<EntityRequest> {
		return this.authenticatedUser.user$.pipe(
			take(1),
			switchMap((user) => {
				if (!user) {
					return throwError(
						() => new Error('Nobody is signed in to ask.')
					);
				}

				const beforeSnapshot = toRequestSnapshot(before);
				const afterSnapshot = toRequestSnapshot(after);
				const changes = toRequestChanges(
					beforeSnapshot,
					afterSnapshot
				).map((change) => ({
					...change,
					reference: references[change.field] ?? null,
				}));

				if (!changes.length) {
					return throwError(
						() => new Error('There is nothing to submit.')
					);
				}
				if (changes.length > MAX_ENTITY_REQUEST_CHANGES) {
					return throwError(
						() => new Error('The request carries too many fields.')
					);
				}
				if (changes.some((change) => !change.reference)) {
					return throwError(
						() =>
							new Error('Every changed field needs a reference.')
					);
				}

				const request: EntityRequestAdd = {
					userId: user.uid,
					operation: 'update',
					target: {
						featureKey,
						entityType,
						path,
						parentPath: null,
						ownedPath: null,
					},
					before: beforeSnapshot,
					after: afterSnapshot,
					changes,
					status: 'pending',
					baseUpdatedAt,
					note,
					createdAt: Date.now(),
				};

				return this.repository.add$(request);
			}),
			tap(() =>
				this.analytics.track('entity_request_submitted', {
					featureKey,
					operation: 'update',
				})
			)
		);
	}

	/**
	 * Submits a document the collector keeps for themselves as a new entity
	 * for the catalog. Every filled-in field is a change from nothing, and an
	 * admin may take in some of them and leave others.
	 */
	public submitOwned$({
		featureKey,
		entityType,
		entity,
		parentPath = null,
		note = null,
	}: SubmitOwnedRequestParams): Observable<EntityRequest> {
		return this.authenticatedUser.user$.pipe(
			take(1),
			switchMap((user) => {
				if (!user) {
					return throwError(
						() => new Error('Nobody is signed in to ask.')
					);
				}

				const after = toRequestSnapshot(entity);
				const changes = toRequestChanges(null, after);

				if (!changes.length) {
					return throwError(
						() => new Error('There is nothing to submit.')
					);
				}
				if (changes.length > MAX_ENTITY_REQUEST_CHANGES) {
					return throwError(
						() => new Error('The request carries too many fields.')
					);
				}

				const request: EntityRequestAdd = {
					userId: user.uid,
					operation: 'create',
					target: {
						featureKey,
						entityType,
						path: null,
						parentPath,
						ownedPath: [
							...ownedCollectionPath(user.uid, featureKey),
							entity.uid,
						].join('/'),
					},
					before: null,
					after,
					changes,
					status: 'pending',
					baseUpdatedAt: null,
					note,
					createdAt: Date.now(),
				};

				return this.repository.add$(request);
			}),
			tap(() =>
				this.analytics.track('entity_request_submitted', {
					featureKey,
					operation: 'create',
				})
			)
		);
	}
}
