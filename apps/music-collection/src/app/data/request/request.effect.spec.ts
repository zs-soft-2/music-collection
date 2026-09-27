import { firstValueFrom, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	AnalyticsService,
	AuthenticatedUserService,
	EntityRequest,
	EntityRequestAdd,
	EntityTypeEnum,
} from '@music-collection/api';

import { RequestEffect } from './request.effect';
import { RequestRepository } from './request.repository';

const band = {
	uid: 'a1',
	entityType: EntityTypeEnum.Artist,
	meta: { ownerId: 'u1' },
	updatedAt: 17,
	name: 'Pozvakowski',
	country: 'HU',
	description: '',
};

const asked = (fields: Partial<EntityRequest> = {}): EntityRequest =>
	({ uid: 'r1', createdAt: 1, ...fields }) as EntityRequest;

interface FakeRepository {
	add$: jest.Mock;
	listByUser$: jest.Mock;
}

function setUp(
	signedIn: { uid: string } | null = { uid: 'u1' },
	held: EntityRequest[] = []
): {
	effect: RequestEffect;
	repository: FakeRepository;
	tracked: jest.Mock;
} {
	const repository: FakeRepository = {
		add$: jest.fn((request: EntityRequestAdd) =>
			of({ ...request, uid: 'r1' })
		),
		listByUser$: jest.fn(() => of(held)),
	};
	const tracked = jest.fn();

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			RequestEffect,
			{ provide: RequestRepository, useValue: repository },
			{ provide: AnalyticsService, useValue: { track: tracked } },
			{
				provide: AuthenticatedUserService,
				useValue: { user$: of(signedIn) },
			},
		],
	});

	return { effect: TestBed.inject(RequestEffect), repository, tracked };
}

const submit = (
	effect: RequestEffect,
	entity: Record<string, unknown> = band
) =>
	effect.submitOwned$({
		featureKey: 'artist',
		entityType: EntityTypeEnum.Artist,
		entity: entity as Record<string, unknown> & { uid: string },
	});

describe('RequestEffect', () => {
	it('asks for what the collector saved, field by field', async () => {
		const { effect, repository } = setUp();

		await firstValueFrom(submit(effect));

		expect(repository.add$).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'u1',
				operation: 'create',
				status: 'pending',
				before: null,
				// The snapshot is what was submitted, empty fields and all;
				// only the changes leave them out.
				after: {
					name: 'Pozvakowski',
					country: 'HU',
					description: '',
				},
				baseUpdatedAt: null,
			})
		);
		expect(repository.add$.mock.calls[0][0].changes).toEqual([
			{ field: 'country', before: null, after: 'HU', reference: null },
			{
				field: 'name',
				before: null,
				after: 'Pozvakowski',
				reference: null,
			},
		]);
	});

	it('says where the collector keeps their own copy', async () => {
		const { effect, repository } = setUp();

		await firstValueFrom(submit(effect));

		expect(repository.add$.mock.calls[0][0].target).toEqual({
			featureKey: 'artist',
			entityType: EntityTypeEnum.Artist,
			path: null,
			parentPath: null,
			ownedPath: 'user/u1/owned-artist/a1',
		});
	});

	it('does not ask on behalf of a visitor', async () => {
		const { effect, repository } = setUp(null);

		await expect(firstValueFrom(submit(effect))).rejects.toThrow();
		expect(repository.add$).not.toHaveBeenCalled();
	});

	it('does not send an entity with nothing in it', async () => {
		const { effect, repository } = setUp();

		await expect(
			firstValueFrom(submit(effect, { uid: 'a1', name: '' }))
		).rejects.toThrow();
		expect(repository.add$).not.toHaveBeenCalled();
	});

	it('counts a request only once it is written', async () => {
		const { effect, repository, tracked } = setUp();

		repository.add$.mockReturnValue(throwError(() => new Error('denied')));

		await expect(firstValueFrom(submit(effect))).rejects.toThrow();
		expect(tracked).not.toHaveBeenCalled();
	});

	it('counts what was asked for, not what it was about', async () => {
		const { effect, tracked } = setUp();

		await firstValueFrom(submit(effect));

		expect(tracked).toHaveBeenCalledWith('entity_request_submitted', {
			featureKey: 'artist',
			operation: 'create',
		});
	});

	it('asks for a change with what backs each field', async () => {
		const { effect, repository } = setUp();

		await firstValueFrom(
			effect.submitUpdate$({
				featureKey: 'artist',
				entityType: EntityTypeEnum.Artist,
				path: 'artist/a1',
				before: { uid: 'a1', name: 'Pozvakowski', country: 'HU' },
				after: { uid: 'a1', name: 'Pozvakowski', country: 'DE' },
				references: {
					country: { kind: 'url', value: 'https://example.test/1' },
				},
				baseUpdatedAt: 17,
			})
		);

		const request = repository.add$.mock.calls[0][0];

		expect(request).toMatchObject({
			operation: 'update',
			baseUpdatedAt: 17,
			target: expect.objectContaining({ path: 'artist/a1' }),
		});
		expect(request.changes).toEqual([
			{
				field: 'country',
				before: 'HU',
				after: 'DE',
				reference: { kind: 'url', value: 'https://example.test/1' },
			},
		]);
	});

	it('refuses a change with nothing behind it', async () => {
		const { effect, repository } = setUp();

		await expect(
			firstValueFrom(
				effect.submitUpdate$({
					featureKey: 'artist',
					entityType: EntityTypeEnum.Artist,
					path: 'artist/a1',
					before: { uid: 'a1', country: 'HU' },
					after: { uid: 'a1', country: 'DE' },
					references: {},
					baseUpdatedAt: null,
				})
			)
		).rejects.toThrow(/reference/);
		expect(repository.add$).not.toHaveBeenCalled();
	});

	it('refuses an unchanged artist as a change', async () => {
		const { effect, repository } = setUp();

		await expect(
			firstValueFrom(
				effect.submitUpdate$({
					featureKey: 'artist',
					entityType: EntityTypeEnum.Artist,
					path: 'artist/a1',
					before: { uid: 'a1', country: 'HU' },
					after: { uid: 'a1', country: 'HU' },
					references: {},
					baseUpdatedAt: null,
				})
			)
		).rejects.toThrow(/nothing to submit/);
		expect(repository.add$).not.toHaveBeenCalled();
	});

	it('hands the requests over newest first', async () => {
		const { effect } = setUp({ uid: 'u1' }, [
			asked({ uid: 'r1', createdAt: 1 }),
			asked({ uid: 'r2', createdAt: 2 }),
		]);

		await expect(firstValueFrom(effect.listMine$())).resolves.toMatchObject(
			[{ uid: 'r2' }, { uid: 'r1' }]
		);
	});

	it('answers a visitor with no requests at all', async () => {
		const { effect, repository } = setUp(null);

		await expect(firstValueFrom(effect.listMine$())).resolves.toEqual([]);
		expect(repository.listByUser$).not.toHaveBeenCalled();
	});
});
