import { of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { EntityTypeEnum } from '@music-collection/api';

import { ProposalService } from './proposal.service';

interface Band {
	uid: string;
	name: string;
	country: string;
	updatedAt?: number;
}

const held: Band = {
	uid: 'a1',
	name: 'Pozvakowski',
	country: 'Hungary',
	updatedAt: 17,
};

function setUp(): ProposalService {
	TestBed.resetTestingModule();
	TestBed.configureTestingModule({ providers: [ProposalService] });

	return TestBed.inject(ProposalService);
}

const propose = (
	service: ProposalService,
	current: Band | undefined,
	changed: Record<string, unknown> = { country: 'Germany' },
	path: (model: Record<string, unknown>) => string | null = (model) =>
		`artist/${String(model['uid'])}`
) =>
	service.propose<Band>({
		featureKey: 'artist',
		entityType: EntityTypeEnum.Artist,
		current$: of(current),
		toModel: (entity) => ({ ...entity }),
		changed,
		path,
	});

describe('ProposalService', () => {
	it('keeps both states side by side, and writes nothing', () => {
		const service = setUp();

		propose(service, held);

		expect(service.proposal()).toMatchObject({
			featureKey: 'artist',
			path: 'artist/a1',
			baseUpdatedAt: 17,
			before: { country: 'Hungary', name: 'Pozvakowski' },
			// Untouched fields stay in the proposal, or they would read as
			// emptied.
			after: { country: 'Germany', name: 'Pozvakowski' },
		});
	});

	it('says so when the entity is not in the catalog any more', () => {
		const service = setUp();

		propose(service, undefined);

		expect(service.proposal()).toBeNull();
		expect(service.lastError()).toBe('missing');
	});

	it('says so when the entity does not say where it sits', () => {
		const service = setUp();

		propose(service, held, { country: 'Germany' }, () => null);

		expect(service.proposal()).toBeNull();
		expect(service.lastError()).toBe('unknown-path');
	});

	it('says so when the catalog cannot be read', () => {
		const service = setUp();

		service.propose<Band>({
			featureKey: 'artist',
			entityType: EntityTypeEnum.Artist,
			current$: throwError(() => new Error('denied')),
			toModel: (entity) => ({ ...entity }),
			changed: {},
			path: () => 'artist/a1',
		});

		expect(service.proposal()).toBeNull();
		expect(service.lastError()).toBe('denied');
	});

	it('takes a new entity as it was filled in, with nothing to differ from', () => {
		const service = setUp();

		service.proposeNew({
			featureKey: 'artist',
			entityType: EntityTypeEnum.Artist,
			entity: { name: 'Pozvakowski' },
			parentPath: () => null,
			needsParent: false,
		});

		expect(service.proposal()).toMatchObject({
			operation: 'create',
			path: null,
			parentPath: null,
			before: null,
			after: { name: 'Pozvakowski' },
		});
	});

	it('puts a new entity under the one it belongs to', () => {
		const service = setUp();

		service.proposeNew({
			featureKey: 'album',
			entityType: EntityTypeEnum.Album,
			entity: { name: 'Presence', artist: { uid: 'a1' } },
			parentPath: (model) =>
				`artist/${String((model['artist'] as { uid: string }).uid)}`,
			needsParent: true,
		});

		expect(service.proposal()).toMatchObject({
			operation: 'create',
			parentPath: 'artist/a1',
		});
	});

	it('will not take one that does not say where it belongs', () => {
		const service = setUp();

		service.proposeNew({
			featureKey: 'album',
			entityType: EntityTypeEnum.Album,
			entity: { name: 'Presence' },
			parentPath: () => null,
			needsParent: true,
		});

		expect(service.proposal()).toBeNull();
		expect(service.lastError()).toBe('unknown-parent');
	});

	it('lets the proposal go once it is spent', () => {
		const service = setUp();

		propose(service, held);
		service.clear();

		expect(service.proposal()).toBeNull();
		expect(service.lastError()).toBeNull();
	});
});
