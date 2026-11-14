/** A napi kérdés játék: összeállítás, tipp, beállítások, ranglista. */

import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { database } from './functions-runtime';
import { requireCaller } from './callable-caller';
import {
	DailyAnswerError,
	DailyAnswerFailure,
	answerDailyQuestion as gradeDailyAnswer,
} from './daily-answer';
import { composeDailyQuestion } from './daily-question-compose';
import { refreshDailyQuestionLeaderboard } from './daily-question-leaderboard';
import {
	readDailyQuestionSettings as readGameSettings,
	writeDailyQuestionSettings,
} from './daily-question-settings';
import { templateCatalog } from './daily-question';

/**
 * A nap kérdése, éjfél után néhány perccel — hogy aki a nap első percében
 * nyit rá, már találjon kérdést.
 *
 * Idempotens: ha a nap kérdése megvan, a futás nem ír újra. Az ütemező
 * újrapróbálkozása így nem cserélheti le a kérdést az alól, aki már
 * válaszolt rá.
 */
export const composeDailyQuestionDaily = onSchedule(
	{
		schedule: '5 0 * * *',
		timeZone: 'Europe/Budapest',
		timeoutSeconds: 120,
		// Ütemezett futás, nem a böngészőből: App Check tokenje nincs.
		enforceAppCheck: false,
	},
	async () => {
		const result = await composeDailyQuestion(database());
		const outcome = {
			created: `${result.templateKey} / ${result.difficulty}, ${result.tries} húzásból${
				result.multiplier > 1
					? `, bónusz nap ×${result.multiplier}`
					: ''
			}`,
			exists: 'már megvolt',
			disabled: 'a játék ki van kapcsolva',
			'no-material': 'nem állt össze kérdés',
		};

		logger.info(`Napi kérdés (${result.day}): ${outcome[result.reason]}`);
	}
);

/**
 * Ugyanaz kézzel, az adminnak: holnapi kérdés előre, vagy egy rossz kérdés
 * lecserélése (`force`). A `force` azt is felülírja, amire már válaszoltak,
 * ezért ADMIN kell hozzá.
 */
export const composeDailyQuestionNow = onCall(async (request) => {
	await requireCaller(request, 'ADMIN');

	const input = (request.data ?? {}) as { day?: string; force?: boolean };

	if (input.day && !/^\d{4}-\d{2}-\d{2}$/.test(input.day)) {
		throw new HttpsError('invalid-argument', 'A nap YYYY-MM-DD alakú.');
	}

	return composeDailyQuestion(database(), {
		day: input.day,
		force: !!input.force,
	});
});

/**
 * A kiértékelés elakadásai hibakódra fordítva. A nap fordulása nem
 * „érvénytelen adat": a kliens ebből tudja, hogy a kérdést kell újratöltenie,
 * nem a tippet javítania.
 */
const ANSWER_ERROR_CODES: Record<
	DailyAnswerFailure,
	'failed-precondition' | 'not-found' | 'invalid-argument'
> = {
	'stale-day': 'failed-precondition',
	'no-question': 'not-found',
	'unknown-option': 'invalid-argument',
};

/**
 * A nap kérdésére adott tipp: kiértékelés, pont, sorozat.
 *
 * Bejelentkezés kell hozzá, permission nem — a napi kérdés a gyűjtőké, mint
 * a hallgatási napló. A tipp helyességét csak itt lehet megtudni: a
 * megfejtés olyan dokumentumban áll, amit a szabályok senkinek nem engednek
 * olvasni.
 *
 * Egy tipp: a második hívás ugyanazt a választ adja vissza (`graded: false`),
 * nem értékel újra.
 */
export const answerDailyQuestion = onCall(async (request) => {
	const uid = request.auth?.uid;

	if (!uid) {
		throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
	}

	const input = (request.data ?? {}) as {
		day?: string;
		optionId?: string;
		elapsedSec?: number;
	};

	if (!input.day || !/^\d{4}-\d{2}-\d{2}$/.test(input.day)) {
		throw new HttpsError('invalid-argument', 'A nap YYYY-MM-DD alakú.');
	}
	if (typeof input.optionId !== 'string' || !input.optionId) {
		throw new HttpsError('invalid-argument', 'Hiányzó válaszlehetőség.');
	}

	try {
		return await gradeDailyAnswer(
			database(),
			uid,
			input.day,
			input.optionId,
			new Date(),
			input.elapsedSec
		);
	} catch (error) {
		if (error instanceof DailyAnswerError) {
			throw new HttpsError(
				ANSWER_ERROR_CODES[error.reason],
				error.message
			);
		}

		logger.warn(`answerDailyQuestion ${uid} ${input.day}`, error);

		throw new HttpsError('internal', 'A tipp kiértékelése nem sikerült.');
	}
});

/**
 * A játék beállításai az admin felületnek, és amit ki-be lehet kapcsolni: a
 * kérdésfajták listája a motorból jön, nem egy kézzel karbantartott
 * másolatból — így nem lehet olyan sablont kapcsolgatni, amit senki nem húz.
 */
export const readDailyQuestionSettings = onCall(async (request) => {
	await requireCaller(request, 'ADMIN');

	return {
		settings: await readGameSettings(database()),
		templates: templateCatalog(),
	};
});

export const updateDailyQuestionSettings = onCall(async (request) => {
	await requireCaller(request, 'ADMIN');

	return {
		settings: await writeDailyQuestionSettings(
			database(),
			request.data?.settings
		),
		templates: templateCatalog(),
	};
});

/**
 * A ranglista újraépítése, naponta egyszer — nem éjfélkor, hanem este:
 * akkor van a legtöbb tipp a mai napról a kasszákban, tehát a lista akkor
 * mond a legtöbbet.
 *
 * A mezőnyt egyedül ez a futás olvassa végig; a látogató egy dokumentumot
 * olvas belőle, a saját helyezését pedig a kasszájából.
 */
export const refreshDailyQuestionLeaderboardDaily = onSchedule(
	{
		schedule: '40 23 * * *',
		timeZone: 'Europe/Budapest',
		timeoutSeconds: 300,
		enforceAppCheck: false,
	},
	async () => {
		const settings = await readGameSettings(database());
		const result = await refreshDailyQuestionLeaderboard(
			database(),
			settings.leaderboardSize
		);

		logger.info(
			`Napi kérdés ranglista: ${result.players} játékos, ${result.ranked} helyezés frissült`
		);
	}
);

/** Ugyanaz kézzel, az adminnak — a beállítás mentése után jól jön. */
export const refreshDailyQuestionLeaderboardNow = onCall(
	{ timeoutSeconds: 300 },
	async (request) => {
		await requireCaller(request, 'ADMIN');

		const settings = await readGameSettings(database());

		return refreshDailyQuestionLeaderboard(
			database(),
			settings.leaderboardSize
		);
	}
);
