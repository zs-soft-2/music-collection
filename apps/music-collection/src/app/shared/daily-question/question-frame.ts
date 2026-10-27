/**
 * How a daily question reads: which i18n frame it goes in, and the catalog
 * values that fill the frame's slots.
 *
 * It lives here rather than with the game's page because three places need
 * the same sentence: the question of the day, the collector's own history of
 * past days, and the admin's list of what has been asked. A question that
 * reads one way on one page and another way on the next is not the same
 * question.
 */

/** The frame and its values; the values are catalog text, never translated. */
export interface QuestionFrame {
	/** Full i18n key, `dailyQuestion.template.<key>`. */
	key: string;
	params: Record<string, string>;
}

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
	'albumStyle',
	'earliestAlbum',
	'trackAlbum',
	'nextTrack',
	'trackPosition',
	'shortestTrack',
	'albumLength',
	'notOnAlbum',
	'coverAlbum',
	'releaseCountry',
	'artistFormedIn',
	'bandMember',
	'memberBand',
	'memberInstrument',
	'albumCredit',
	'albumProducer',
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

/** The sentence: the frame's key, and everything that goes in its slots. */
export function toQuestionFrame(
	templateKey: string,
	params: Record<string, string> | undefined | null
): QuestionFrame {
	const values = params ?? {};

	return {
		key: `${TEMPLATE_KEY_PREFIX}${toFrameKey(templateKey, values)}`,
		params: { ...values, edition: toEdition(values) },
	};
}
