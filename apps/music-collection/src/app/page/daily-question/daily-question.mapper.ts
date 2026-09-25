import {
	DailyAnswer,
	DailyQuestionEntity,
	DailyQuestionSubject,
} from '@music-collection/api';

import {
	DailyQuestionOptionView,
	DailyQuestionView,
	QuestionFrame,
} from './daily-question.model';

/** i18n prefix of the question frames. */
export const TEMPLATE_KEY_PREFIX = 'dailyQuestion.template.';

/**
 * The frames this client has words for. The server may learn a template
 * before the client does — the app talks to the deployed functions even in
 * development — and a question in a frame nobody translated would show its
 * i18n key to the collector. An unknown template gets the plain frame
 * instead: the options still say everything needed to guess.
 */
export const KNOWN_TEMPLATE_KEYS = [
	'albumArtist',
	'albumYear',
	'openingTrack',
	'trackCount',
	'releaseLabel',
	'artistCountry',
	'longestTrack',
	'sideBOpener',
	'releaseCatno',
];

/**
 * How the question says which pressing it means — `1986 US`. Both halves are
 * optional: the catalog knows the year of some pressings and the country of
 * others, and of many neither.
 */
export function toEdition(params: Record<string, string>): string {
	return [params['year'], params['country']].filter(Boolean).join(' ');
}

/**
 * Which frame the question goes in. Two templates have a longer frame for
 * when the catalog knows enough to use it: a question about the label names
 * the pressing when the album has several, and the catalogue number names
 * the label when the pressing has one.
 */
export function toFrameKey(
	templateKey: string,
	params: Record<string, string>
): string {
	if (!KNOWN_TEMPLATE_KEYS.includes(templateKey)) return 'fallback';

	if (templateKey === 'releaseLabel') {
		return toEdition(params) ? 'releaseLabelEdition' : 'releaseLabel';
	}
	if (templateKey === 'releaseCatno') {
		return params['label'] ? 'releaseCatnoLabel' : 'releaseCatno';
	}

	return templateKey;
}

export function toFrame(question: DailyQuestionEntity): QuestionFrame {
	const params = question.params ?? {};

	return {
		key: `${TEMPLATE_KEY_PREFIX}${toFrameKey(question.templateKey, params)}`,
		params: { ...params, edition: toEdition(params) },
	};
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
		default:
			return null;
	}
}
