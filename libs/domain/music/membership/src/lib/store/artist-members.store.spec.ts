import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { MembershipEntity } from '@music-collection/api';

import { MembershipEffect } from '../data/membership.effect';
import { ArtistMembersStore } from './artist-members.store';

const ARTIST = 'carcass';

const row = (
	musicianUid: string,
	fields: Partial<MembershipEntity> = {}
): MembershipEntity =>
	({
		uid: `${ARTIST}_${musicianUid}`,
		artistUid: ARTIST,
		artistName: 'Carcass',
		musicianUid,
		musicianName: musicianUid,
		kind: 'member',
		instruments: [],
		from: 1989,
		to: null,
		active: true,
		albumCount: 0,
		albumUids: [],
		entityType: 'Membership',
		...fields,
	}) as MembershipEntity;

function setUp(rows: MembershipEntity[]): {
	store: InstanceType<typeof ArtistMembersStore>;
	effect: { save$: jest.Mock };
} {
	const effect = {
		loadLineup$: jest
			.fn()
			.mockReturnValue(of({ artistName: 'Carcass', rows })),
		save$: jest.fn().mockReturnValue(of(rows[0] ?? row('x'))),
		remove$: jest.fn().mockReturnValue(of(undefined)),
		searchMusicians$: jest.fn().mockReturnValue(of([])),
		createMusician$: jest.fn(),
	};

	TestBed.configureTestingModule({
		providers: [
			ArtistMembersStore,
			{ provide: MembershipEffect, useValue: effect },
		],
	});

	const store = TestBed.inject(ArtistMembersStore);
	store.load(ARTIST);

	return { store, effect };
}

beforeEach(() => {
	TestBed.resetTestingModule();
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('ArtistMembersStore', () => {
	it('sorts current members before former ones', () => {
		const { store } = setUp([
			row('gone', { active: false, to: 1995, from: 1985 }),
			row('here', { active: true, from: 1989 }),
		]);

		expect(store.members().map((member) => member.musicianUid)).toEqual([
			'here',
			'gone',
		]);
	});

	it('keeps guests out of the member list', () => {
		const { store } = setUp([
			row('member'),
			row('guest', { kind: 'guest', active: null }),
		]);

		expect(store.members()).toHaveLength(1);
		expect(store.guests().map((guest) => guest.musicianUid)).toEqual([
			'guest',
		]);
	});

	it('refuses a musician who is already in the line-up', () => {
		const { store, effect } = setUp([row('bill')]);

		store.startAdd('member');
		store.patchDraft({ musicianUid: 'bill', musicianName: 'Bill' });
		store.save();

		expect(effect.save$).not.toHaveBeenCalled();
		expect(store.error()).toBe('ui.artistMembers.error-duplicate');
		expect(store.draft()).not.toBeNull();
	});

	it('saves a musician the line-up does not have yet', () => {
		const { store, effect } = setUp([row('bill')]);

		store.startAdd('member');
		store.patchDraft({ musicianUid: 'jeff', musicianName: 'Jeff' });
		store.save();

		expect(effect.save$).toHaveBeenCalledTimes(1);
		expect(store.draft()).toBeNull();
	});

	it('edits a row without taking it for a duplicate of itself', () => {
		const existing = row('bill');
		const { store, effect } = setUp([existing]);

		store.startEdit(existing);
		store.patchDraft({ from: 1988 });
		store.save();

		expect(effect.save$).toHaveBeenCalledWith(
			expect.objectContaining({ uid: existing.uid, from: 1988 }),
			existing
		);
	});
});
