import { Observable, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	COLLECTION_ITEM_FEATURE_KEY,
	EMPTY_ENTITY_USAGE,
	EntityTypeEnum,
	EntityUsage,
	ReleaseDeletionRepository,
	ReleaseEntity,
	TRACK_FEATURE_KEY,
} from '@music-collection/api';

import {
	RELEASE_IN_USE,
	ReleaseDeletionEffect,
} from './release-deletion.effect';

const release = {
	uid: 'r1',
	name: 'Master of Puppets — 1986 EU',
	entityType: EntityTypeEnum.Release,
} as ReleaseEntity;

const usedBy = (featureKey: string, count: number): EntityUsage => ({
	blocking: [{ featureKey, count }],
	cascading: [],
});

interface FakeRepository {
	usage$: jest.Mock<Observable<EntityUsage>>;
	delete$: jest.Mock<Observable<void>>;
	archive$: jest.Mock<Observable<void>>;
}

function setUp(usage: EntityUsage = EMPTY_ENTITY_USAGE): {
	repository: FakeRepository;
	effect: ReleaseDeletionEffect;
} {
	const repository: FakeRepository = {
		usage$: jest.fn(() => of(usage)),
		delete$: jest.fn(() => of(undefined)),
		archive$: jest.fn(() => of(undefined)),
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			ReleaseDeletionEffect,
			{ provide: ReleaseDeletionRepository, useValue: repository },
		],
	});

	return { repository, effect: TestBed.inject(ReleaseDeletionEffect) };
}

describe('ReleaseDeletionEffect', () => {
	it('deletes a pressing nothing holds', (done) => {
		const { repository, effect } = setUp();

		effect.delete$(release).subscribe(() => {
			expect(repository.delete$).toHaveBeenCalledWith(release);
			done();
		});
	});

	it('refuses a pressing somebody owns a copy of', (done) => {
		const { repository, effect } = setUp(
			usedBy(COLLECTION_ITEM_FEATURE_KEY, 3)
		);

		effect.delete$(release).subscribe({
			error: (error: Error) => {
				expect(error.message).toBe(RELEASE_IN_USE);
				expect(repository.delete$).not.toHaveBeenCalled();
				done();
			},
		});
	});

	it('deletes although its own tracks go with it', (done) => {
		const { repository, effect } = setUp({
			blocking: [],
			cascading: [{ featureKey: TRACK_FEATURE_KEY, count: 9 }],
		});

		effect.delete$(release).subscribe(() => {
			expect(repository.delete$).toHaveBeenCalled();
			done();
		});
	});

	it('asks again at the click, not only when the dialog opened', (done) => {
		const { repository, effect } = setUp();

		effect.delete$(release).subscribe(() => {
			expect(repository.usage$).toHaveBeenCalledWith(release);
			done();
		});
	});

	it('passes on what the server refused', (done) => {
		const { repository, effect } = setUp();

		repository.delete$.mockReturnValue(
			throwError(() => new Error('failed-precondition'))
		);

		effect.delete$(release).subscribe({
			error: (error: Error) => {
				expect(error.message).toBe('failed-precondition');
				done();
			},
		});
	});

	it('archives without asking what holds it', (done) => {
		const { repository, effect } = setUp(
			usedBy(COLLECTION_ITEM_FEATURE_KEY, 1)
		);

		effect.archive$(release, true).subscribe(() => {
			expect(repository.archive$).toHaveBeenCalledWith(release, true);
			done();
		});
	});
});
