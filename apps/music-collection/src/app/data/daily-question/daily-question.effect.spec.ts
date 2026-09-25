import { dailyQuestionDay } from '@music-collection/api';

import { DailyQuestionEffect, toAnswerFailure } from './daily-question.effect';

describe('dailyQuestionDay', () => {
	it('a játék időzónájában adja a napot, nem UTC-ben', () => {
		// Budapesten 2026-09-25 00:05 — UTC szerint még 24-e este.
		expect(dailyQuestionDay(new Date('2026-09-24T22:05:00Z'))).toBe(
			'2026-09-25'
		);
	});

	it('téli időszámításban is a helyi napot adja', () => {
		expect(dailyQuestionDay(new Date('2026-11-30T23:30:00Z'))).toBe(
			'2026-12-01'
		);
	});
});

describe('toAnswerFailure', () => {
	it('a nap fordulását külön okként adja vissza', () => {
		expect(toAnswerFailure({ code: 'functions/failed-precondition' })).toBe(
			'stale-day'
		);
	});

	it('a hiányzó kérdést felismeri', () => {
		expect(toAnswerFailure({ code: 'functions/not-found' })).toBe(
			'no-question'
		);
	});

	it('a kiesett session-t felismeri', () => {
		expect(toAnswerFailure({ code: 'functions/unauthenticated' })).toBe(
			'signed-out'
		);
	});

	it('amit nem ismer, azt nem találgatja', () => {
		expect(toAnswerFailure({ code: 'functions/internal' })).toBe('unknown');
		expect(toAnswerFailure(new Error('hálózat'))).toBe('unknown');
		expect(toAnswerFailure(null)).toBe('unknown');
	});
});

describe('DailyQuestionEffect órája', () => {
	/** A böngésző emlékezete, amennyit az effect használ belőle. */
	const repository = () => {
		const store = new Map<string, number>();

		return {
			startedAt: (day: string) => store.get(day) ?? null,
			rememberStart: (day: string, startedAt: number) =>
				void store.set(day, startedAt),
		};
	};

	/** Az effect a repositoryn kívül semmit nem használ ezekhez. */
	const effectWith = (fake: ReturnType<typeof repository>) =>
		Object.assign(Object.create(DailyQuestionEffect.prototype), {
			repository: fake,
		}) as DailyQuestionEffect;

	it('az első megnyitáskor most indítja az órát', () => {
		const effect = effectWith(repository());

		expect(effect.startedAt('2026-09-24', 1000)).toBe(1000);
	});

	it('újratöltéskor nem indítja újra', () => {
		const fake = repository();
		const effect = effectWith(fake);

		effect.startedAt('2026-09-24', 1000);

		expect(effect.startedAt('2026-09-24', 55000)).toBe(1000);
	});

	it('a másik napnak saját órája van', () => {
		const fake = repository();
		const effect = effectWith(fake);

		effect.startedAt('2026-09-24', 1000);

		expect(effect.startedAt('2026-09-25', 90000)).toBe(90000);
	});
});
