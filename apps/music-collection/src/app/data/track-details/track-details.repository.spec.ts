import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import {
	BehaviorSubject,
	Observable,
	defer,
	firstValueFrom,
	of,
	throwError,
} from 'rxjs';

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { DocumentData, Firestore, docData } from '@angular/fire/firestore';
import {
	AuthenticatedUserService,
	FirestoreSyncService,
} from '@music-collection/api';

import {
	TrackDetailsRepository,
	isLyricsServiceBusy,
} from './track-details.repository';

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
	const http = { get: jest.fn() };

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
		http.get.mockReset();

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
				{ provide: HttpClient, useValue: http },
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

	describe('fetchExternalLyrics$', () => {
		const query = {
			artistName: 'Forbidden',
			trackName: 'Burning the Lungs of Earth',
			albumName: 'Forbidden',
			durationSec: 313,
		};
		const notFound = () =>
			throwError(() => new HttpErrorResponse({ status: 404 }));
		const busy = () =>
			throwError(() => new HttpErrorResponse({ status: 503 }));
		const record = {
			plainLyrics: 'a line',
			syncedLyrics: null,
			instrumental: false,
		};
		/** What each request asked for: the endpoint and its params. */
		const requests = () =>
			http.get.mock.calls.map(([url, { params }]) => [
				url.split('/').pop(),
				params.keys().join(','),
			]);

		it('tries the artist and title alone before searching', async () => {
			http.get
				.mockReturnValueOnce(notFound())
				.mockReturnValueOnce(of(record));

			const lyrics = await firstValueFrom(
				repository().fetchExternalLyrics$(query)
			);

			expect(lyrics).toEqual({ text: 'a line', synced: null });
			expect(requests()).toEqual([
				['get', 'artist_name,track_name,album_name,duration'],
				['get', 'artist_name,track_name'],
			]);
		});

		it('asks a busy search again', async () => {
			jest.useFakeTimers();
			try {
				let searches = 0;
				// Like HttpClient's, every subscription sends the request anew.
				http.get.mockImplementation((url: string) =>
					url.endsWith('/get')
						? notFound()
						: defer(() =>
								++searches === 1 ? busy() : of([record])
							)
				);

				const result = firstValueFrom(
					repository().fetchExternalLyrics$(query)
				);
				await jest.runAllTimersAsync();

				expect(await result).toEqual({ text: 'a line', synced: null });
				expect(searches).toBe(2);
			} finally {
				jest.useRealTimers();
			}
		});

		it('fails as busy once the search stays busy', async () => {
			jest.useFakeTimers();
			try {
				http.get.mockImplementation((url: string) =>
					url.endsWith('/get') ? notFound() : busy()
				);

				const result = firstValueFrom(
					repository().fetchExternalLyrics$(query)
				).catch((error) => error);
				await jest.runAllTimersAsync();

				expect(isLyricsServiceBusy(await result)).toBe(true);
			} finally {
				jest.useRealTimers();
			}
		});
	});
});
