import { Observable, of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	ConcertArtistMatch,
	ConcertEntity,
	ConcertSuggestionEntity,
	VenueEntity,
} from '@music-collection/api';
import { ConcertEffect } from '@music-collection/domain/concert';
import {
	concertOf,
	suggestionOf,
} from '@music-collection/domain/concert/testing';

import { ConcertAdminStore } from './concert-admin.store';

interface FakeEffect {
	concerts$: Observable<ConcertEntity[]>;
	pending$: Observable<ConcertSuggestionEntity[]>;
	venues$: Observable<VenueEntity[]>;
	update$: jest.Mock;
	approve$: jest.Mock;
	searchArtists$: jest.Mock;
}

function setUp(
	concerts: ConcertEntity[] = [],
	suggestions: ConcertSuggestionEntity[] = [],
	artists: ConcertArtistMatch[] = []
): { effect: FakeEffect; store: InstanceType<typeof ConcertAdminStore> } {
	const effect: FakeEffect = {
		concerts$: of(concerts),
		pending$: of(suggestions),
		venues$: of([]),
		update$: jest.fn((concert: ConcertEntity) => of(concert)),
		approve$: jest.fn((suggestion: ConcertSuggestionEntity) =>
			of(suggestion as unknown as ConcertEntity)
		),
		searchArtists$: jest.fn((term: string) =>
			of(
				artists.filter((artist) =>
					artist.name
						.toLowerCase()
						.startsWith(term.trim().toLowerCase())
				)
			)
		),
	};

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			ConcertAdminStore,
			{ provide: ConcertEffect, useValue: effect },
		],
	});

	return { effect, store: TestBed.inject(ConcertAdminStore) };
}

describe('ConcertAdminStore', () => {
	describe('a fellépők', () => {
		it('opens the concert with the bill it was filed with', () => {
			const concert = concertOf({
				supportingActs: ['Carnifex', 'Despised Icon'],
			});
			const { store } = setUp([concert]);

			store.editConcert(concert);

			expect(
				store.concertEditor()?.draft.acts.map((act) => act.name)
			).toEqual(['Carnifex', 'Despised Icon']);
		});

		it('adds, renames and removes an act', () => {
			const concert = concertOf({ supportingActs: ['Carnifex'] });
			const { store } = setUp([concert]);

			store.editConcert(concert);
			store.addAct();
			store.setAct(1, 'Despised Icon');
			store.addAct();
			store.removeAct(0);

			expect(
				store.concertEditor()?.draft.acts.map((act) => act.name)
			).toEqual(['Despised Icon', '']);
		});

		it('opens the bill with the links it was filed with', () => {
			const concert = concertOf({
				lineup: [
					{
						artistUid: 'artist-tank',
						imageUrl: null,
						name: 'Tankcsapda',
					},
					{
						artistUid: 'artist-carnifex',
						imageUrl: 'https://example.test/carnifex.jpg',
						name: 'Carnifex',
					},
					{ artistUid: null, imageUrl: null, name: 'Névtelen' },
				],
				supportingActs: ['Carnifex', 'Névtelen'],
			});
			const { store } = setUp([concert]);

			store.editConcert(concert);

			expect(store.concertEditor()?.draft.acts).toEqual([
				{
					artistUid: 'artist-carnifex',
					imageUrl: 'https://example.test/carnifex.jpg',
					name: 'Carnifex',
				},
				{ artistUid: null, imageUrl: null, name: 'Névtelen' },
			]);
		});

		it('leaves the empty rows behind when it saves', () => {
			const concert = concertOf({ supportingActs: [] });
			const { effect, store } = setUp([concert]);

			store.editConcert(concert);
			store.addAct();
			store.addAct();
			store.setAct(0, '  Carnifex  ');
			store.saveConcert();

			expect(effect.update$).toHaveBeenCalledWith(
				concert,
				expect.objectContaining({
					acts: [
						{ artistUid: null, imageUrl: null, name: 'Carnifex' },
					],
				})
			);
		});

		it('files a corrected suggestion with the acts the admin left on it', () => {
			const suggestion = suggestionOf({
				supportingActs: ['Carnifex', 'Despised Icon'],
			});
			const { effect, store } = setUp([], [suggestion]);

			store.editSuggestion(suggestion);
			store.removeAct(1);
			store.saveConcert();

			expect(effect.approve$).toHaveBeenCalledWith(
				expect.objectContaining({ uid: suggestion.uid }),
				expect.objectContaining({
					acts: [
						{ artistUid: null, imageUrl: null, name: 'Carnifex' },
					],
				})
			);
		});
	});

	describe('a fellépő keresése a katalógusban', () => {
		const carnifex: ConcertArtistMatch = {
			imageUrl: 'https://example.test/carnifex.jpg',
			name: 'Carnifex',
			uid: 'artist-carnifex',
		};

		it('a kiválasztott előadót névvel és linkkel írja a sorba', () => {
			const concert = concertOf({ supportingActs: ['Carnife'] });
			const { store } = setUp([concert], [], [carnifex]);

			store.editConcert(concert);
			store.searchAct({ index: 0, term: 'Carnife' });
			store.pickAct(0, carnifex);

			expect(store.concertEditor()?.draft.acts).toEqual([
				{
					artistUid: 'artist-carnifex',
					imageUrl: 'https://example.test/carnifex.jpg',
					name: 'Carnifex',
				},
			]);
			expect(store.actMatches()).toEqual([]);
		});

		// A teljesen kiírt név nem vár kattintásra: ez a kézi linkelés
		// ellenpárja, és ettől áll helyre magától egy el nem talált zenekar.
		it('a betű szerint egyező nevet magától belinkeli', () => {
			const concert = concertOf({ supportingActs: ['Carnifex'] });
			const { store } = setUp([concert], [], [carnifex]);

			store.editConcert(concert);
			store.searchAct({ index: 0, term: 'Carnifex' });

			expect(store.concertEditor()?.draft.acts[0].artistUid).toBe(
				'artist-carnifex'
			);
		});

		// Ezért nem kell újragépelni azt, amit a betöltés nem talált el: a
		// szerkesztő nyitásakor a laza nevek maguktól a zenekarukra állnak.
		it('nyitáskor összeköti a katalógusban meglévő neveket', () => {
			const concert = concertOf({ supportingActs: ['Carnifex'] });
			const { store } = setUp([concert], [], [carnifex]);

			store.editConcert(concert);

			expect(store.concertEditor()?.draft.acts[0]).toEqual({
				artistUid: 'artist-carnifex',
				imageUrl: 'https://example.test/carnifex.jpg',
				name: 'Carnifex',
			});
		});

		it('három betű alatt nem kérdezi meg a katalógust', () => {
			const concert = concertOf({ supportingActs: ['Ca'] });
			const { effect, store } = setUp([concert], [], [carnifex]);

			store.editConcert(concert);
			store.searchAct({ index: 0, term: 'Ca' });

			expect(effect.searchArtists$).not.toHaveBeenCalled();
			expect(store.actMatches()).toEqual([]);
		});

		// Egy átírt név már nem azé a zenekaré: a link nem maradhat alatta.
		it('az átírt név elengedi a linket', () => {
			const concert = concertOf({ supportingActs: ['Carnifex'] });
			const { store } = setUp([concert], [], [carnifex]);

			store.editConcert(concert);
			store.pickAct(0, carnifex);
			store.setAct(0, 'Carnifax');

			expect(store.concertEditor()?.draft.acts[0]).toEqual({
				artistUid: null,
				imageUrl: null,
				name: 'Carnifax',
			});
		});
	});
});
