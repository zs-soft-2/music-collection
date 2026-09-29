import { EntityRequest, EntityTypeEnum } from '@music-collection/api';

import { pendingFieldsFor } from './pending-proposal.service';

const request = (over: Partial<EntityRequest> = {}): EntityRequest =>
	({
		uid: 'r1',
		userId: 'u1',
		operation: 'update',
		target: {
			featureKey: 'album',
			entityType: EntityTypeEnum.Album,
			path: 'artist/a1/album/b2',
			parentPath: null,
			ownedPath: null,
		},
		before: {},
		after: {},
		changes: [
			{
				field: 'coverImageUrl',
				before: null,
				after: 'https://example.test/cover.jpg',
				reference: null,
			},
		],
		status: 'pending',
		baseUpdatedAt: null,
		note: null,
		createdAt: 1,
		...over,
	}) as EntityRequest;

describe('pendingFieldsFor', () => {
	it('finds the document at the end of the path it was asked about', () => {
		expect(pendingFieldsFor([request()], 'album', 'b2')).toEqual([
			'coverImageUrl',
		]);
	});

	it('finds one that sits in the catalog root', () => {
		const artist = request({
			target: {
				featureKey: 'artist',
				entityType: EntityTypeEnum.Artist,
				path: 'artist/a1',
				parentPath: null,
				ownedPath: null,
			},
			changes: [
				{
					field: 'formedIn',
					before: null,
					after: '1988-01-01',
					reference: null,
				},
			],
		});

		expect(pendingFieldsFor([artist], 'artist', 'a1')).toEqual([
			'formedIn',
		]);
	});

	it('does not take the parent in the path for the document itself', () => {
		expect(pendingFieldsFor([request()], 'artist', 'a1')).toEqual([]);
	});

	it('leaves out what has been decided', () => {
		expect(
			pendingFieldsFor([request({ status: 'approved' })], 'album', 'b2')
		).toEqual([]);
	});

	it('leaves out a new entity, which is about no document yet', () => {
		const created = request({
			operation: 'create',
			target: {
				featureKey: 'album',
				entityType: EntityTypeEnum.Album,
				path: null,
				parentPath: 'artist/a1',
				ownedPath: null,
			},
		});

		expect(pendingFieldsFor([created], 'album', 'b2')).toEqual([]);
	});

	it('names a field once, however many requests touch it', () => {
		const second = request({
			uid: 'r2',
			changes: [
				{
					field: 'coverImageUrl',
					before: null,
					after: 'https://example.test/other.jpg',
					reference: null,
				},
				{ field: 'year', before: 1990, after: 1991, reference: null },
			],
		});

		expect(pendingFieldsFor([request(), second], 'album', 'b2')).toEqual([
			'coverImageUrl',
			'year',
		]);
	});

	it('asks nothing when the page has no entity to ask about', () => {
		expect(pendingFieldsFor([request()], 'album', null)).toEqual([]);
	});
});
