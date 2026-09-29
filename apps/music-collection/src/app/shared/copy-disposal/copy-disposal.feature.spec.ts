import { BehaviorSubject, of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	AuthenticationStateService,
	CollectionItemDisposalStatus,
	CollectionItemEntity,
	CollectionItemPermissionsService,
	CollectionItemStateService,
	RoleNames,
	User,
} from '@music-collection/api';
import { TextService } from '@music-collection/core/i18n';
import { signalStore, withState } from '@ngrx/signals';
import { NgxPermissionsService } from 'ngx-permissions';

import { CopySerialEffect } from '../../data/copy-serial';
import { withCopyDisposal } from './copy-disposal.feature';

const TestStore = signalStore(withState({}), withCopyDisposal());

const copy = (
	fields: Partial<CollectionItemEntity> = {}
): CollectionItemEntity =>
	({
		uid: 'c1',
		userId: 'u1',
		release: { uid: 'r1' },
		...fields,
	}) as CollectionItemEntity;

/** Yesterday noon: a day the rules accept. */
const YESTERDAY = Date.now() - 24 * 60 * 60 * 1000;

const IDLE: CollectionItemDisposalStatus = { disposing: false, error: null };

interface FakeStateService {
	selectDisposalStatus$: jest.Mock;
	dispatchDisposeEntityAction: jest.Mock;
	dispatchRestoreEntityAction: jest.Mock;
}

interface FakeSerialEffect {
	hold: jest.Mock;
	release: jest.Mock;
}

function setUp(): {
	status$: BehaviorSubject<CollectionItemDisposalStatus>;
	user$: BehaviorSubject<User | null>;
	permissions$: BehaviorSubject<Record<string, unknown>>;
	state: FakeStateService;
	serial: FakeSerialEffect;
	store: InstanceType<typeof TestStore>;
} {
	const status$ = new BehaviorSubject<CollectionItemDisposalStatus>(IDLE);
	const user$ = new BehaviorSubject<User | null>({ uid: 'u1' } as User);
	const permissions$ = new BehaviorSubject<Record<string, unknown>>({
		[CollectionItemPermissionsService.updateCollectionItemEntity]: {},
	});
	const state: FakeStateService = {
		selectDisposalStatus$: jest.fn(() => status$),
		dispatchDisposeEntityAction: jest.fn(),
		dispatchRestoreEntityAction: jest.fn(),
	};
	const serial: FakeSerialEffect = {
		hold: jest.fn(() => Promise.resolve()),
		release: jest.fn(() => Promise.resolve()),
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			TestStore,
			{ provide: CollectionItemStateService, useValue: state },
			{
				provide: AuthenticationStateService,
				useValue: { selectAuthenticatedUser$: () => user$ },
			},
			{ provide: NgxPermissionsService, useValue: { permissions$ } },
			{
				provide: TextService,
				useValue: { translator: () => (key: string) => `[${key}]` },
			},
			{ provide: CopySerialEffect, useValue: serial },
		],
	});
	const store = TestBed.inject(TestStore);

	// Both are reactive methods of the store; outside an injection context
	// @ngrx/signals warns today and throws in a version to come.
	TestBed.runInInjectionContext(() => {
		store.watchDisposing(of(undefined));
		store.watchCopyPermission(of(undefined));
	});

	return { status$, user$, permissions$, state, serial, store };
}

/**
 * One write, start to finish, as the state service reports it.
 *
 * The end of a refused write is a single step: the reducer turns the flag off
 * and sets the error in one and the same state, and the page is told so in one
 * emission. Reporting it in two — the flag first, the error after — would be
 * an order the application never produces, and one where a refusal reads as a
 * write that went through.
 */
function writeThrough(
	status$: BehaviorSubject<CollectionItemDisposalStatus>,
	error: string | null = null
): void {
	status$.next({ disposing: true, error: null });
	status$.next({ disposing: false, error });
}

describe('withCopyDisposal', () => {
	it('writes what the collector said happened to the copy', () => {
		const { state, store } = setUp();

		store.openRemoval('c1');
		store.disposeCopy(copy(), {
			reason: 'sold',
			date: YESTERDAY,
			note: '  at a fair  ',
		});

		expect(state.dispatchDisposeEntityAction).toHaveBeenCalledWith(
			expect.objectContaining({ uid: 'c1' }),
			{ reason: 'sold', date: YESTERDAY, note: 'at a fair' }
		);
	});

	it('refuses a day that has not come yet, which the rules would too', () => {
		const { state, store } = setUp();

		store.disposeCopy(copy(), {
			reason: 'sold',
			date: Date.now() + 60_000,
			note: null,
		});

		expect(state.dispatchDisposeEntityAction).not.toHaveBeenCalled();
	});

	it('closes the dialog once the write is through', () => {
		const { status$, store } = setUp();

		store.openRemoval('c1');
		store.disposeCopy(copy(), {
			reason: 'lost',
			date: YESTERDAY,
			note: null,
		});
		writeThrough(status$);

		expect(store.removingCopyId()).toBeNull();
		expect(store.disposeError()).toBeNull();
	});

	it('holds the dialog open on a refused write, and says why', () => {
		const { status$, store } = setUp();

		store.openRemoval('c1');
		store.disposeCopy(copy(), {
			reason: 'lost',
			date: YESTERDAY,
			note: null,
		});
		writeThrough(status$, 'permission-denied');

		expect(store.removingCopyId()).toBe('c1');
		expect(store.disposeError()).toBe('permission-denied');
	});

	it('gives a numbered copy back to the registry once it is gone', () => {
		const { status$, serial, store } = setUp();

		store.disposeCopy(copy({ serial: { number: 123, total: 500 } }), {
			reason: 'sold',
			date: YESTERDAY,
			note: null,
		});
		writeThrough(status$);

		expect(serial.release).toHaveBeenCalledWith('r1', 123);
	});

	it('keeps the number where the write was refused', () => {
		const { status$, serial, store } = setUp();

		store.disposeCopy(copy({ serial: { number: 123, total: 500 } }), {
			reason: 'sold',
			date: YESTERDAY,
			note: null,
		});
		writeThrough(status$, 'permission-denied');

		expect(serial.release).not.toHaveBeenCalled();
	});

	it('leaves the registry alone for a copy that carries no number', () => {
		const { status$, serial, store } = setUp();

		store.disposeCopy(copy(), {
			reason: 'gifted',
			date: YESTERDAY,
			note: null,
		});
		writeThrough(status$);

		expect(serial.release).not.toHaveBeenCalled();
		expect(serial.hold).not.toHaveBeenCalled();
	});

	it('asks for the number again when the copy is taken back', () => {
		const { status$, serial, store } = setUp();

		store.restoreDisposedCopy(copy({ serial: { number: 7, total: null } }));
		writeThrough(status$);

		expect(serial.hold).toHaveBeenCalledWith(
			'r1',
			{ number: 7, total: null },
			'u1',
			'c1'
		);
	});

	it('leaves the number alone when the copy did not come back', () => {
		const { status$, serial, store } = setUp();

		store.restoreDisposedCopy(copy({ serial: { number: 7, total: null } }));
		writeThrough(status$, 'permission-denied');

		expect(serial.hold).not.toHaveBeenCalled();
		expect(store.disposeError()).toBe('permission-denied');
	});

	it('tells the collector when the number was taken meanwhile', async () => {
		const { status$, serial, store } = setUp();

		serial.hold.mockReturnValue(Promise.reject(new Error('taken')));
		store.restoreDisposedCopy(copy({ serial: { number: 7, total: null } }));
		writeThrough(status$);
		await Promise.resolve();

		// In the collector's own language, like every other word of the dialog.
		expect(store.disposeError()).toBe(
			'[ui.copyRemoval.numberTakenMeanwhile]'
		);
	});

	it('does not start a second write over one in flight', () => {
		const { status$, state, store } = setUp();

		status$.next({ disposing: true, error: null });
		store.disposeCopy(copy(), {
			reason: 'sold',
			date: YESTERDAY,
			note: null,
		});

		expect(state.dispatchDisposeEntityAction).not.toHaveBeenCalled();
	});

	describe('who may let a copy go', () => {
		it('lets a collector with the right to write their copies', () => {
			const { store } = setUp();

			expect(store.canManageCopies()).toBe(true);
		});

		it('lets an admin', () => {
			const { permissions$, store } = setUp();

			permissions$.next({ [RoleNames.ADMIN]: {} });

			expect(store.canManageCopies()).toBe(true);
		});

		/**
		 * The roles outlive the session in the permissions store when signing
		 * out does not flush them. Without a collector there is nobody whose
		 * copy it would be, so the page must not offer the write.
		 */
		it('offers nothing to a visitor with roles but no session', () => {
			const { user$, store } = setUp();

			user$.next(null);

			expect(store.canManageCopies()).toBe(false);
		});

		it('offers nothing to a collector without the right', () => {
			const { permissions$, store } = setUp();

			permissions$.next({});

			expect(store.canManageCopies()).toBe(false);
		});
	});
});
