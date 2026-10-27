import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { BehaviorSubject, Observable } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { DocumentData, Firestore, docData } from '@angular/fire/firestore';
import {
	AuthenticatedUserService,
	FirestoreSyncService,
} from '@music-collection/api';

import { TrackDetailsRepository } from './track-details.repository';

jest.mock('@angular/fire/firestore', () => ({
	...jest.requireActual('@angular/fire/firestore'),
	doc: jest.fn(() => ({})),
	docData: jest.fn(),
}));

describe('TrackDetailsRepository', () => {
	/** How many snapshot listeners the lyrics were opened with, and closed. */
	let opened: number;
	let closed: number;
	let user$: BehaviorSubject<{ uid: string } | null>;

	const document$ = new Observable<DocumentData | undefined>((subscriber) => {
		opened++;
		subscriber.next({ text: 'a line', synced: null });

		return () => {
			closed++;
		};
	});

	const repository = () => TestBed.inject(TrackDetailsRepository);

	beforeEach(() => {
		opened = 0;
		closed = 0;
		user$ = new BehaviorSubject<{ uid: string } | null>({ uid: 'u1' });

		(docData as jest.Mock).mockImplementation(() => document$);

		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				TrackDetailsRepository,
				{ provide: Firestore, useValue: {} },
				{
					provide: AuthenticatedUserService,
					useValue: { user$, current: null },
				},
				{ provide: FirestoreSyncService, useValue: {} },
				{ provide: HttpClient, useValue: {} },
			],
		});
	});

	it('opens one listener when the player and the page follow the same track', () => {
		const tracks = repository();

		const player = tracks.lyrics$('t1').subscribe();
		const page = tracks.lyrics$('t1').subscribe();

		expect(opened).toBe(1);

		player.unsubscribe();
		expect(closed).toBe(0);

		page.unsubscribe();
		expect(closed).toBe(1);
	});

	it('keeps a listener of its own for every track', () => {
		const tracks = repository();

		tracks.lyrics$('t1').subscribe();
		tracks.lyrics$('t2').subscribe();

		expect(opened).toBe(2);
	});

	it('opens nothing at all while signed out', () => {
		const tracks = repository();
		let lyrics: unknown = 'unset';

		user$.next(null);
		tracks.lyrics$('t1').subscribe((value) => (lyrics = value));

		expect(opened).toBe(0);
		expect(lyrics).toBeNull();
	});
});
