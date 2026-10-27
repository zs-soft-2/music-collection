import { DAILY_QUESTION_TIME_ZONE, dailyQuestionDay } from '../daily-question';

/**
 * The band of the week: one artist for a week, the same for everybody.
 * Document: `band-of-the-week/{week}`, the ISO week being its id.
 *
 * Written only by `composeBandOfTheWeekWeekly` (Cloud Functions), a few
 * minutes after midnight on Monday in the game's own time zone. Nothing is
 * ever written here from the client.
 *
 * It carries a reference, not a copy: the artist's id and name, and why they
 * were chosen. The picture, the styles and the records come from the catalog
 * the client already holds — copied in here they would go stale mid-week.
 *
 * Unlike the daily question, this is readable signed out: it stands in the
 * hero of the home page, which a guest sees too.
 */
export interface BandOfTheWeek {
	/** The ISO week, `YYYY-Www`; also the document id. */
	week: string;
	/** Monday and Sunday of that week, `YYYY-MM-DD`. */
	startDay: string;
	endDay: string;
	artistUid: string;
	/** Kept for the weeks whose artist has since left the catalog. */
	artistName: string;
	reason: BandOfTheWeekReason;
	/** Catalog values for the reason's placeholders — a year, a title. */
	reasonParams: Record<string, string>;
	/** What the catalog holds of them, and how much of it can be played. */
	albumCount: number;
	playableAlbums: number;
	/** When the run chose them, epoch milliseconds. */
	pickedAt: number;
}

/**
 * Why this band. Only `random` is drawn today; the rest are what the engine
 * grows into, and the page already knows how to say each of them.
 *
 * The same list lives in `apps/functions/src/band-of-the-week.ts`, because
 * the functions build cannot see the libraries. The two have to say the same
 * thing.
 */
export type BandOfTheWeekReason =
	/** Nothing was due: they were drawn. */
	| 'random'
	/** A record of theirs has its anniversary this week. */
	| 'anniversary'
	/** The catalog took in most of their records this week. */
	| 'new-in-catalog'
	/** A record of theirs is on its way. */
	| 'upcoming';

/** The collection of weeks: `band-of-the-week/{week}`. */
export const BAND_OF_THE_WEEK_FEATURE_KEY = 'band-of-the-week';

const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (day: string): Date => new Date(`${day}T00:00:00Z`);

/**
 * The ISO week a day falls in, `YYYY-Www`.
 *
 * ISO counts weeks from Monday, and the year's first week is the one holding
 * January 4th — which is why the 1st of January can still belong to the week
 * of the year before. The server works the same way
 * (`weekOf` in `apps/functions/src/band-of-the-week.ts`); the two have to
 * agree, or the client would ask for a document that does not exist.
 */
export function bandWeekOf(day: string): string {
	const date = toDate(day);
	// Thursday decides which year the week belongs to — the ISO rule.
	const thursday = new Date(
		date.getTime() + (3 - ((date.getUTCDay() + 6) % 7)) * DAY_MS
	);
	const firstThursday = toDate(`${thursday.getUTCFullYear()}-01-04`);
	const week =
		1 +
		Math.round(
			(thursday.getTime() -
				firstThursday.getTime() +
				((firstThursday.getUTCDay() + 6) % 7) * DAY_MS) /
				(7 * DAY_MS)
		);

	return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** This week, in the game's own zone — the document to read. */
export function bandOfTheWeekId(
	now: Date = new Date(),
	timeZone: string = DAILY_QUESTION_TIME_ZONE
): string {
	return bandWeekOf(dailyQuestionDay(now, timeZone));
}
