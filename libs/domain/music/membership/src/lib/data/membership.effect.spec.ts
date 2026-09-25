import { firstValueFrom, of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import {
	ArtistStateService,
	MembershipEntity,
	MusicianDataService,
} from '@music-collection/api';

import { MembershipDraft, MembershipEffect } from './membership.effect';
import { MembershipRepository } from './membership.repository';

const ARTIST = 'carcass';
const MUSICIAN = 'discogs-1';

const draft = (fields: Partial<MembershipDraft> = {}): MembershipDraft => ({
	uid: null,
	artistUid: ARTIST,
	artistName: 'Carcass',
	musicianUid: MUSICIAN,
	musicianName: 'Bill Steer',
	kind: 'member',
	instruments: ['Vocals', 'Guitar'],
	from: 1989,
	to: null,
	active: true,
	...fields,
});

/** A row the Discogs import wrote earlier, with its album counts. */
const saved = (fields: Partial<MembershipEntity> = {}): MembershipEntity =>
	({
		uid: `${ARTIST}_${MUSICIAN}`,
		artistUid: ARTIST,
		artistName: 'Carcass',
		musicianUid: MUSICIAN,
		musicianName: 'Bill Steer',
		kind: 'member',
		instruments: ['Guitar'],
		from: 1989,
		to: 1995,
		active: false,
		albumCount: 3,
		albumUids: ['a1', 'a2', 'a3'],
		entityType: 'Membership',
		source: 'discogs',
		...fields,
	}) as MembershipEntity;

function setUp(): {
	effect: MembershipEffect;
	repository: { save: jest.Mock };
} {
	const repository = {
		save: jest.fn().mockResolvedValue(undefined),
		remove: jest.fn().mockResolvedValue(undefined),
		listByArtist$: jest.fn().mockReturnValue(of([])),
		listByMusician$: jest.fn().mockReturnValue(of([])),
	};

	TestBed.configureTestingModule({
		providers: [
			MembershipEffect,
			{ provide: Firestore, useValue: {} },
			{ provide: MembershipRepository, useValue: repository },
			{ provide: MusicianDataService, useValue: {} },
			{
				provide: ArtistStateService,
				useValue: { selectEntityById$: () => of(undefined) },
			},
		],
	});

	return { effect: TestBed.inject(MembershipEffect), repository };
}

beforeEach(() => TestBed.resetTestingModule());

describe('MembershipEffect.save$', () => {
	it('pairs the band with the musician in the uid, as the import does', async () => {
		const { effect, repository } = setUp();

		await firstValueFrom(effect.save$(draft()));

		expect(repository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				uid: `${ARTIST}_${MUSICIAN}`,
				artistUid: ARTIST,
				musicianUid: MUSICIAN,
				entityType: 'Membership',
			})
		);
	});

	it('marks the row as hand-written, which the import leaves alone', async () => {
		const { effect, repository } = setUp();

		await firstValueFrom(effect.save$(draft()));

		expect(repository.save.mock.calls[0][0].source).toBe('manual');
	});

	it('drops the end year of a member still in the band', async () => {
		const { effect, repository } = setUp();

		await firstValueFrom(effect.save$(draft({ to: 1995, active: true })));

		expect(repository.save.mock.calls[0][0]).toMatchObject({
			active: true,
			to: null,
		});
	});

	it('keeps the end year of a member who left', async () => {
		const { effect, repository } = setUp();

		await firstValueFrom(effect.save$(draft({ to: 1995, active: false })));

		expect(repository.save.mock.calls[0][0]).toMatchObject({
			active: false,
			to: 1995,
		});
	});

	it('leaves a guest without a "still in the band" state', async () => {
		const { effect, repository } = setUp();

		await firstValueFrom(
			effect.save$(draft({ kind: 'guest', to: 1993, active: true }))
		);

		expect(repository.save.mock.calls[0][0]).toMatchObject({
			kind: 'guest',
			active: null,
			to: 1993,
		});
	});

	it('keeps the album counts of the row it edits', async () => {
		const { effect, repository } = setUp();
		const existing = saved();

		await firstValueFrom(
			effect.save$(
				draft({
					uid: existing.uid,
					from: 1988,
					active: false,
					to: 1995,
				}),
				existing
			)
		);

		expect(repository.save.mock.calls[0][0]).toMatchObject({
			uid: existing.uid,
			albumCount: 3,
			albumUids: ['a1', 'a2', 'a3'],
			from: 1988,
		});
	});
});
