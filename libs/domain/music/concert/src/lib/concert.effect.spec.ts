import { firstValueFrom, lastValueFrom } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import { ConcertEffect, VENUE_IN_USE, sortConcerts } from './concert.effect';
import {
	concertOf,
	provideConcertTesting,
	suggestionOf,
	venueOf,
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
		suggestions = [suggestionOf()]
	): ConcertEffect {
		TestBed.configureTestingModule({
			providers: [provideConcertTesting(concerts, venues, suggestions)],
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

		expect(coming.map((concert) => concert.uid)).toEqual(['today', 'future']);
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
		const effect = effectWith([concertOf({ venueUid: 'mbid-park' })], [park]);

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
			concertOf({ uid: 'b', startsAt: '2026-11-12', startsAtTime: '21:00' }),
			concertOf({ uid: 'c', startsAt: '2026-11-13' }),
			concertOf({ uid: 'a', startsAt: '2026-11-12', startsAtTime: '19:00' }),
		]);

		expect(sorted.map((concert) => concert.uid)).toEqual(['a', 'b', 'c']);
	});
});
