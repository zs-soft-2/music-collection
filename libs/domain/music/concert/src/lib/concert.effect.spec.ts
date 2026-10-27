import { firstValueFrom, lastValueFrom, of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { VenueRepository } from '@music-collection/api';

import { ConcertEffect, VENUE_IN_USE, sortConcerts } from './concert.effect';
import {
	concertOf,
	provideConcertTesting,
	suggestionOf,
	venueOf,
	venueSuggestionOf,
} from './concert.testing';

describe('ConcertEffect', () => {
	const park = venueOf({ uid: 'mbid-park', name: 'Budapest Park' });
	const closed = venueOf({
		uid: 'mbid-closed',
		name: 'Petőfi Csarnok',
		active: false,
	});

	function effectWith(
		concerts = [concertOf()],
		venues = [park, closed],
		suggestions = [suggestionOf()],
		venueSuggestions = [venueSuggestionOf()]
	): ConcertEffect {
		TestBed.configureTestingModule({
			providers: [
				provideConcertTesting(
					concerts,
					venues,
					suggestions,
					[],
					venueSuggestions
				),
			],
		});

		return TestBed.inject(ConcertEffect);
	}

	afterEach(() => TestBed.resetTestingModule());

	// A betöltések naponta futnak a legjobb esetben is, tehát egy tegnap este
	// lejátszott koncert reggel még a kollekcióban áll. A napot ezért itt
	// vizsgáljuk, nem az írásból hisszük el.
	it('a lejárt estéket elhagyja, a maiakat megtartja', async () => {
		const effect = effectWith([
			concertOf({ uid: 'past', startsAt: '2026-11-11' }),
			concertOf({ uid: 'today', startsAt: '2026-11-12' }),
			concertOf({ uid: 'future', startsAt: '2026-12-01' }),
		]);

		const coming = await lastValueFrom(effect.coming$('2026-11-12'));

		expect(coming.map((concert) => concert.uid)).toEqual([
			'today',
			'future',
		]);
	});

	// A többnapos fesztivál addig tart, amíg le nem zárult: a második napján
	// kezdődött fesztivál még műsoron van.
	it('a fesztivált az utolsó napjáig megtartja', async () => {
		const effect = effectWith([
			concertOf({
				uid: 'festival',
				startsAt: '2026-11-10',
				endsAt: '2026-11-14',
				eventType: 'festival',
			}),
		]);

		const coming = await lastValueFrom(effect.coming$('2026-11-12'));

		expect(coming).toHaveLength(1);
	});

	it('a koncertekhez a helyszínüket adja', async () => {
		const effect = effectWith([concertOf({ venueUid: 'mbid-park' })]);

		const rows = await lastValueFrom(effect.comingWithVenue$('2026-11-01'));

		expect(rows[0].venue?.name).toBe('Budapest Park');
	});

	it('ismeretlen helyszínre null-t ad, nem hagyja ki a koncertet', async () => {
		const effect = effectWith([concertOf({ venueUid: 'nincs-ilyen' })]);

		const rows = await lastValueFrom(effect.comingWithVenue$('2026-11-01'));

		expect(rows).toHaveLength(1);
		expect(rows[0].venue).toBeNull();
	});

	it('a formokra csak a nem visszavont helyszíneket kínálja', async () => {
		const effect = effectWith();

		const open = await lastValueFrom(effect.openVenues$);

		expect(open.map((venue) => venue.uid)).toEqual(['mbid-park']);
	});

	it('a javaslatok közül csak a döntésre várók jönnek, a biztosabb elöl', async () => {
		const effect = effectWith(
			[],
			[park],
			[
				suggestionOf({ uid: 'sure', confidence: 0.9 }),
				suggestionOf({ uid: 'unsure', confidence: 0.3 }),
				suggestionOf({ uid: 'gone', reviewState: 'rejected' }),
			]
		);

		const pending = await lastValueFrom(effect.pending$);

		expect(pending.map((suggestion) => suggestion.uid)).toEqual([
			'sure',
			'unsure',
		]);
	});

	// A helyszínre hivatkozó koncertek enélkül a semmibe mutatnának, és a
	// kliens nem tudná visszatenni a helyszínt.
	it('a használatban lévő helyszín törlését megtagadja', async () => {
		const effect = effectWith(
			[concertOf({ venueUid: 'mbid-park' })],
			[park]
		);

		await expect(firstValueFrom(effect.deleteVenue$(park))).rejects.toThrow(
			VENUE_IN_USE
		);
	});

	it('a szabad helyszínt törli', async () => {
		const effect = effectWith([], [park]);

		await expect(
			firstValueFrom(effect.deleteVenue$(park))
		).resolves.toBeUndefined();
	});

	// Ugyanaz a rendezés, mint a koncert-javaslatoknál: a biztosabb elöl, és
	// az elutasított kimarad — azt a lista csak azért tartja, hogy a
	// következő futás ne hozza fel újra.
	it('a helyszín-javaslatok közül a döntésre várók jönnek, a biztosabb elöl', async () => {
		const effect = effectWith(
			[],
			[park],
			[],
			[
				venueSuggestionOf({ uid: 'unsure', confidence: 0.3 }),
				venueSuggestionOf({ uid: 'sure', confidence: 0.9 }),
				venueSuggestionOf({ uid: 'gone', reviewState: 'rejected' }),
			]
		);

		const pending = await lastValueFrom(effect.pendingVenues$);

		expect(pending.map((suggestion) => suggestion.uid)).toEqual([
			'sure',
			'unsure',
		]);
	});

	// A szám a párbeszéd szövege, nem csak igen-nem: ezért számol, és ezért a
	// szervertől kérdezi.
	it('megszámolja, mi tartja életben a helyszínt', async () => {
		const effect = effectWith(
			[
				concertOf({ uid: 'one', venueUid: 'mbid-park' }),
				concertOf({ uid: 'two', venueUid: 'mbid-park' }),
			],
			[park]
		);

		await expect(
			firstValueFrom(effect.venueUsage$('mbid-park'))
		).resolves.toEqual({ concerts: 2 });
	});

	/*
	 * A meg nem számolható helyszín nem „használatban van": a kliens nem tud
	 * kérdezni, és ilyenkor a kísérlet mehet — a szerver dönt. A fordítottja
	 * egy tiltott gomb magyarázat nélkül, és abból lett a „nem működik a
	 * törlés".
	 */
	it('a meg nem számolható helyszínt nem mondja használatban lévőnek', async () => {
		const effect = effectWith([], [park]);

		jest.spyOn(TestBed.inject(VenueRepository), 'usage$').mockReturnValue(
			of({ concerts: null })
		);

		await expect(
			firstValueFrom(effect.deleteVenue$(park))
		).resolves.toBeUndefined();
	});

	// A lista üresen indul, nem várakozóan: egy lap, ami az első válaszra várna,
	// örökre várna, ha egy szabály vagy index hiányzik — a sync nem hibázik,
	// csak soha nem emittál.
	it('üres listával indul, nem vár az első válaszra', async () => {
		const effect = effectWith([]);

		expect(await firstValueFrom(effect.concerts$)).toEqual([]);
		expect(await firstValueFrom(effect.venues$)).toEqual([]);
	});
});

describe('sortConcerts', () => {
	it('nap, majd kezdés, majd előadó szerint', () => {
		const sorted = sortConcerts([
			concertOf({
				uid: 'b',
				startsAt: '2026-11-12',
				startsAtTime: '21:00',
			}),
			concertOf({ uid: 'c', startsAt: '2026-11-13' }),
			concertOf({
				uid: 'a',
				startsAt: '2026-11-12',
				startsAtTime: '19:00',
			}),
		]);

		expect(sorted.map((concert) => concert.uid)).toEqual(['a', 'b', 'c']);
	});
});
