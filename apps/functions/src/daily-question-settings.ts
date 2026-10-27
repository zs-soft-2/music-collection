/**
 * A napi kérdés játékszabályai, ahogy az admin felületről állíthatók:
 * `app-setting/daily-question`.
 *
 * Miért itt és nem a `libs/api`-ban: a functions build nem látja a libeket
 * ([[functions-nem-lat-libeket]]) — ugyanez az alak ott is megvan
 * (`DailyQuestionSettings`), és a kettőnek egyet kell mondania.
 *
 * A beállítást a kliens nem olvassa: ami a napi játékhoz kell belőle
 * (időkorlát, pontozás, szorzó), az a nap kérdésébe kerül bele, amikor az
 * összeáll. Így a délben átállított pontérték nem írja át a délelőtti
 * tippek árát, a kiértékelés pedig nem olvas plusz dokumentumot.
 */

import { Firestore } from 'firebase-admin/firestore';

import {
	DayRules,
	QuestionDifficulty,
	QuestionScoring,
	createRandom,
	hashSeed,
} from './daily-question';

const APP_SETTING_COLLECTION = 'app-setting';
const DAILY_QUESTION_SETTING_DOCUMENT = 'daily-question';

/** Amit az admin felületről lehet állítani. */
export interface DailyQuestionSettings {
	/** Kikapcsolva nem áll össze kérdés, és a lap ezt mondja. */
	enabled: boolean;
	/** Ennyi másodperc van válaszolni; 0 = nincs óra. */
	timeLimitSec: number;
	/** Amit a jó tipp fizet, nehézség szerint. */
	points: Record<QuestionDifficulty, number>;
	/** A sorozat naponta ennyit tesz mellé… */
	streakBonusPerDay: number;
	/** …de legföljebb ennyi napig. */
	maxStreakBonusDays: number;
	/**
	 * A gyorsasági bónusz felső határa. Csúszó skálán fizet: az azonnali
	 * tippnek az egészet, az utolsó másodpercben érkezőnek semmit. Óra
	 * nélkül értelmezhetetlen, ezért `timeLimitSec: 0` mellett nem fizet.
	 */
	speedBonusMax: number;
	/** Milyen gyakran essen bónusz nap (0–1). A napból dől el, mindenkinek ugyanúgy. */
	bonusDayChance: number;
	/** Ennyiszerezi a bónusz nap a pontot. */
	bonusDayMultiplier: number;
	/** Ezeket a sablonokat nem húzzuk. A többit igen. */
	disabledTemplates: string[];
	/** Ennyi helyet mutat a ranglista. */
	leaderboardSize: number;
}

export const DEFAULT_DAILY_QUESTION_SETTINGS: DailyQuestionSettings = {
	enabled: true,
	timeLimitSec: 60,
	points: { easy: 10, medium: 20, hard: 30 },
	streakBonusPerDay: 2,
	maxStreakBonusDays: 5,
	speedBonusMax: 10,
	bonusDayChance: 0.15,
	bonusDayMultiplier: 2,
	disabledTemplates: [],
	leaderboardSize: 20,
};

/** Felső korlátok: az admin elírása ne vigyen el egy ranglistát. */
const MAX_TIME_LIMIT_SEC = 600;
const MAX_POINTS = 1000;
const MAX_STREAK_BONUS = 100;
const MAX_STREAK_DAYS = 60;
const MAX_SPEED_BONUS = 500;
const MAX_MULTIPLIER = 10;
const MAX_LEADERBOARD_SIZE = 100;

const bounded = (
	value: unknown,
	fallback: number,
	min: number,
	max: number
): number =>
	typeof value === 'number' && Number.isFinite(value)
		? Math.min(Math.max(Math.round(value), min), max)
		: fallback;

/** A 0–1 közti esély; a többi számmal ellentétben nem egész. */
const chance = (value: unknown, fallback: number): number =>
	typeof value === 'number' && Number.isFinite(value)
		? Math.min(Math.max(value, 0), 1)
		: fallback;

/** A beállítás hiánya nem hiba: ilyenkor az alapértelmezés érvényes. */
export async function readDailyQuestionSettings(
	database: Firestore
): Promise<DailyQuestionSettings> {
	const snapshot = await database
		.collection(APP_SETTING_COLLECTION)
		.doc(DAILY_QUESTION_SETTING_DOCUMENT)
		.get();

	return sanitizeDailyQuestionSettings({
		...DEFAULT_DAILY_QUESTION_SETTINGS,
		...(snapshot.data() ?? {}),
	});
}

/** Az admin felület mentése: csak ismert mezők, mindegyik a saját korlátján belül. */
export function sanitizeDailyQuestionSettings(
	data: unknown
): DailyQuestionSettings {
	const input = (data ?? {}) as Partial<DailyQuestionSettings>;
	const points = (input.points ?? {}) as Partial<
		Record<QuestionDifficulty, number>
	>;
	const fallback = DEFAULT_DAILY_QUESTION_SETTINGS;

	return {
		enabled: input.enabled !== false,
		timeLimitSec: bounded(
			input.timeLimitSec,
			fallback.timeLimitSec,
			0,
			MAX_TIME_LIMIT_SEC
		),
		points: {
			easy: bounded(points.easy, fallback.points.easy, 0, MAX_POINTS),
			medium: bounded(
				points.medium,
				fallback.points.medium,
				0,
				MAX_POINTS
			),
			hard: bounded(points.hard, fallback.points.hard, 0, MAX_POINTS),
		},
		streakBonusPerDay: bounded(
			input.streakBonusPerDay,
			fallback.streakBonusPerDay,
			0,
			MAX_STREAK_BONUS
		),
		maxStreakBonusDays: bounded(
			input.maxStreakBonusDays,
			fallback.maxStreakBonusDays,
			0,
			MAX_STREAK_DAYS
		),
		speedBonusMax: bounded(
			input.speedBonusMax,
			fallback.speedBonusMax,
			0,
			MAX_SPEED_BONUS
		),
		bonusDayChance: chance(input.bonusDayChance, fallback.bonusDayChance),
		bonusDayMultiplier: bounded(
			input.bonusDayMultiplier,
			fallback.bonusDayMultiplier,
			1,
			MAX_MULTIPLIER
		),
		disabledTemplates: Array.isArray(input.disabledTemplates)
			? [
					...new Set(
						input.disabledTemplates
							.filter(
								(key): key is string => typeof key === 'string'
							)
							.map((key) => key.trim())
							.filter(Boolean)
					),
				]
			: [],
		leaderboardSize: bounded(
			input.leaderboardSize,
			fallback.leaderboardSize,
			1,
			MAX_LEADERBOARD_SIZE
		),
	};
}

/** Mentés; a mentett állapotot adja vissza, mert a szerver vág. */
export async function writeDailyQuestionSettings(
	database: Firestore,
	data: unknown
): Promise<DailyQuestionSettings> {
	const settings = sanitizeDailyQuestionSettings(data);

	await database
		.collection(APP_SETTING_COLLECTION)
		.doc(DAILY_QUESTION_SETTING_DOCUMENT)
		.set({ ...settings, updatedAt: Date.now() }, { merge: true });

	return settings;
}

// ── A nap szabályai ─────────────────────────────────────────────────────────

/**
 * Bónusz nap-e a mai. A napból dől el, tehát mindenkinek ugyanaz, és
 * újrafuttatva is ugyanannyi — a saját magja azért van, hogy a kérdés
 * húzásainak száma ne mozdítsa el: a bónusz nap a naptól függjön, ne attól,
 * hányadik albumból lett kérdés.
 */
export function isBonusDay(
	day: string,
	settings: DailyQuestionSettings
): boolean {
	if (settings.bonusDayChance <= 0) return false;
	if (settings.bonusDayChance >= 1) return true;

	return createRandom(hashSeed(`${day}-bonus`))() < settings.bonusDayChance;
}

/** Amit a nap fizet: a nehézség alappontja, a bónuszok és a szorzó. */
export function scoringFor(
	day: string,
	difficulty: QuestionDifficulty,
	settings: DailyQuestionSettings
): QuestionScoring {
	return {
		base: settings.points[difficulty] ?? settings.points.medium,
		streakBonusPerDay: settings.streakBonusPerDay,
		maxStreakBonusDays: settings.maxStreakBonusDays,
		// Óra nélkül nincs mihez képest gyorsnak lenni.
		speedBonusMax: settings.timeLimitSec > 0 ? settings.speedBonusMax : 0,
		multiplier: isBonusDay(day, settings) ? settings.bonusDayMultiplier : 1,
	};
}

/** A nap szabályai egyben, ahogy a kérdésre kerülnek. */
export function dayRulesFor(
	day: string,
	difficulty: QuestionDifficulty,
	settings: DailyQuestionSettings
): DayRules {
	return {
		timeLimitSec: settings.timeLimitSec,
		scoring: scoringFor(day, difficulty, settings),
	};
}
