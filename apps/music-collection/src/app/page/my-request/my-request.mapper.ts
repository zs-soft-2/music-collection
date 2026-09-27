import {
	EntityRequest,
	EntityRequestStatus,
	EntityRequestVerdictKind,
	EntityResponse,
	ReleaseRequest,
} from '@music-collection/api';

import { formatRequestValue, requestFieldLabelKey } from '../../data/request';

/** One field of a request, as the collector reads the answer to it. */
export interface MyRequestFieldRow {
	field: string;
	labelKey: string;
	before: string;
	after: string;
	/** What the collector offered in support of it. */
	reference: string | null;
	/** Null while the request is still waiting for an answer. */
	verdict: EntityRequestVerdictKind | null;
	/** Why it was refused — the whole point of the answer. */
	reason: string | null;
}

export interface MyRequestRow {
	id: string;
	status: EntityRequestStatus;
	statusLabelKey: string;
	/** `create` or `update`, for the one-word label beside the name. */
	operationLabelKey: string;
	entityType: string;
	subject: string;
	/** e.g. "19 Sep 2026". */
	askedOn: string;
	answeredOn: string | null;
	note: string | null;
	adminNote: string | null;
	/** What was asked for in one line, where there are no fields to show. */
	summary: string | null;
	/** True where there is nothing to compare against: a new entity. */
	isNew: boolean;
	/** Everything that was asked, kept folded away. */
	fields: MyRequestFieldRow[];
	/** The fields that were turned down — the part worth reading at once. */
	refused: MyRequestFieldRow[];
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
});

const STATUS_LABELS: Record<EntityRequestStatus, string> = {
	pending: 'page.my-request.status-pending',
	approved: 'page.my-request.status-approved',
	'partially-approved': 'page.my-request.status-partly',
	rejected: 'page.my-request.status-rejected',
};

function formatDate(ms: number | undefined): string | null {
	return ms ? DATE_FORMAT.format(new Date(ms)) : null;
}

function subjectOf(request: EntityRequest): string {
	const name = request.after?.['name'] ?? request.before?.['name'];

	return typeof name === 'string' && name ? name : request.uid;
}

/** What the collector asked for, in one line: the pressing as they saw it. */
function pressingSummary(request: ReleaseRequest): string | null {
	const pressing = request.pressing;
	const label = pressing?.label
		? pressing.catno
			? `${pressing.label} (${pressing.catno})`
			: pressing.label
		: null;
	const parts = [pressing?.format, label, pressing?.country, pressing?.year]
		.filter((part) => part !== null && part !== undefined && part !== '')
		.join(' · ');

	return parts || null;
}

/**
 * A release request as one of the collector's requests.
 *
 * It is a different thing under the surface — it asks the catalog to import a
 * pressing from Discogs, not to hold a value differently — but from where the
 * collector stands it is the same act, and the answer comes back the same
 * way. So they are read in one list, and the difference stays where it
 * belongs: in what approving one does.
 */
export function toReleaseRequestRow(request: ReleaseRequest): MyRequestRow {
	const artist = request.album?.artistName;

	return {
		id: request.uid,
		status: request.status,
		statusLabelKey: STATUS_LABELS[request.status],
		operationLabelKey: 'page.my-request.new-release',
		entityType: 'Release',
		subject: [request.album?.name, artist].filter(Boolean).join(' — '),
		askedOn: formatDate(request.createdAt) ?? '',
		answeredOn: formatDate(request.decidedAt),
		note: request.note ?? null,
		adminNote: request.adminNote ?? null,
		summary: pressingSummary(request),
		isNew: true,
		fields: [],
		refused: [],
	};
}

export function toMyRequestRows(
	requests: EntityRequest[],
	responses: EntityResponse[]
): MyRequestRow[] {
	const byRequest = new Map(
		responses.map((response) => [response.requestUid, response])
	);

	return requests.map((request) => {
		const response = byRequest.get(request.uid) ?? null;
		const verdicts = new Map(
			(response?.verdicts ?? []).map((verdict) => [
				verdict.field,
				verdict,
			])
		);

		const fields: MyRequestFieldRow[] = (request.changes ?? []).map(
			(change) => ({
				field: change.field,
				labelKey: requestFieldLabelKey(change.field),
				before: formatRequestValue(change.before),
				after: formatRequestValue(change.after),
				reference: change.reference?.value ?? null,
				verdict: verdicts.get(change.field)?.kind ?? null,
				reason: verdicts.get(change.field)?.reason ?? null,
			})
		);

		return {
			id: request.uid,
			status: request.status,
			statusLabelKey: STATUS_LABELS[request.status],
			summary: null,
			operationLabelKey:
				request.operation === 'create'
					? 'page.my-request.new-entity'
					: 'page.my-request.change',
			entityType: request.target?.entityType ?? '',
			subject: subjectOf(request),
			askedOn: formatDate(request.createdAt) ?? '',
			answeredOn: formatDate(request.decidedAt),
			note: request.note,
			adminNote: response?.adminNote ?? null,
			isNew: request.operation === 'create',
			fields,
			refused: fields.filter((field) => field.verdict === 'rejected'),
		};
	});
}
