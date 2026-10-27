import { NEVER, Observable, of, throwError } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import {
	ConcertArtistMatch,
	ConcertEntity,
	ConcertSuggestionEntity,
	SuggestConcertsResult,
	SuggestVenuesResult,
	VenueEntity,
	VenueSuggestionEntity,
} from '@music-collection/api';
import { ConcertEffect, VENUE_IN_USE } from '@music-collection/domain/concert';
import {
	concertOf,
	suggestionOf,
	venueOf,
	venueSuggestionOf,
} from '@music-collection/domain/concert/testing';

import { ConcertAdminStore } from './concert-admin.store';

interface FakeEffect {
	concerts$: Observable<ConcertEntity[]>;
	pending$: Observable<ConcertSuggestionEntity[]>;
	venues$: Observable<VenueEntity[]>;
	pendingVenues$: Observable<VenueSuggestionEntity[]>;
	update$: jest.Mock;
	approve$: jest.Mock;
	searchArtists$: jest.Mock;
	suggestConcerts$: jest.Mock;
	suggestVenues$: jest.Mock;
	loadVenues$: jest.Mock;
	venueUsage$: jest.Mock;
	retireVenue$: jest.Mock;
	deleteVenue$: jest.Mock;
	updateVenue$: jest.Mock;
	createVenue$: jest.Mock;
	approveVenue$: jest.Mock;
	rejectVenue$: jest.Mock;
}

/** Amit a helyszín-kérdezés visszaad; a számai itt nem tárgy, csak a hívása. */
const NOTHING_PROPOSED: SuggestVenuesResult = {
	asked: 0,
	venuesSeen: 0,
	suggested: 0,
	duplicates: 0,
	rejected: 0,
	discarded: 0,
	model: 'teszt',
	requestsUsed: 0,
	requestsLeft: 10,
};

/** Amit a futás visszaad; a számai itt nem tárgy, csak a hívása. */
const NOTHING_SUGGESTED: SuggestConcertsResult = {
	venuesQueried: 0,
	concertsSeen: 0,
	proposed: 0,
	suggested: 0,
	duplicates: 0,
	rejected: 0,
	discarded: 0,
	model: 'teszt',
	requestsUsed: 0,
	requestsLeft: 10,
};

function setUp(
	concerts: ConcertEntity[] = [],
	suggestions: ConcertSuggestionEntity[] = [],
	artists: ConcertArtistMatch[] = [],
	venues: VenueEntity[] = [],
	venueSuggestions: VenueSuggestionEntity[] = [],
	/** Ennyi koncert tartja a helyszínt, ahogy a szerver megszámolta. */
	venueUse = 0
): { effect: FakeEffect; store: InstanceType<typeof ConcertAdminStore> } {
	const effect: FakeEffect = {
		concerts$: of(concerts),
		pending$: of(suggestions),
		venues$: of(venues),
		pendingVenues$: of(venueSuggestions),
		suggestVenues$: jest.fn(() => of(NOTHING_PROPOSED)),
		// Ami soha nem válaszol: ez a beragadt betöltés, amitől a lap
		// gombjai magyarázat nélkül tiltottak voltak.
		loadVenues$: jest.fn(() => NEVER),
		venueUsage$: jest.fn(() => of({ concerts: venueUse })),
		// A számolás elmaradása külön eset: `null`, nem nulla.
		retireVenue$: jest.fn(() => of(undefined)),
		deleteVenue$: jest.fn(() =>
			venueUse ? throwError(() => new Error(VENUE_IN_USE)) : of(undefined)
		),
		updateVenue$: jest.fn((venue: VenueEntity) => of(venue)),
		createVenue$: jest.fn(() => of(venueOf())),
		approveVenue$: jest.fn(() => of(venueOf())),
		rejectVenue$: jest.fn(() => of(undefined)),
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
		suggestConcerts$: jest.fn(() => of(NOTHING_SUGGESTED)),
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

	describe('a javaslatkérés hatóköre', () => {
		// A kérés helyszínenként fizet, ezért az admin dolga megmondani,
		// melyik ház programját kéri — különben a szerver viszi a kört.
		it('a kijelölt helyszínekről kérdez', () => {
			const { effect, store } = setUp();

			store.setAskVenues(['venue-barba', 'venue-durer']);
			store.suggest();

			expect(effect.suggestConcerts$).toHaveBeenCalledWith(
				expect.objectContaining({
					venueUids: ['venue-barba', 'venue-durer'],
				})
			);
		});

		// Üres lista nem „egy helyszín sem": ebből tudja a szerver, hogy ott
		// folytassa a kört, ahol az előző futás abbahagyta.
		it('kijelölés nélkül üres listát küld', () => {
			const { effect, store } = setUp();

			store.suggest();

			expect(effect.suggestConcerts$).toHaveBeenCalledWith(
				expect.objectContaining({ venueUids: [] })
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
	describe('a helyszín-javaslatok', () => {
		// Ugyanaz a keret, ugyanaz a modell, más kérdés: egy ország
		// koncerthelyszíneit a megadott városokra vagy egészben kérdezzük.
		it('a megadott városokról kérdez', () => {
			const { effect, store } = setUp();

			store.setCountry('at');
			store.setAskCities([' Wien ', '', 'Graz']);
			store.suggestVenues();

			expect(effect.suggestVenues$).toHaveBeenCalledWith({
				countryCode: 'AT',
				cities: ['Wien', 'Graz'],
			});
		});

		// Üres lista nem „egy város sem": ebből tudja a szerver, hogy az
		// egész országot kérdezze, egyetlen kérésből.
		it('város nélkül üres listát küld', () => {
			const { effect, store } = setUp();

			store.suggestVenues();

			expect(effect.suggestVenues$).toHaveBeenCalledWith(
				expect.objectContaining({ cities: [] })
			);
		});

		// A futás a saját fülére visz: ami onnantól ott vár, azt valakinek el
		// kell olvasnia, mielőtt a katalógusba kerül.
		it('a javaslatok fülére visz', () => {
			const { store } = setUp();

			store.suggestVenues();

			expect(store.tab()).toBe('venue-suggestions');
		});

		it('a javaslatot javítás után jóváhagyásként mentí', () => {
			const suggestion = venueSuggestionOf({ name: 'Arena Wien' });
			const { effect, store } = setUp([], [], [], [], [suggestion]);

			store.editVenueSuggestion(suggestion);
			store.setVenueField({ city: 'Wien' });
			store.saveVenue();

			expect(effect.approveVenue$).toHaveBeenCalledWith(
				expect.objectContaining({ uid: suggestion.uid }),
				expect.objectContaining({ city: 'Wien', name: 'Arena Wien' })
			);
		});
	});

	describe('az ország', () => {
		// Két betöltés két országra olyan koncertet írna a katalógusba,
		// aminek a helyszíne nincs is meg: egy ország van, és mind a négy
		// betöltés arra fut.
		it('mindegyik betöltésnek ugyanaz', () => {
			const { effect, store } = setUp();

			store.setCountry('AT');
			store.suggest();
			store.suggestVenues();

			expect(effect.suggestConcerts$).toHaveBeenCalledWith(
				expect.objectContaining({ countryCode: 'AT' })
			);
			expect(effect.suggestVenues$).toHaveBeenCalledWith(
				expect.objectContaining({ countryCode: 'AT' })
			);
		});

		// A kijelölt helyszínek az előző országból valók, és az előző futás
		// eredménye is arról szólt.
		it('ország-váltáskor elengedi az előző hatókört', () => {
			const { store } = setUp();

			store.setAskVenues(['venue-barba']);
			store.setAskCities(['Budapest']);
			store.setCountry('AT');

			expect(store.askVenueUids()).toEqual([]);
			expect(store.askCities()).toEqual([]);
		});
	});

	describe('a helyszín törlése és visszavonása', () => {
		// A kliens kérdez, a szerver dönt: a párbeszéd szövege a szerver
		// megszámolta koncertekből áll.
		it('megkérdezi, mi tartja életben a helyszínt', () => {
			const venue = venueOf();
			const { effect, store } = setUp([], [], [], [venue], [], 3);

			store.askVenueDeletion(venue);

			expect(effect.venueUsage$).toHaveBeenCalledWith(venue.uid);
			expect(store.pendingVenueUsage()).toEqual({ concerts: 3 });
			expect(store.canDeleteVenue()).toBe(false);
		});

		it('a semmi által nem tartott helyszínt törölhetőnek mondja', () => {
			const venue = venueOf();
			const { store } = setUp([], [], [], [venue]);

			store.askVenueDeletion(venue);

			expect(store.canDeleteVenue()).toBe(true);
		});

		// Amíg a válasz útban van, a gomb vár: a párbeszéd mondata abból lesz.
		it('a számolás alatt nem kínál törlést', () => {
			const venue = venueOf();
			const { effect, store } = setUp([], [], [], [venue]);

			effect.venueUsage$.mockReturnValueOnce(
				new Observable<{ concerts: number | null }>()
			);
			store.askVenueDeletion(venue);

			expect(store.pendingVenueUsage()).toBeNull();
			expect(store.canDeleteVenue()).toBe(false);
			expect(store.isCountingVenueUse()).toBe(true);
		});

		/*
		 * Ez a tiltott gomb magyarázat nélkül: ha a számolás nem jön össze (a
		 * `getCountFromServer` csak szerverről válaszol, tehát hálózat nélkül
		 * sosem), a párbeszéd a kísérletet engedi, és a szerver dönt.
		 */
		it('a meg nem számolható helyszínnél engedi a kísérletet', () => {
			const venue = venueOf();
			const { effect, store } = setUp([], [], [], [venue]);

			effect.venueUsage$.mockReturnValueOnce(of({ concerts: null }));
			store.askVenueDeletion(venue);

			expect(store.pendingVenueUsage()).toEqual({ concerts: null });
			expect(store.canDeleteVenue()).toBe(true);
			expect(store.isCountingVenueUse()).toBe(false);
		});

		it('visszavonja és visszaállítja a helyszínt', () => {
			const venue = venueOf();
			const { effect, store } = setUp([], [], [], [venue]);

			store.retireVenue({ venue, active: false });
			store.retireVenue({ venue, active: true });

			expect(effect.retireVenue$).toHaveBeenNthCalledWith(
				1,
				venue,
				false
			);
			expect(effect.retireVenue$).toHaveBeenNthCalledWith(2, venue, true);
		});

		// A visszavonás a párbeszédből is elérhető, és akkor bezárja azt: ez
		// a válasz arra a helyszínre, amit nem lehet törölni.
		it('a visszavonás bezárja a párbeszédet', () => {
			const venue = venueOf();
			const { store } = setUp([], [], [], [venue], [], 2);

			store.askVenueDeletion(venue);
			store.retireVenue({ venue, active: false });

			expect(store.pendingVenue()).toBeNull();
			expect(store.pendingVenueUsage()).toBeNull();
		});

		// A hiba a lapon marad, a párbeszéd is: a visszavonás egy kattintásra
		// van tőle.
		it('a használatban lévő helyszín törlése hibát hoz, a párbeszéd nyitva marad', () => {
			const venue = venueOf();
			const { store } = setUp([], [], [], [venue], [], 1);

			store.askVenueDeletion(venue);
			store.confirmVenueDeletion();

			expect(store.error()).toBe(VENUE_IN_USE);
			expect(store.pendingVenue()).toEqual(venue);
		});

		/*
		 * Egy futó — vagy beragadt — betöltés nem foghatja meg a sor
		 * műveleteit. A lap gombjai ettől voltak tiltottak magyarázat nélkül:
		 * egy válasz nélkül maradt callable kilenc percig `running`-ban tart.
		 */
		it('a válasz nélkül maradt betöltés nem tiltja a sorok műveleteit', () => {
			const venue = venueOf();
			const { store } = setUp([], [], [], [venue]);

			store.loadVenues();

			// A betöltés fut (és akár örökre futhat), de ami a sorok
			// gombjait tiltja, az az írás — és abból nincs egy sem.
			expect(store.running()).toBe('venues');
			expect(store.isBusy()).toBe(true);
			expect(store.isSaving()).toBe(false);

			// A törlés párbeszéde közben is megnyílik, és a számot megkapja.
			store.askVenueDeletion(venue);

			expect(store.canDeleteVenue()).toBe(true);
		});

		// A szerkesztés a tárolt dokumentumra épül, nem a draft helyére: az
		// mbid és a forrás nem a formon van, mégis túl kell élnie a mentést.
		it('a szerkesztést a tárolt helyszínnel együtt mentí', () => {
			const venue = venueOf({
				musicBrainzId: 'mbid-park',
				source: 'musicbrainz',
			});
			const { effect, store } = setUp([], [], [], [venue]);

			store.editVenue(venue);
			store.setVenueField({ address: 'Soroksári út 60' });
			store.saveVenue();

			expect(effect.updateVenue$).toHaveBeenCalledWith(
				venue,
				expect.objectContaining({ address: 'Soroksári út 60' })
			);
		});
	});

	describe('a betöltések jelentése', () => {
		// A lap négy gombja közül egy se mondta el magáról, hogy elindult-e:
		// a futás a saját kártyáján nyit naplót, az országgal együtt.
		it('a futás a saját kártyáján nyílik meg', () => {
			const { store } = setUp();

			store.setCountry('AT');
			store.loadVenues();

			expect(store.runs()['venues']).toEqual(
				expect.objectContaining({
					countryCode: 'AT',
					endedAt: null,
					error: null,
					state: 'running',
				})
			);
			// A többi kártya nem beszél más futásáról.
			expect(store.runs()['concerts']).toBeUndefined();
		});

		// A hiba ott szólal meg, ahol a gomb van, nem a füleken alul: azt
		// senki nem látja, aki a gombra nézett.
		it('a betöltés hibája a saját kártyájára megy, nem a lap aljára', () => {
			const { effect, store } = setUp();

			effect.suggestVenues$.mockReturnValue(
				throwError(() => new Error('concert-ai-quota'))
			);
			store.suggestVenues();

			expect(store.runs()['ai-venues']).toEqual(
				expect.objectContaining({
					error: 'concert-ai-quota',
					state: 'error',
				})
			);
			expect(store.runs()['ai-venues']?.endedAt).toEqual(
				expect.any(Number)
			);
			// A lap hibasora az írásoké maradt.
			expect(store.error()).toBeNull();
		});

		// Egy lefutott betöltés és egy el sem indított ugyanúgy nézett ki,
		// mert az ország-váltás elvitte az eredményt. A futás a saját
		// országát hordozza, ezért megmaradhat.
		it('ország-váltás után is megmarad az előző futás jelentése', () => {
			const { store } = setUp();

			store.suggestVenues();
			store.setCountry('AT');

			expect(store.runs()['ai-venues']).toEqual(
				expect.objectContaining({
					countryCode: 'HU',
					state: 'done',
				})
			);
			expect(store.suggestedVenues()).toEqual(NOTHING_PROPOSED);
		});
	});
});
