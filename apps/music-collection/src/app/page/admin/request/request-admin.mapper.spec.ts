import {
	EntityRequest,
	EntityResponse,
	EntityTypeEnum,
	User,
} from '@music-collection/api';

import { toRequestRows } from './request-admin.mapper';
import { formatRequestValue } from '../../../data/request';

const request = (fields: Partial<EntityRequest> = {}): EntityRequest =>
	({
		uid: 'r1',
		userId: 'u1',
		operation: 'create',
		target: {
			featureKey: 'artist',
			entityType: EntityTypeEnum.Artist,
			path: null,
			parentPath: null,
			ownedPath: 'user/u1/owned-artist/a1',
		},
		before: null,
		after: { name: 'Pozvakowski' },
		changes: [
			{
				field: 'name',
				before: null,
				after: 'Pozvakowski',
				reference: null,
			},
		],
		status: 'pending',
		baseUpdatedAt: null,
		note: null,
		createdAt: Date.UTC(2026, 8, 19),
		...fields,
	}) as EntityRequest;

const users: User[] = [{ uid: 'u1', displayName: 'Ági' } as User];

/** The reader's language is not the question here; the key is. */
const translate = (key: string) =>
	key === 'admin.requestField.name' ? 'Név' : key;

describe('formatRequestValue', () => {
	it('shows nothing as an em dash, not as an empty cell', () => {
		expect(formatRequestValue(null)).toBe('—');
		expect(formatRequestValue('')).toBe('—');
		expect(formatRequestValue([])).toBe('—');
	});

	it('spells a list out', () => {
		expect(formatRequestValue(['Doom', 'Sludge'])).toBe('Doom, Sludge');
	});

	it('spells an object out by its filled-in keys', () => {
		expect(formatRequestValue({ artistId: 42, imageUrl: null })).toBe(
			'artistId: 42'
		);
	});
});

describe('toRequestRows', () => {
	it('names the field in the reader language, and falls back to the field', () => {
		const [row] = toRequestRows(
			[
				request({
					changes: [
						{
							field: 'name',
							before: null,
							after: 'Pozvakowski',
							reference: null,
						},
						{
							field: 'whatever',
							before: null,
							after: 'x',
							reference: null,
						},
					],
				}),
			],
			[],
			users,
			translate
		);

		expect(row.fields.map((field) => field.label)).toEqual([
			'Név',
			'whatever',
		]);
	});

	it('names the collector who asked', () => {
		const [row] = toRequestRows([request()], [], users, translate);

		expect(row.requesterName).toBe('Ági');
		expect(row.subject).toBe('Pozvakowski');
	});

	it('turns a reference into something to open', () => {
		const [row] = toRequestRows(
			[
				request({
					changes: [
						{
							field: 'name',
							before: null,
							after: 'Pozvakowski',
							reference: {
								kind: 'discogs',
								value: '12345',
							},
						},
					],
				}),
			],
			[],
			users,
			translate
		);

		expect(row.fields[0].reference).toEqual({
			label: 'discogs: 12345',
			url: 'https://www.discogs.com/artist/12345',
		});
	});

	it('shows what was decided on a request that was answered', () => {
		const response = {
			uid: 'p1',
			requestUid: 'r1',
			userId: 'u1',
			status: 'partially-approved',
			verdicts: [
				{ field: 'name', kind: 'rejected', reason: 'Nincs forrás.' },
			],
			adminNote: 'Köszönjük.',
			appliedPath: 'artist/a1',
			appliedFields: [],
			decidedBy: 'admin-1',
			decidedAt: Date.UTC(2026, 8, 20),
		} as EntityResponse;
		const [row] = toRequestRows(
			[request({ status: 'partially-approved' })],
			[response],
			users,
			translate
		);

		expect(row.pending).toBe(false);
		expect(row.adminNote).toBe('Köszönjük.');
		expect(row.appliedPath).toBe('artist/a1');
		expect(row.fields[0]).toMatchObject({
			verdict: 'rejected',
			reason: 'Nincs forrás.',
		});
	});
});
