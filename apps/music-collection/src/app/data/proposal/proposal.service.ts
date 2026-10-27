import { Observable, take } from 'rxjs';

import { Injectable, signal } from '@angular/core';
import { EntityTypeEnum } from '@music-collection/api';

/** What a collector has made in a form, waiting to be sent. */
export interface EntityProposal {
	/** Taking something in, or changing something already there. */
	operation: 'create' | 'update';
	/** The catalog feature, e.g. `artist`. */
	featureKey: string;
	entityType: EntityTypeEnum;
	/** The catalog document it is about; null when there is none yet. */
	path: string | null;
	/** What a new document would go under, e.g. `artist/a1` for an album. */
	parentPath: string | null;
	/** The catalog's state as the form read it; null on a new entity. */
	before: Record<string, unknown> | null;
	/** The state the collector asks for. */
	after: Record<string, unknown>;
	/** `updatedAt` of the catalog document when it was read. */
	baseUpdatedAt: number | null;
}

/** What a page has to say to turn a form's save into a proposal. */
export interface ProposalInput<E extends object> {
	featureKey: string;
	entityType: EntityTypeEnum;
	/** The entity as the catalog holds it now. */
	current$: Observable<E | undefined>;
	/** The entity in the shape Firestore stores it. */
	toModel: (entity: E) => Record<string, unknown>;
	/** The fields the form changed, in the same shape. */
	changed: Record<string, unknown>;
	/**
	 * Where the document sits in the catalog; null when the entity does not
	 * say — an album whose artist is missing has no place to be proposed to.
	 */
	path: (model: Record<string, unknown>) => string | null;
}

/** What a page has to say to turn a form's new entity into a proposal. */
export interface NewProposalInput {
	featureKey: string;
	entityType: EntityTypeEnum;
	/** The entity the form built, in the shape Firestore stores it. */
	entity: Record<string, unknown>;
	/**
	 * What it would go under: an album belongs to an artist, a release to an
	 * album. Null for what lives in the catalog's root — and null too when
	 * the form did not say, which is not something to send.
	 */
	parentPath: (model: Record<string, unknown>) => string | null;
	/** Whether a parent is needed at all. */
	needsParent: boolean;
}

/**
 * The one proposal a collector is making, whatever it is about.
 *
 * There is exactly one at a time on purpose: proposing is a short walk — the
 * form, then what backs it — and a drawer of half-made proposals would be a
 * second thing to manage, for a gain nobody asked for.
 *
 * Kept at the root, because the form navigates away the moment it saves: a
 * proposal held on the route would be torn down with the page that made it.
 */
@Injectable({ providedIn: 'root' })
export class ProposalService {
	/** What the form last proposed; null once it is sent or given up on. */
	public readonly proposal = signal<EntityProposal | null>(null);

	/** Set when the proposal could not even be made. */
	public readonly lastError = signal<string | null>(null);

	/**
	 * Turns a form's save into a proposal. The entity is read once more as
	 * the catalog holds it now, and the two states are kept side by side —
	 * that pair is the whole of what an admin will decide on.
	 */
	public propose<E extends object>({
		featureKey,
		entityType,
		current$,
		toModel,
		changed,
		path,
	}: ProposalInput<E>): void {
		this.lastError.set(null);
		current$.pipe(take(1)).subscribe({
			next: (current) => {
				if (!current) {
					this.lastError.set('missing');

					return;
				}

				const before = toModel(current);
				const target = path(before);

				if (!target) {
					this.lastError.set('unknown-path');

					return;
				}

				this.proposal.set({
					operation: 'update',
					featureKey,
					entityType,
					path: target,
					parentPath: null,
					before,
					// The form hands over the fields it holds; the rest of the
					// entity is unchanged, and has to stay in the proposal or
					// it would read as emptied.
					after: { ...before, ...changed },
					baseUpdatedAt:
						(current as { updatedAt?: number }).updatedAt ?? null,
				});
			},
			error: (error: Error) => {
				console.error('The catalog entity could not be read', error);
				this.lastError.set(error?.message ?? 'failed');
			},
		});
	}

	/**
	 * Turns a form's new entity into a proposal. There is nothing to read
	 * back from the catalog — the entity is not there yet — so what the form
	 * built is the whole of it, and the only question left is where it goes.
	 */
	public proposeNew({
		featureKey,
		entityType,
		entity,
		parentPath,
		needsParent,
	}: NewProposalInput): void {
		this.lastError.set(null);

		const parent = parentPath(entity);

		if (needsParent && !parent) {
			this.lastError.set('unknown-parent');

			return;
		}

		this.proposal.set({
			operation: 'create',
			featureKey,
			entityType,
			path: null,
			parentPath: parent,
			before: null,
			after: entity,
			baseUpdatedAt: null,
		});
	}

	/** The proposal is spent once it is sent, or given up on. */
	public clear(): void {
		this.proposal.set(null);
		this.lastError.set(null);
	}
}
