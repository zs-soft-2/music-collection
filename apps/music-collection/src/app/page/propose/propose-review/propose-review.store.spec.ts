import { NEVER, of, throwError } from 'rxjs';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
	ArtistModel,
	CountryEnum,
	EntityTypeEnum,
} from '@music-collection/api';

import { ProposalService } from '../../../data/proposal';
import { RequestEffect } from '../../../data/request';
import { ProposeReviewStore } from './propose-review.store';

const artist = (fields: Partial<ArtistModel> = {}): ArtistModel =>
	({
		uid: 'a1',
		entityType: EntityTypeEnum.Artist,
		name: 'Pozvakowski',
		country: CountryEnum.Hungary,
		description: 'As the catalog has it.',
		...fields,
	}) as ArtistModel;

const proposal = {
	featureKey: 'artist',
	entityType: EntityTypeEnum.Artist,
	path: 'artist/a1',
	before: artist() as unknown as Record<string, unknown>,
	after: artist({
		country: CountryEnum.Germany,
	}) as unknown as Record<string, unknown>,
	baseUpdatedAt: 17,
};

function setUp(held: typeof proposal | null = proposal): {
	effect: { submitUpdate$: jest.Mock; submitCreate$: jest.Mock };
	proposals: { proposal: ReturnType<typeof signal>; clear: jest.Mock };
	store: InstanceType<typeof ProposeReviewStore>;
} {
	const proposals = {
		proposal: signal(held),
		clear: jest.fn(),
	};
	const effect = {
		submitUpdate$: jest.fn(() => of({ uid: 'r1' })),
		submitCreate$: jest.fn(() => of({ uid: 'r1' })),
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			ProposeReviewStore,
			{ provide: ProposalService, useValue: proposals },
			{ provide: RequestEffect, useValue: effect },
		],
	});

	return {
		effect,
		proposals,
		store: TestBed.inject(ProposeReviewStore),
	};
}

describe('ProposeReviewStore', () => {
	it('asks about the fields that changed, and no others', () => {
		const { store } = setUp();

		expect(store.rows()).toEqual([
			{
				field: 'country',
				labelKey: 'admin.requestField.country',
				before: 'Hungary',
				after: 'Germany',
			},
		]);
	});

	it('has nothing to ask when nothing changed', () => {
		const { store } = setUp({
			...proposal,
			before: artist() as unknown as Record<string, unknown>,
			after: artist() as unknown as Record<string, unknown>,
			baseUpdatedAt: null,
		});

		expect(store.isEmpty()).toBe(true);
	});

	it('will not send a field with nothing behind it', () => {
		const { effect, store } = setUp();

		expect(store.canSubmit()).toBe(false);

		store.setReference({ field: 'country', value: '   ' });

		expect(store.canSubmit()).toBe(false);

		store.submit();

		expect(effect.submitUpdate$).not.toHaveBeenCalled();
	});

	it('sends the change with what backs it, reading the kind off the value', () => {
		const { effect, store } = setUp();

		store.setReference({
			field: 'country',
			value: '  https://www.discogs.com/artist/1  ',
		});
		store.setNote('  The sleeve says so.  ');

		expect(store.canSubmit()).toBe(true);

		store.submit();

		expect(effect.submitUpdate$).toHaveBeenCalledWith(
			expect.objectContaining({
				featureKey: 'artist',
				path: 'artist/a1',
				baseUpdatedAt: 17,
				note: 'The sleeve says so.',
				references: {
					country: {
						kind: 'discogs',
						value: 'https://www.discogs.com/artist/1',
					},
				},
			})
		);
	});

	it('lets the proposal go once it is sent', () => {
		const { proposals, store } = setUp();

		store.setReference({ field: 'country', value: 'https://one.test' });
		store.submit();

		expect(proposals.clear).toHaveBeenCalled();
		expect(store.sent()).toBe(true);
	});

	it('keeps what was typed when the send fails, and says so', () => {
		const { effect, store } = setUp();

		effect.submitUpdate$.mockReturnValue(
			throwError(() => new Error('denied'))
		);
		store.setReference({ field: 'country', value: 'https://one.test' });
		store.submit();

		expect(store.failed()).toBe('page.propose.could-not-send');
		expect(store.sent()).toBe(false);
		expect(store.references()['country']).toBe('https://one.test');
	});

	it('sends one proposal at a time', () => {
		const { effect, store } = setUp();

		effect.submitUpdate$.mockReturnValue(NEVER);
		store.setReference({ field: 'country', value: 'https://one.test' });
		store.submit();
		store.submit();

		expect(effect.submitUpdate$).toHaveBeenCalledTimes(1);
	});

	it('takes a new entity without asking what backs it', () => {
		const { effect, store } = setUp({
			...proposal,
			operation: 'create',
			path: null,
			parentPath: 'artist/a1',
			before: null,
		});

		expect(store.isNew()).toBe(true);
		// Every filled-in field is a change from nothing…
		expect(store.rows().length).toBeGreaterThan(1);
		// …and none of them is asked about: there is nothing held to argue
		// against, so it goes in as it is.
		expect(store.canSubmit()).toBe(true);

		store.submit();

		expect(effect.submitUpdate$).not.toHaveBeenCalled();
		expect(effect.submitCreate$).toHaveBeenCalledWith(
			expect.objectContaining({
				featureKey: 'artist',
				parentPath: 'artist/a1',
				note: null,
				entity: expect.objectContaining({ name: 'Pozvakowski' }),
			})
		);
	});

	it('carries the note of a new entity when there is one', () => {
		const { effect, store } = setUp({
			...proposal,
			operation: 'create',
			path: null,
			parentPath: 'artist/a1',
			before: null,
		});

		store.setNote('  It is in my hands.  ');
		store.submit();

		expect(effect.submitCreate$).toHaveBeenCalledWith(
			expect.objectContaining({ note: 'It is in my hands.' })
		);
	});

	it('gives the proposal up when the collector does', () => {
		const { proposals, store } = setUp();

		store.setReference({ field: 'country', value: 'https://one.test' });
		store.discard();

		expect(proposals.clear).toHaveBeenCalled();
		expect(store.references()).toEqual({});
	});
});
