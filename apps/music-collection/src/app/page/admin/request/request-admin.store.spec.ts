import { NEVER, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { EntityRequest, EntityTypeEnum } from '@music-collection/api';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { RequestEffect } from '../../../data/request';
import { RequestAdminStore } from './request-admin.store';

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
		after: { name: 'Pozvakowski', country: 'Hungary' },
		changes: [
			{
				field: 'country',
				before: null,
				after: 'Hungary',
				reference: null,
			},
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
		createdAt: 1,
		...fields,
	}) as EntityRequest;

interface FakeEffect {
	listAll$: jest.Mock;
	listAllResponses$: jest.Mock;
	listUsers$: jest.Mock;
	decide$: jest.Mock;
}

function setUp(requests: EntityRequest[] = [request()]): {
	effect: FakeEffect;
	store: InstanceType<typeof RequestAdminStore>;
} {
	const effect: FakeEffect = {
		listAll$: jest.fn(() => of(requests)),
		listAllResponses$: jest.fn(() => of([])),
		listUsers$: jest.fn(() => of([])),
		decide$: jest.fn(() => of({ status: 'approved' })),
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			RequestAdminStore,
			{ provide: RequestEffect, useValue: effect },
		],
	});

	return { effect, store: TestBed.inject(RequestAdminStore) };
}

describe('RequestAdminStore', () => {
	it('opens on what is waiting for an answer', () => {
		const { store } = setUp([
			request({ uid: 'r1', status: 'pending' }),
			request({ uid: 'r2', status: 'approved' }),
		]);

		expect(store.rows()).toHaveLength(1);
		expect(store.counts()).toMatchObject({
			pending: 1,
			approved: 1,
			all: 2,
		});
	});

	it('shows the rest when asked', () => {
		const { store } = setUp([
			request({ uid: 'r1', status: 'pending' }),
			request({ uid: 'r2', status: 'rejected' }),
		]);

		store.setStatusFilter('all');

		expect(store.rows()).toHaveLength(2);
	});

	it('holds the half-made decision until it is sent', () => {
		const { store } = setUp();

		store.setVerdict({ requestId: 'r1', field: 'name', kind: 'rejected' });
		store.setReason({
			requestId: 'r1',
			field: 'name',
			reason: 'Nincs forrás.',
		});

		expect(store.drafts()['r1']['name']).toEqual({
			kind: 'rejected',
			reason: 'Nincs forrás.',
		});
	});

	it('sends the decision field by field, with the reasons', () => {
		const { effect, store } = setUp();

		store.setVerdict({ requestId: 'r1', field: 'name', kind: 'accepted' });
		store.setVerdict({
			requestId: 'r1',
			field: 'country',
			kind: 'rejected',
		});
		store.setReason({
			requestId: 'r1',
			field: 'country',
			reason: '  Nincs forrás.  ',
		});
		store.setAdminNote({ requestId: 'r1', note: '  Köszönjük.  ' });
		store.decide('r1');

		expect(effect.decide$).toHaveBeenCalledWith({
			requestId: 'r1',
			verdicts: [
				{ field: 'name', kind: 'accepted', reason: null },
				{ field: 'country', kind: 'rejected', reason: 'Nincs forrás.' },
			],
			adminNote: 'Köszönjük.',
		});
	});

	it('lets the decision go once it is sent', () => {
		const { store } = setUp();

		store.setVerdict({ requestId: 'r1', field: 'name', kind: 'accepted' });
		store.decide('r1');

		expect(store.drafts()['r1']).toBeUndefined();
		expect(store.busyId()).toBeNull();
	});

	it('decides one request at a time', () => {
		const { effect, store } = setUp();

		effect.decide$.mockReturnValue(NEVER);
		store.decide('r1');
		store.decide('r2');

		expect(effect.decide$).toHaveBeenCalledTimes(1);
	});

	it('keeps the half-made decision when the send fails, and says why', () => {
		const { effect, store } = setUp();

		effect.decide$.mockReturnValue(
			throwError(() => ({ code: 'functions/failed-precondition' }))
		);
		store.setVerdict({ requestId: 'r1', field: 'name', kind: 'accepted' });
		store.decide('r1');

		expect(store.errors()['r1']).toBe('ui.requestAdmin.error-moved-on');
		expect(store.drafts()['r1']).toBeDefined();
		expect(store.busyId()).toBeNull();
	});

	it('has a word for a failure it does not know', () => {
		const { effect, store } = setUp();

		effect.decide$.mockReturnValue(throwError(() => new Error('boom')));
		store.decide('r1');

		expect(store.errors()['r1']).toBe('ui.requestAdmin.error-unknown');
	});
});
