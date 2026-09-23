import { TestBed } from '@angular/core/testing';
import { CopySerialClaim } from '@music-collection/api';

import { CopySerialEffect, CopySerialTakenError } from './copy-serial.effect';
import { CopySerialRepository } from './copy-serial.repository';

const ME = 'collector-1';
const OTHER = 'collector-2';
const ITEM = 'copy-1';
const RELEASE = 'r1';
const SERIAL = { number: 123, total: 500 };

/** A standing claim on copy 123 of `r1`. */
const held = (fields: Partial<CopySerialClaim> = {}): CopySerialClaim => ({
	releaseId: RELEASE,
	number: 123,
	userId: ME,
	itemId: ITEM,
	...fields,
});

interface FakeRepository {
	holder: jest.Mock;
	claim: jest.Mock;
	release: jest.Mock;
}

/** The effect over a registry that holds whatever the test says it holds. */
function setUp(holder: CopySerialClaim | null): {
	effect: CopySerialEffect;
	repository: FakeRepository;
} {
	const repository: FakeRepository = {
		holder: jest.fn().mockResolvedValue(holder),
		claim: jest.fn().mockResolvedValue(undefined),
		release: jest.fn().mockResolvedValue(undefined),
	};

	TestBed.configureTestingModule({
		providers: [
			CopySerialEffect,
			{ provide: CopySerialRepository, useValue: repository },
		],
	});

	return { effect: TestBed.inject(CopySerialEffect), repository };
}

beforeEach(() => {
	TestBed.resetTestingModule();
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('CopySerialEffect.hold', () => {
	it('takes a number nobody holds', async () => {
		const { effect, repository } = setUp(null);

		await effect.hold(RELEASE, SERIAL, ME, ITEM);

		expect(repository.claim).toHaveBeenCalledWith({
			releaseId: RELEASE,
			number: 123,
			userId: ME,
			itemId: ITEM,
		});
	});

	it('leaves a number this very copy already holds alone', async () => {
		const { effect, repository } = setUp(held());

		await effect.hold(RELEASE, SERIAL, ME, ITEM);

		// Taking it again would be an update, and the registry allows none.
		expect(repository.claim).not.toHaveBeenCalled();
	});

	it('refuses a number another collector registered', async () => {
		const { effect, repository } = setUp(
			held({ userId: OTHER, itemId: 'copy-9' })
		);

		await expect(effect.hold(RELEASE, SERIAL, ME, ITEM)).rejects.toThrow(
			CopySerialTakenError
		);
		expect(repository.claim).not.toHaveBeenCalled();
	});

	it('does not name the collector who holds it', async () => {
		const { effect } = setUp(held({ userId: OTHER, itemId: 'copy-9' }));

		// Whose collection the record is in is not this collector's business;
		// that the number is spoken for is.
		await expect(
			effect.hold(RELEASE, SERIAL, ME, ITEM)
		).rejects.toMatchObject({ conflict: 'taken', itemId: null });
	});

	it('names the collector’s own copy that is already wearing it', async () => {
		const { effect } = setUp(held({ itemId: 'copy-9' }));

		await expect(
			effect.hold(RELEASE, SERIAL, ME, ITEM)
		).rejects.toMatchObject({ conflict: 'mine', itemId: 'copy-9' });
	});

	/**
	 * The read said free and the write said otherwise: someone claimed the
	 * number in the moment between the two. This is the race the registry
	 * exists to lose safely — the rules refuse the second create, and the
	 * collector is told so rather than left believing the number is theirs.
	 */
	it('reports a number taken between the reading and the writing', async () => {
		const { effect, repository } = setUp(null);

		repository.claim.mockRejectedValue(new Error('PERMISSION_DENIED'));

		await expect(
			effect.hold(RELEASE, SERIAL, ME, ITEM)
		).rejects.toMatchObject({ conflict: 'taken' });
	});
});

describe('CopySerialEffect.release', () => {
	it('gives the number back', async () => {
		const { effect, repository } = setUp(null);

		await effect.release(RELEASE, 123);

		expect(repository.release).toHaveBeenCalledWith(RELEASE, 123);
	});

	it('swallows a failure, because the copy is already written', async () => {
		const { effect, repository } = setUp(null);

		repository.release.mockRejectedValue(new Error('offline'));

		// Nothing the collector could do about it, and the save went through.
		await expect(effect.release(RELEASE, 123)).resolves.toBeUndefined();
	});
});
