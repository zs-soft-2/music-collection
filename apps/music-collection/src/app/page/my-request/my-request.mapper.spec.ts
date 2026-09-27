import {
	EntityRequest,
	EntityResponse,
	EntityTypeEnum,
} from '@music-collection/api';

import { toMyRequestRows, toReleaseRequestRow } from './my-request.mapper';

const request = (fields: Partial<EntityRequest> = {}): EntityRequest =>
	({
		uid: 'r1',
		userId: 'u1',
		operation: 'update',
		target: {
			featureKey: 'artist',
			entityType: EntityTypeEnum.Artist,
			path: 'artist/a1',
			parentPath: null,
			ownedPath: null,
		},
		before: { name: 'Pozvakowski', country: 'Hungary' },
		after: { name: 'Pozvakowski', country: 'Germany' },
		changes: [
			{
				field: 'country',
				before: 'Hungary',
				after: 'Germany',
				reference: { kind: 'url', value: 'https://one.test' },
			},
		],
		status: 'pending',
		baseUpdatedAt: 17,
		note: null,
		createdAt: Date.UTC(2026, 8, 19),
		...fields,
	}) as EntityRequest;

const response = (fields: Partial<EntityResponse> = {}): EntityResponse =>
	({
		uid: 'p1',
		requestUid: 'r1',
		userId: 'u1',
		status: 'rejected',
		verdicts: [
			{
				field: 'country',
				kind: 'rejected',
				reason: 'A lemez hátulján más áll.',
			},
		],
		adminNote: null,
		appliedPath: null,
		appliedFields: [],
		decidedBy: 'admin-1',
		decidedAt: Date.UTC(2026, 8, 20),
		...fields,
	}) as EntityResponse;

describe('toReleaseRequestRow', () => {
	const releaseRequest = {
		uid: 'rr1',
		userId: 'u1',
		album: { uid: 'b1', name: 'Presence', artistName: 'Led Zeppelin' },
		status: 'pending',
		pressing: {
			format: 'Vinyl, LP',
			label: 'Swan Song',
			catno: 'SS 8416',
			country: 'UK',
			year: 1976,
		},
		note: null,
		createdAt: Date.UTC(2026, 8, 18),
	} as unknown as Parameters<typeof toReleaseRequestRow>[0];

	it('reads as one of the collector own requests', () => {
		const row = toReleaseRequestRow(releaseRequest);

		expect(row).toMatchObject({
			id: 'rr1',
			status: 'pending',
			entityType: 'Release',
			subject: 'Presence — Led Zeppelin',
			operationLabelKey: 'page.my-request.new-release',
			summary: 'Vinyl, LP · Swan Song (SS 8416) · UK · 1976',
			fields: [],
		});
	});
});

describe('toMyRequestRows', () => {
	it('shows a request still waiting without a verdict on its fields', () => {
		const [row] = toMyRequestRows([request()], []);

		expect(row).toMatchObject({
			status: 'pending',
			statusLabelKey: 'page.my-request.status-pending',
			operationLabelKey: 'page.my-request.change',
			subject: 'Pozvakowski',
			answeredOn: null,
		});
		expect(row.fields[0]).toMatchObject({
			before: 'Hungary',
			after: 'Germany',
			reference: 'https://one.test',
			verdict: null,
			reason: null,
		});
	});

	it('carries the reason of a refusal — that is what can be answered', () => {
		const [row] = toMyRequestRows(
			[request({ status: 'rejected', decidedAt: Date.UTC(2026, 8, 20) })],
			[response()]
		);

		expect(row.statusLabelKey).toBe('page.my-request.status-rejected');
		expect(row.answeredOn).toMatch(/^20 Sept? 2026$/);
		expect(row.fields[0]).toMatchObject({
			verdict: 'rejected',
			reason: 'A lemez hátulján más áll.',
		});
	});

	it('passes the admin word on to the collector it was written for', () => {
		const [row] = toMyRequestRows(
			[request({ status: 'partially-approved' })],
			[response({ adminNote: 'Köszönjük.' })]
		);

		expect(row.adminNote).toBe('Köszönjük.');
		expect(row.statusLabelKey).toBe('page.my-request.status-partly');
	});
});
