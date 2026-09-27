import {
	EntityRequest,
	EntityRequestChange,
	EntityRequestOperation,
	EntityRequestStatus,
	EntityRequestVerdictKind,
	EntityResponse,
	User,
} from '@music-collection/api';

import {
	formatRequestValue,
	requestFieldLabelKey,
} from '../../../data/request';

export type StatusFilter = EntityRequestStatus | 'all';

/** What the collector offers in support of a field, ready to show. */
export interface ReferenceView {
	label: string;
	/** Set when the reference is something to open. */
	url: string | null;
}

/** One field of a request, as the admin decides on it. */
export interface RequestFieldRow {
	field: string;
	/** The field's name in the reader's language, or the field itself. */
	label: string;
	/** What the catalog holds now; an em dash when it holds nothing. */
	before: string;
	after: string;
	reference: ReferenceView | null;
	/** The decision already made, on a request that was answered. */
	verdict: EntityRequestVerdictKind | null;
	reason: string | null;
}

export interface RequestRow {
	id: string;
	status: EntityRequestStatus;
	operation: EntityRequestOperation;
	/** What kind of entity it is about, e.g. `Artist`. */
	entityType: string;
	/** What it is about by name, as far as the request says. */
	subject: string;
	requesterName: string;
	/** e.g. "19 Sep 2026". */
	requestedOn: string;
	decidedOn: string | null;
	note: string | null;
	adminNote: string | null;
	/** Where the decision put it, on a request that was taken in. */
	appliedPath: string | null;
	fields: RequestFieldRow[];
	/** Still waiting for an answer. */
	pending: boolean;
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
});

function formatDate(ms: number | undefined): string | null {
	return ms ? DATE_FORMAT.format(new Date(ms)) : null;
}

const REFERENCE_URLS: Record<string, (value: string) => string> = {
	discogs: (value) => `https://www.discogs.com/artist/${value}`,
	musicbrainz: (value) => `https://musicbrainz.org/artist/${value}`,
};

function toReference(change: EntityRequestChange): ReferenceView | null {
	const reference = change.reference;

	if (!reference?.value) {
		return null;
	}
	if (reference.kind === 'url') {
		return { label: reference.value, url: reference.value };
	}

	const url = REFERENCE_URLS[reference.kind];

	return {
		label: `${reference.kind}: ${reference.value}`,
		url: url ? url(reference.value) : null,
	};
}

function requesterName(userId: string, users: Map<string, User>): string {
	const user = users.get(userId);

	return user?.displayName || user?.email || userId;
}

/**
 * What the request is about by name. The name is the one field almost every
 * entity has, and on a create it is the only thing that tells two requests
 * apart in a list.
 */
function subjectOf(request: EntityRequest): string {
	const name = request.after?.['name'] ?? request.before?.['name'];

	return typeof name === 'string' && name ? name : request.uid;
}

export function toRequestRows(
	requests: EntityRequest[],
	responses: EntityResponse[],
	users: User[],
	translate: (key: string) => string
): RequestRow[] {
	const usersById = new Map(users.map((user) => [user.uid, user]));
	const responsesByRequest = new Map(
		responses.map((response) => [response.requestUid, response])
	);

	return requests.map((request) => {
		const response = responsesByRequest.get(request.uid) ?? null;
		const verdicts = new Map(
			(response?.verdicts ?? []).map((verdict) => [
				verdict.field,
				verdict,
			])
		);

		return {
			id: request.uid,
			status: request.status,
			operation: request.operation,
			entityType: request.target?.entityType ?? '',
			subject: subjectOf(request),
			requesterName: requesterName(request.userId, usersById),
			requestedOn: formatDate(request.createdAt) ?? '',
			decidedOn: formatDate(request.decidedAt),
			note: request.note,
			adminNote: response?.adminNote ?? null,
			appliedPath: response?.appliedPath ?? null,
			pending: request.status === 'pending',
			fields: (request.changes ?? []).map((change) => {
				const key = requestFieldLabelKey(change.field);
				const label = translate(key);

				return {
					field: change.field,
					// A field nobody has named yet reads better as itself
					// than as the key that was looked for.
					label: label === key ? change.field : label,
					before: formatRequestValue(change.before),
					after: formatRequestValue(change.after),
					reference: toReference(change),
					verdict: verdicts.get(change.field)?.kind ?? null,
					reason: verdicts.get(change.field)?.reason ?? null,
				};
			}),
		};
	});
}
