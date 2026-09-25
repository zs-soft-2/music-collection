import { dailyQuestionDay } from '@music-collection/api';

import { toAnswerFailure } from './daily-question.effect';

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
