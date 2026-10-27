import { firstValueFrom, of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import {
	ArtistStateService,
	DiscogsLookupClient,
	MembershipEntity,
	MusicBrainzClient,
	MusicianDataService,
} from '@music-collection/api';

import { LineupCandidate } from './lineup-candidates';

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
	repository: { save: jest.Mock; saveAll: jest.Mock };
	musicians: { add$: jest.Mock };
	musicBrainz: { get$: jest.Mock };
	discogs: { lookupOrNull$: jest.Mock };
} {
	const repository = {
		save: jest.fn().mockResolvedValue(undefined),
		saveAll: jest.fn().mockResolvedValue(undefined),
		remove: jest.fn().mockResolvedValue(undefined),
		listByArtist$: jest.fn().mockReturnValue(of([])),
		listByMusician$: jest.fn().mockReturnValue(of([])),
		listContributionsByAlbums$: jest.fn().mockReturnValue(of([])),
	};
	const musicians = {
		add$: jest
			.fn()
			.mockImplementation((musician: { name: string }) =>
				of({ uid: 'created-1', name: musician.name })
			),
	};
	const musicBrainz = { get$: jest.fn().mockReturnValue(of({})) };
	const discogs = {
		lookup$: jest.fn(),
		lookupOrNull$: jest.fn().mockReturnValue(of(null)),
	};

	TestBed.configureTestingModule({
		providers: [
			MembershipEffect,
			{ provide: Firestore, useValue: {} },
			{ provide: MembershipRepository, useValue: repository },
			{ provide: MusicianDataService, useValue: musicians },
			{ provide: MusicBrainzClient, useValue: musicBrainz },
			{ provide: DiscogsLookupClient, useValue: discogs },
			{
				provide: ArtistStateService,
				useValue: {
					selectEntityById$: () => of(undefined),
					selectAlbumsById$: () => of([]),
					dispatchListAlbumsByIdAction: jest.fn(),
					searchExternalArtists$: () => of([]),
				},
			},
		],
	});

	return {
		effect: TestBed.inject(MembershipEffect),
		repository,
		musicians,
		musicBrainz,
		discogs,
	};
}

/** A candidate as the load dialog hands it back. */
const candidate = (fields: Partial<LineupCandidate> = {}): LineupCandidate => ({
	musicianUid: MUSICIAN,
	musicianName: 'Bill Steer',
	kind: 'member',
	instruments: ['Guitar'],
	from: 1989,
	to: null,
	active: true,
	albumCount: 3,
	albumUids: ['a1', 'a2', 'a3'],
	source: 'musicbrainz',
	...fields,
});

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

describe('MembershipEffect.applyCandidates$', () => {
	it('writes every chosen row in one batch', async () => {
		const { effect, repository } = setUp();

		const written = await firstValueFrom(
			effect.applyCandidates$(
				[
					candidate(),
					candidate({
						musicianUid: 'm2',
						musicianName: 'Jeff Walker',
					}),
				],
				ARTIST,
				'Carcass'
			)
		);

		expect(written).toBe(2);
		expect(repository.saveAll).toHaveBeenCalledTimes(1);
		expect(repository.saveAll.mock.calls[0][0]).toHaveLength(2);
	});

	it('keeps the album counts the sources came with', async () => {
		const { effect, repository } = setUp();

		await firstValueFrom(
			effect.applyCandidates$([candidate()], ARTIST, 'Carcass')
		);

		expect(repository.saveAll.mock.calls[0][0][0]).toMatchObject({
			albumCount: 3,
			albumUids: ['a1', 'a2', 'a3'],
			source: 'musicbrainz',
		});
	});

	it('creates the musician a name has no document for yet', async () => {
		const { effect, repository, musicians } = setUp();

		await firstValueFrom(
			effect.applyCandidates$(
				[candidate({ musicianUid: null, musicianName: 'Ken Owen' })],
				ARTIST,
				'Carcass'
			)
		);

		expect(musicians.add$).toHaveBeenCalledTimes(1);
		expect(repository.saveAll.mock.calls[0][0][0]).toMatchObject({
			musicianUid: 'created-1',
			uid: `${ARTIST}_created-1`,
		});
	});

	it('writes nothing when nothing is chosen', async () => {
		const { effect, repository } = setUp();

		expect(
			await firstValueFrom(effect.applyCandidates$([], ARTIST, 'Carcass'))
		).toBe(0);
		expect(repository.saveAll).not.toHaveBeenCalled();
	});
});

describe('MembershipEffect.fetchExternalMembers$', () => {
	const band = {
		relations: [
			{
				type: 'member of band',
				artist: { id: 'mb-1', name: 'Bill Steer' },
				begin: '1989',
				attributes: ['guitar'],
			},
		],
	};
	const discogsProfile = {
		profile: {
			discogsId: 152122,
			name: 'Carcass',
			description: null,
			sites: [],
			imageUrl: null,
			styles: [],
			members: [{ discogsId: 5, name: 'Jeff Walker', active: true }],
		},
	};

	it('takes the MusicBrainz line-up, which carries the years', async () => {
		const { effect, musicBrainz, discogs } = setUp();

		musicBrainz.get$.mockReturnValue(of(band));

		const members = await firstValueFrom(
			effect.fetchExternalMembers$({
				musicBrainzId: 'mb-band',
				discogsArtistId: 152122,
			})
		);

		expect(members).toEqual([
			expect.objectContaining({
				musicianName: 'Bill Steer',
				from: 1989,
				source: 'musicbrainz',
			}),
		]);
		expect(discogs.lookupOrNull$).not.toHaveBeenCalled();
	});

	it('asks Discogs where MusicBrainz lists no member', async () => {
		const { effect, musicBrainz, discogs } = setUp();

		musicBrainz.get$.mockReturnValue(of({ relations: [] }));
		discogs.lookupOrNull$.mockReturnValue(of(discogsProfile));

		const members = await firstValueFrom(
			effect.fetchExternalMembers$({
				musicBrainzId: 'mb-band',
				discogsArtistId: 152122,
			})
		);

		expect(discogs.lookupOrNull$).toHaveBeenCalledWith({
			kind: 'artist-profile',
			discogsId: 152122,
		});
		expect(members).toEqual([
			expect.objectContaining({
				musicianName: 'Jeff Walker',
				active: true,
				from: null,
				source: 'discogs',
			}),
		]);
	});

	it('goes straight to Discogs without a MusicBrainz id', async () => {
		const { effect, musicBrainz, discogs } = setUp();

		discogs.lookupOrNull$.mockReturnValue(of(discogsProfile));

		const members = await firstValueFrom(
			effect.fetchExternalMembers$({
				musicBrainzId: null,
				discogsArtistId: 152122,
			})
		);

		expect(musicBrainz.get$).not.toHaveBeenCalled();
		expect(members).toHaveLength(1);
	});

	it('is empty when neither source names the band', async () => {
		const { effect } = setUp();

		expect(
			await firstValueFrom(
				effect.fetchExternalMembers$({
					musicBrainzId: null,
					discogsArtistId: null,
				})
			)
		).toEqual([]);
	});
});
