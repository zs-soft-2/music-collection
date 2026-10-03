import {
	ConcertEntity,
	MUSICBRAINZ_PLACE_URL,
	VenueEntity,
	toConcertLineup,
} from '@music-collection/api';
import { normalizeCatalogName } from '@music-collection/common/engine';

import {
	ConcertActView,
	ConcertDayView,
	ConcertMonthView,
	ConcertView,
} from './concert.model';

const MONTH_FORMAT = new Intl.DateTimeFormat('hu-HU', {
	month: 'long',
	year: 'numeric',
});
const WEEKDAY_FORMAT = new Intl.DateTimeFormat('hu-HU', { weekday: 'long' });
const MILLISECONDS_A_DAY = 24 * 60 * 60 * 1000;

/** A stored `YYYY-MM-DD` as a date, read as noon UTC so no zone shifts it. */
const toDate = (day: string): Date => new Date(`${day}T12:00:00Z`);

/** What a programme writes between two bands of the same night. */
const ACT_SEPARATORS = /[|/+·,]|\s[-–—]\s/;

/**
 * Whether the title is the bill written out, and so says nothing the acts
 * below it do not.
 *
 * A seven-band night arrives titled "Hatebreed | Life of Agony | Despised Icon
 * | …", and the card would print that line, the credited artist above it and
 * the same seven names again underneath. Two acts are asked for at least: a
 * title that names one band is a title, not a list.
 */
export function isLineupTitle(title: string, acts: ConcertActView[]): boolean {
	const parts = title
		.split(ACT_SEPARATORS)
		.map((part) => normalizeCatalogName(part))
		.filter((part) => !!part);

	if (parts.length < 2) return false;

	const names = new Set(acts.map((act) => normalizeCatalogName(act.name)));

	return parts.every((part) => names.has(part));
}

export function toConcertView(
	concert: ConcertEntity,
	venue: VenueEntity | null
): ConcertView {
	const lineup: ConcertActView[] = toConcertLineup(concert).map((act) => ({
		artistUid: act.artistUid,
		name: act.name,
	}));
	const titleIsArtist =
		normalizeCatalogName(concert.title) ===
			normalizeCatalogName(concert.artistName) ||
		isLineupTitle(concert.title, lineup);

	return {
		artistImageUrl: concert.artistImageUrl,
		artistName: concert.artistName,
		artistUid: concert.artistUid,
		cancelled: concert.cancelled,
		city: venue?.city ?? concert.city,
		endsAt: concert.endsAt,
		eventType: concert.eventType,
		lineup,
		source: concert.source,
		sourceUrl: concert.sourceUrl,
		startsAt: concert.startsAt,
		startsAtTime: concert.startsAtTime,
		ticketUrl: concert.ticketUrl,
		title: titleIsArtist ? concert.artistName : concert.title,
		titleIsArtist,
		uid: concert.uid,
		venueAddress: venue?.address ?? null,
		venueName: venue?.name ?? concert.venueName,
		venueUrl: venue?.musicBrainzId
			? `${MUSICBRAINZ_PLACE_URL}/${venue.musicBrainzId}`
			: null,
	};
}

/** How far off the night is, in the words the page uses for it. */
export function toCountdown(day: string, from: string): string {
	const days = Math.round(
		(toDate(day).getTime() - toDate(from).getTime()) / MILLISECONDS_A_DAY
	);

	if (days <= 0) return 'page.concert.countdown.today';
	if (days === 1) return 'page.concert.countdown.tomorrow';
	if (days < 7) return 'page.concert.countdown.days';
	if (days < 14) return 'page.concert.countdown.nextWeek';

	return 'page.concert.countdown.weeks';
}

/** The number the countdown sentence needs; null when it names no number. */
export function toCountdownValue(day: string, from: string): number | null {
	const days = Math.round(
		(toDate(day).getTime() - toDate(from).getTime()) / MILLISECONDS_A_DAY
	);

	if (days <= 1) return null;
	if (days < 7) return days;
	if (days < 14) return null;

	return Math.round(days / 7);
}

/**
 * The timeline: months, and within them the days that have a concert on them.
 * Empty days are left out — a month of blank rows would bury the nights that
 * matter.
 *
 * The concerts are expected in date order, as the effect hands them over.
 */
export function toMonths(
	concerts: { concert: ConcertEntity; venue: VenueEntity | null }[],
	today: string
): ConcertMonthView[] {
	const days = new Map<string, ConcertDayView>();

	for (const { concert, venue } of concerts) {
		const key = concert.startsAt;
		const day = days.get(key);

		if (day) {
			day.concerts.push(toConcertView(concert, venue));

			continue;
		}

		const date = toDate(key);

		days.set(key, {
			concerts: [toConcertView(concert, venue)],
			countdown: toCountdown(key, today),
			day: `${date.getUTCDate()}`,
			key,
			weekday: WEEKDAY_FORMAT.format(date),
		});
	}

	const months = new Map<string, ConcertMonthView>();

	for (const day of days.values()) {
		const key = day.key.slice(0, 7);
		const month = months.get(key);

		if (month) {
			month.days.push(day);

			continue;
		}

		months.set(key, {
			days: [day],
			key,
			label: MONTH_FORMAT.format(toDate(day.key)),
		});
	}

	return [...months.values()];
}

/** The cities that have a concert, in alphabetical order — the filter's list. */
export function toCities(
	concerts: { concert: ConcertEntity; venue: VenueEntity | null }[]
): string[] {
	const cities = new Set<string>();

	for (const { concert, venue } of concerts) {
		const city = venue?.city ?? concert.city;

		if (city) cities.add(city);
	}

	return [...cities].sort((left, right) => left.localeCompare(right, 'hu'));
}
