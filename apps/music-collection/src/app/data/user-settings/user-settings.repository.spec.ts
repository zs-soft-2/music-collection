import { BehaviorSubject, Observable } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { DocumentData, Firestore, docData } from '@angular/fire/firestore';
import {
	AuthenticatedUserService,
	FirestoreSyncService,
} from '@music-collection/api';

import { UserSetting } from './user-settings.model';
import { UserSettingsRepository } from './user-settings.repository';

jest.mock('@angular/fire/firestore', () => ({
	...jest.requireActual('@angular/fire/firestore'),
	doc: jest.fn(() => ({})),
	docData: jest.fn(),
}));

interface Layout {
	units: string[];
}

const LAYOUT_SETTING: UserSetting<Layout> = {
	id: 'shelf-layout',
	featureKey: 'user-setting',
	storageKey: 'shelf-layout',
	toValue: (data: DocumentData) => ({
		units: (data['units'] ?? []) as string[],
	}),
	toDocument: (value: Layout) => ({ units: value.units }),
};

const OTHER_SETTING: UserSetting<Layout> = {
	...LAYOUT_SETTING,
	id: 'appearance',
};

describe('UserSettingsRepository', () => {
	/** How many snapshot listeners the document was opened with, and closed. */
	let opened: number;
	let closed: number;
	let user$: BehaviorSubject<{ uid: string } | null>;

	const document$ = new Observable<DocumentData | undefined>((subscriber) => {
		opened++;
		subscriber.next({ units: ['a'] });

		return () => {
			closed++;
		};
	});

	const repository = () => TestBed.inject(UserSettingsRepository);

	beforeEach(() => {
		opened = 0;
		closed = 0;
		user$ = new BehaviorSubject<{ uid: string } | null>({ uid: 'u1' });

		(docData as jest.Mock).mockImplementation(() => document$);

		TestBed.configureTestingModule({
			providers: [
				UserSettingsRepository,
				{ provide: Firestore, useValue: {} },
				{
					provide: AuthenticatedUserService,
					useValue: { user$, current: null },
				},
				{ provide: FirestoreSyncService, useValue: {} },
			],
		});
	});

	it('opens one listener however many read the same setting', () => {
		const settings = repository();

		const first = settings.value$(LAYOUT_SETTING).subscribe();
		const second = settings.value$(LAYOUT_SETTING).subscribe();
		const third = settings.value$(LAYOUT_SETTING).subscribe();

		expect(opened).toBe(1);

		first.unsubscribe();
		second.unsubscribe();
		expect(closed).toBe(0);

		third.unsubscribe();
		expect(closed).toBe(1);
	});

	it('keeps a listener of its own for every setting', () => {
		const settings = repository();

		settings.value$(LAYOUT_SETTING).subscribe();
		settings.value$(OTHER_SETTING).subscribe();

		expect(opened).toBe(2);
	});

	it('opens a fresh listener once the last reader has let go', () => {
		const settings = repository();

		settings.value$(LAYOUT_SETTING).subscribe().unsubscribe();
		settings.value$(LAYOUT_SETTING).subscribe();

		expect(opened).toBe(2);
	});

	it('never serves one account the listener opened for another', () => {
		const settings = repository();

		settings.value$(LAYOUT_SETTING).subscribe();
		expect(opened).toBe(1);

		user$.next({ uid: 'u2' });

		expect(closed).toBe(1);
		expect(opened).toBe(2);
	});

	it('reads the browser afresh for every reader while signed out', () => {
		const settings = repository();
		let value: Layout | undefined;

		user$.next(null);
		localStorage.setItem(
			LAYOUT_SETTING.storageKey,
			JSON.stringify({ units: ['a'] })
		);
		settings.value$(LAYOUT_SETTING).subscribe();

		localStorage.setItem(
			LAYOUT_SETTING.storageKey,
			JSON.stringify({ units: ['b'] })
		);
		settings.value$(LAYOUT_SETTING).subscribe((layout) => (value = layout));

		expect(opened).toBe(0);
		expect(value).toEqual({ units: ['b'] });
	});
});
