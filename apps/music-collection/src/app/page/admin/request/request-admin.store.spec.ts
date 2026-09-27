import { NEVER, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	AuthenticationStateService,
	EntityRequest,
	EntityTypeEnum,
	ReleaseRequest,
	ReleaseStateService,
	User,
} from '@music-collection/api';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { ReleaseRequestEffect } from '../../../data/release-request';
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

const releaseRequest = (fields: Partial<ReleaseRequest> = {}): ReleaseRequest =>
	({
		uid: 'rr1',
		userId: 'u1',
		album: {
			uid: 'al1',
			name: 'Piramis II',
			artistUid: 'ar1',
			artistName: 'Piramis',
		},
		status: 'pending',
		discogsMasterId: null,
		discogsReleaseId: 42,
		pressing: {
			format: 'Vinyl, LP',
			label: 'Pepita',
			catno: 'SLPX 17561',
			country: 'Hungary',
			year: 1978,
		},
		note: null,
		createdAt: 2,
		...fields,
	}) as ReleaseRequest;

interface FakeEffect {
	listAll$: jest.Mock;
	listAllResponses$: jest.Mock;
	listUsers$: jest.Mock;
	decide$: jest.Mock;
}

interface FakeReleaseEffect {
	listAll$: jest.Mock;
	listUsers$: jest.Mock;
	approve$: jest.Mock;
	reject$: jest.Mock;
}

function setUp(
	requests: EntityRequest[] = [request()],
	releaseRequests: ReleaseRequest[] = []
): {
	effect: FakeEffect;
	releaseEffect: FakeReleaseEffect;
	store: InstanceType<typeof RequestAdminStore>;
} {
	const effect: FakeEffect = {
		listAll$: jest.fn(() => of(requests)),
		listAllResponses$: jest.fn(() => of([])),
		listUsers$: jest.fn(() => of([] as User[])),
		decide$: jest.fn(() => of({ status: 'approved' })),
	};
	const releaseEffect: FakeReleaseEffect = {
		listAll$: jest.fn(() => of(releaseRequests)),
		listUsers$: jest.fn(() => of([] as User[])),
		approve$: jest.fn(() => of({})),
		reject$: jest.fn(() => of(undefined)),
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			RequestAdminStore,
			{ provide: RequestEffect, useValue: effect },
			{ provide: ReleaseRequestEffect, useValue: releaseEffect },
			{
				provide: ReleaseStateService,
				useValue: {
					selectEntities$: () => of([]),
					dispatchListEntitiesAction: jest.fn(),
				},
			},
			{
				provide: AuthenticationStateService,
				useValue: {
					selectAuthenticatedUser$: () => of({ uid: 'admin-1' }),
				},
			},
		],
	});

	return {
		effect,
		releaseEffect,
		store: TestBed.inject(RequestAdminStore),
	};
}

describe('RequestAdminStore', () => {
	it('opens on what is waiting for an answer', () => {
		const { store } = setUp([
			request({ uid: 'r1', status: 'pending' }),
			request({ uid: 'r2', status: 'approved' }),
		]);

		expect(store.entries()).toHaveLength(1);
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

		expect(store.entries()).toHaveLength(2);
	});

	it('puts both kinds in one list, newest first', () => {
		const { store } = setUp(
			[request({ uid: 'r1', createdAt: 10 })],
			[
				releaseRequest({ uid: 'rr1', createdAt: 30 }),
				releaseRequest({ uid: 'rr2', createdAt: 20 }),
			]
		);

		expect(store.entries().map((entry) => entry.id)).toEqual([
			'rr1',
			'rr2',
			'r1',
		]);
		expect(store.entries().map((entry) => entry.kind)).toEqual([
			'release',
			'release',
			'catalog',
		]);
	});

	it('narrows to one kind, and counts the kinds at the status on show', () => {
		const { store } = setUp(
			[request({ uid: 'r1' })],
			[releaseRequest({ uid: 'rr1' }), releaseRequest({ uid: 'rr2' })]
		);

		expect(store.kindCounts()).toEqual({ all: 3, catalog: 1, release: 2 });

		store.setKindFilter('release');

		expect(store.entries().map((entry) => entry.id)).toEqual([
			'rr1',
			'rr2',
		]);
		expect(store.counts()).toMatchObject({ pending: 2, all: 2 });
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

	it('approves a release request by importing the pressing', () => {
		const { releaseEffect, store } = setUp([], [releaseRequest()]);

		store.approve({ id: 'rr1', releaseUid: null });

		expect(releaseEffect.approve$).toHaveBeenCalledWith('rr1', null);
		expect(store.busyId()).toBeNull();
	});

	it('rejects a release request in the name of the signed-in admin', () => {
		const { releaseEffect, store } = setUp([], [releaseRequest()]);

		store.reject({ id: 'rr1', note: 'Nincs meg a nyomás.' });

		expect(releaseEffect.reject$).toHaveBeenCalledWith(
			'rr1',
			'Nincs meg a nyomás.',
			'admin-1'
		);
	});

	it('says what went wrong on a release request, as a key to translate', () => {
		const { releaseEffect, store } = setUp([], [releaseRequest()]);

		releaseEffect.approve$.mockReturnValue(
			throwError(() => ({ code: 'functions/unavailable' }))
		);
		store.approve({ id: 'rr1', releaseUid: null });

		expect(store.errors()['rr1']).toBe(
			'ui.releaseRequestAdmin.error-discogs-unreachable'
		);
	});
});
