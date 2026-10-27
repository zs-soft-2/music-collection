import {
	DEFAULT_DAILY_QUESTION_SETTINGS,
	DailyQuestionSettings,
	dayRulesFor,
	isBonusDay,
	sanitizeDailyQuestionSettings,
	scoringFor,
} from './daily-question-settings';

const settings = (
	overrides: Partial<DailyQuestionSettings> = {}
): DailyQuestionSettings => ({
	...DEFAULT_DAILY_QUESTION_SETTINGS,
	...overrides,
});

describe('sanitizeDailyQuestionSettings', () => {
	it('az üres mentésből az alapértelmezés lesz', () => {
		expect(sanitizeDailyQuestionSettings({})).toEqual(
			DEFAULT_DAILY_QUESTION_SETTINGS
		);
	});

	it('a képtelen értékeket a korlátaikhoz húzza', () => {
		const clean = sanitizeDailyQuestionSettings({
			timeLimitSec: 99999,
			points: { easy: -5, medium: 20, hard: 99999 },
			bonusDayChance: 3,
			bonusDayMultiplier: 0,
			leaderboardSize: 0,
		});

		expect(clean.timeLimitSec).toBe(600);
		expect(clean.points.easy).toBe(0);
		expect(clean.points.hard).toBe(1000);
		expect(clean.bonusDayChance).toBe(1);
		expect(clean.bonusDayMultiplier).toBe(1);
		expect(clean.leaderboardSize).toBe(1);
	});

	it('az óra kikapcsolható', () => {
		expect(
			sanitizeDailyQuestionSettings({ timeLimitSec: 0 }).timeLimitSec
		).toBe(0);
	});

	it('a kikapcsolt sablonok listájából kiszűri a szemetet', () => {
		expect(
			sanitizeDailyQuestionSettings({
				disabledTemplates: [
					'albumYear',
					'albumYear',
					'  ',
					42 as unknown as string,
				],
			}).disabledTemplates
		).toEqual(['albumYear']);
	});

	it('ismeretlen mezőt nem enged át', () => {
		const clean = sanitizeDailyQuestionSettings({
			enabled: true,
			hack: 'igen',
		} as unknown);

		expect('hack' in clean).toBe(false);
	});
});

describe('isBonusDay', () => {
	it('nulla eséllyel soha, egy eséllyel mindig', () => {
		expect(isBonusDay('2026-09-24', settings({ bonusDayChance: 0 }))).toBe(
			false
		);
		expect(isBonusDay('2026-09-24', settings({ bonusDayChance: 1 }))).toBe(
			true
		);
	});

	it('ugyanaz a nap mindig ugyanazt mondja', () => {
		const chance = settings({ bonusDayChance: 0.5 });

		expect(isBonusDay('2026-09-24', chance)).toBe(
			isBonusDay('2026-09-24', chance)
		);
	});

	it('az esély nagyjából annyi napot választ ki, amennyit ígér', () => {
		const chance = settings({ bonusDayChance: 0.2 });
		const days = Array.from({ length: 200 }, (_, index) => {
			const date = new Date(Date.UTC(2026, 0, 1 + index));

			return date.toISOString().slice(0, 10);
		});
		const bonus = days.filter((day) => isBonusDay(day, chance)).length;

		expect(bonus).toBeGreaterThan(days.length * 0.1);
		expect(bonus).toBeLessThan(days.length * 0.3);
	});
});

describe('scoringFor', () => {
	it('a nehézség alappontját viszi', () => {
		expect(
			scoringFor('2026-09-24', 'hard', settings({ bonusDayChance: 0 }))
		).toMatchObject({ base: 30, multiplier: 1 });
	});

	it('bónusz napon szoroz', () => {
		expect(
			scoringFor(
				'2026-09-24',
				'easy',
				settings({ bonusDayChance: 1, bonusDayMultiplier: 3 })
			).multiplier
		).toBe(3);
	});

	it('óra nélkül nincs gyorsasági bónusz', () => {
		expect(
			scoringFor(
				'2026-09-24',
				'easy',
				settings({ timeLimitSec: 0, speedBonusMax: 25 })
			).speedBonusMax
		).toBe(0);
	});
});

describe('dayRulesFor', () => {
	it('az időkorlátot és a pontozást egyben adja', () => {
		const rules = dayRulesFor(
			'2026-09-24',
			'medium',
			settings({ timeLimitSec: 45, bonusDayChance: 0 })
		);

		expect(rules.timeLimitSec).toBe(45);
		expect(rules.scoring.base).toBe(20);
	});
});
