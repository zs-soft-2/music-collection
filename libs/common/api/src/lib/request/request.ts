/**
 * What a collector asks the catalog to take in: a new entity, or a change to
 * one that is already there.
 *
 * A collector may not write the catalog. What they enter lives under their
 * own user document (`user/{uid}/owned-*`, `meta.ownerId`), and it earns its
 * place in the shared catalog by being approved, not by being saved. The
 * request is that asking, and it is the same shape for every kind of entity:
 * the state it was made from, the state it asks for, and field by field what
 * the collector offers as proof.
 *
 * The answer is an `EntityResponse`: field by field what an admin accepted,
 * and — with a reason for each — what they did not.
 *
 * The names keep clear of `Request` and `Response`, which are globals of the
 * DOM. A forgotten import would otherwise compile against the types of
 * `fetch` rather than these, and say nothing about it.
 */

import { EntityTypeEnum } from '../entity';

/** The collector's requests: `entity-request/{uid}`. */
export const ENTITY_REQUEST_FEATURE_KEY = 'entity-request';

/** The answers to them: `entity-response/{uid}`. */
export const ENTITY_RESPONSE_FEATURE_KEY = 'entity-response';

/**
 * How many fields one request may carry; the rules cap it at the same
 * number. An admin decides a request field by field, reading it whole — a
 * request that grows without a bound is one nobody can answer.
 */
export const MAX_ENTITY_REQUEST_CHANGES = 40;

/**
 * How long the collector's own words about a request may be — the note of a
 * catalog request and of a release request alike; the rules cap both at the
 * same number.
 *
 * A note without a bound is a request filling the megabyte a document holds,
 * and the pending list pays for it at every opening: an admin's page reads
 * every request that waits for a decision, and a collector's page reads all
 * of their own.
 */
export const MAX_REQUEST_NOTE_LENGTH = 500;

export type EntityRequestOperation = 'create' | 'update';

/**
 * `partially-approved`: some fields went into the catalog and some did not.
 * It is a decided request like the other two — what was refused is answered
 * in the response, field by field, and the collector may ask again with
 * better grounds.
 */
export type EntityRequestStatus =
	'pending' | 'approved' | 'partially-approved' | 'rejected';

export const ENTITY_REQUEST_STATUSES: EntityRequestStatus[] = [
	'pending',
	'approved',
	'partially-approved',
	'rejected',
];

export type EntityRequestVerdictKind = 'accepted' | 'rejected';

export type EntityReferenceKind =
	'url' | 'discogs' | 'musicbrainz' | 'photo' | 'note';

/** What a collector offers in support of a field. */
export interface EntityRequestReference {
	kind: EntityReferenceKind;
	/** A URL, an id on that service, a storage path, or the collector's own words. */
	value: string;
}

/** One field the request would have the catalog hold differently. */
export interface EntityRequestChange {
	/**
	 * A field of the document, at its top level. What sits inside one — the
	 * `discogs` block, say — is decided whole, because that is how an admin
	 * reads it: whether the Discogs id belongs to this band is one question,
	 * not one per key.
	 */
	field: string;
	/** What the catalog holds now; null on a create. */
	before: unknown;
	after: unknown;
	/**
	 * What backs the change. Required on an update — asking the catalog to
	 * change its mind is asking on some grounds — and optional on a create,
	 * where the request as a whole carries the reason.
	 */
	reference: EntityRequestReference | null;
}

/** Which catalog document the request is about. */
export interface EntityRequestTarget {
	/** The catalog feature: `artist`, `album`, `release`, … */
	featureKey: string;
	entityType: EntityTypeEnum;
	/** The catalog document on an update; null on a create. */
	path: string | null;
	/** What a new document goes under, e.g. `artist/{uid}` for an album. */
	parentPath: string | null;
	/** The collector's own copy it was made from, if there is one. */
	ownedPath: string | null;
}

export interface EntityRequest {
	uid: string;
	/** The collector who asked. */
	userId: string;
	operation: EntityRequestOperation;
	target: EntityRequestTarget;
	/**
	 * The two states, kept whole rather than pointed at.
	 *
	 * A decision is about what was submitted. The collector goes on editing
	 * their own copy, and the catalog goes on being edited by others; if the
	 * request only pointed at those, what an admin decided on could change
	 * under them between the reading and the click. `before` is null on a
	 * create — there is nothing there yet to differ from.
	 */
	before: Record<string, unknown> | null;
	after: Record<string, unknown>;
	changes: EntityRequestChange[];
	status: EntityRequestStatus;
	/**
	 * `updatedAt` of the catalog document when the request was made, in epoch
	 * milliseconds; null on a create. What it is for: the decision can tell
	 * whether the catalog moved on since, and refuse to write a field over an
	 * answer nobody has seen.
	 */
	baseUpdatedAt: number | null;
	/** The collector's own words about the request as a whole. */
	note: string | null;
	/** Epoch milliseconds. */
	createdAt: number;
	/** Last write in epoch milliseconds (FirestoreSyncService). */
	updatedAt?: number;
	/** Set when decided, by the server: the answer and who wrote it. */
	responseUid?: string;
	decidedAt?: number;
	decidedBy?: string;
}

/**
 * A request as the collector makes it. Everything about the decision is the
 * server's to write, and the id is the document's own.
 */
export type EntityRequestAdd = Omit<
	EntityRequest,
	'uid' | 'updatedAt' | 'responseUid' | 'decidedAt' | 'decidedBy'
>;

/** Callable name of the decision (apps/functions). */
export const DECIDE_REQUEST_FUNCTION = 'decideRequest';

export interface DecideRequestInput {
	requestId: string;
	/** One verdict per field of the request, no more and no fewer. */
	verdicts: EntityRequestVerdict[];
	/** A word about the request as a whole; optional. */
	adminNote?: string | null;
}

export interface DecideRequestResult {
	requestId: string;
	responseUid: string;
	status: EntityRequestStatus;
	/** The catalog document the decision wrote, if it wrote one. */
	appliedPath: string | null;
	appliedFields: string[];
}

export interface EntityRequestVerdict {
	field: string;
	kind: EntityRequestVerdictKind;
	/**
	 * Required on a rejection, and only there. A refusal the collector cannot
	 * read the grounds of is not an answer, so the decision is refused
	 * without it.
	 */
	reason: string | null;
}

/** The admin's answer to a request, field by field. */
export interface EntityResponse {
	uid: string;
	requestUid: string;
	/** The collector the answer is for; they read it, and no other collector does. */
	userId: string;
	/** What the request ended as — the same value it was set to. */
	status: EntityRequestStatus;
	verdicts: EntityRequestVerdict[];
	/** A word about the request as a whole, beside the per-field reasons. */
	adminNote: string | null;
	/** The catalog document the decision wrote, once it wrote one. */
	appliedPath: string | null;
	/** The fields that actually went in. */
	appliedFields: string[];
	decidedBy: string;
	/** Epoch milliseconds. */
	decidedAt: number;
	updatedAt?: number;
}
