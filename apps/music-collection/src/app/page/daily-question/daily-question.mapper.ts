import {
	DailyAnswer,
	DailyQuestionEntity,
	DailyQuestionLeaderboard,
	DailyQuestionScore,
	DailyQuestionSubject,
} from '@music-collection/api';

import { QuestionFrame, toQuestionFrame } from '../../shared/daily-question';

import {
	DailyQuestionOptionView,
	DailyQuestionView,
	EMPTY_LEADERBOARD_VIEW,
	HistoryRowView,
	LeaderboardRowView,
	LeaderboardView,
} from './daily-question.model';

export function toFrame(question: DailyQuestionEntity): QuestionFrame {
	return toQuestionFrame(question.templateKey, question.params);
}

/**
 * The four buttons. Before the guess only the pick is marked; afterwards the
 * right answer is shown, and the pick is crossed out only when it was wrong —
 * the other two are left alone, because the point is what the answer was,
 * not how many ways there were to miss it.
 */
export function toOptions(
	question: DailyQuestionEntity,
	answer: DailyAnswer | null,
	selectedOptionId: string | null
): DailyQuestionOptionView[] {
	return (question.options ?? []).map((option) => ({
		id: option.id,
		label: option.label,
		picked: answer
			? answer.optionId === option.id
			: selectedOptionId === option.id,
		correct: !!answer && answer.answerId === option.id,
		missed: !!answer && answer.optionId === option.id && !answer.correct,
	}));
}

export function toView(
	question: DailyQuestionEntity,
	answer: DailyAnswer | null,
	selectedOptionId: string | null
): DailyQuestionView {
	return {
		day: question.day,
		difficulty: question.difficulty,
		frame: toFrame(question),
		options: toOptions(question, answer, selectedOptionId),
		// Questions composed before the game had a clock carry neither; a
		// day without a limit and a plain day are the honest defaults.
		timeLimitSec: Math.max(question.timeLimitSec ?? 0, 0),
		multiplier: question.scoring?.multiplier ?? 1,
		imageUrl: question.imageUrl ?? null,
	};
}

/** Guesses that landed, as a percentage; 0 before the first one. */
export function toAccuracy(correct: number, answered: number): number {
	return answered ? Math.round((correct / answered) * 100) : 0;
}

const toRow = (
	row: DailyQuestionLeaderboard['rows'][number],
	uid: string | null
): LeaderboardRowView => ({
	rank: row.rank,
	name: row.name ?? '',
	points: row.points,
	streak: row.streak,
	longestStreak: row.longestStreak,
	answered: row.answered,
	correct: row.correct,
	accuracy: toAccuracy(row.correct, row.answered),
	isMe: !!uid && row.uid === uid,
});

/**
 * The table.
 *
 * The reader's own row comes from two places: from the field document when
 * they are near the top, and from their own pot otherwise — the pot is where
 * the nightly run leaves everybody's place. The pot is also the fresher of
 * the two for the points: it has today's guess in it, while the field is as
 * old as the last run.
 */
export function toLeaderboardView(
	leaderboard: DailyQuestionLeaderboard,
	score: DailyQuestionScore,
	uid: string | null
): LeaderboardView {
	if (!leaderboard.rows.length && !score.answered) {
		return EMPTY_LEADERBOARD_VIEW;
	}

	const rows = leaderboard.rows.map((row) => toRow(row, uid));
	const listed = rows.some((row) => row.isMe);

	return {
		rows,
		players: Math.max(leaderboard.players, score.answered ? 1 : 0),
		updatedAt: leaderboard.updatedAt,
		me:
			listed || !score.answered
				? null
				: {
						rank: score.rank ?? 0,
						name: '',
						points: score.points,
						streak: score.streak,
						longestStreak: score.longestStreak,
						answered: score.answered,
						correct: score.correct,
						accuracy: toAccuracy(score.correct, score.answered),
						isMe: true,
					},
	};
}

/**
 * Where the reveal leads: the album, artist or pressing the question was
 * about. A track carries no album in the subject, and the track page needs
 * one in its path, so that one is named without a link.
 */
export function toSubjectLink(
	subject: DailyQuestionSubject | null | undefined
): string[] | null {
	switch (subject?.kind) {
		case 'album':
			return ['/album', subject.uid];
		case 'artist':
			return ['/artist', subject.uid];
		case 'release':
			return ['/release', subject.uid];
		case 'musician':
			return ['/musician', subject.uid];
		default:
			return null;
	}
}

/**
 * The days behind, newest first: what was asked, and how the collector did.
 *
 * Today is left out — it is the question standing at the top of the page, and
 * a history that repeats it would say the same thing twice. A day with no
 * guess is still listed: what the question was is public, only its answer is
 * not, and seeing a skipped day is the point of a streak.
 */
export function toHistoryRows(
	questions: DailyQuestionEntity[],
	answers: DailyAnswer[],
	today: string
): HistoryRowView[] {
	const byDay = new Map(answers.map((answer) => [answer.day, answer]));

	return questions
		.filter((question) => question.day && question.day < today)
		.map((question) => {
			const answer = byDay.get(question.day) ?? null;
			const labelOf = (optionId: string): string =>
				(question.options ?? []).find(
					(option) => option.id === optionId
				)?.label ?? '';

			return {
				day: question.day,
				difficulty: question.difficulty,
				frame: toFrame(question),
				played: !!answer,
				correct: !!answer?.correct,
				answerLabel: answer ? labelOf(answer.answerId) : '',
				pickedLabel:
					answer && !answer.correct ? labelOf(answer.optionId) : '',
				points: answer?.points ?? 0,
				late: !!answer?.timedOut,
			};
		});
}
