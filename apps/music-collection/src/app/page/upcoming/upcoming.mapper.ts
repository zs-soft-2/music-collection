import {
	MUSICBRAINZ_RELEASE_GROUP_URL,
	UpcomingReleaseEntity,
	coverArtUrl,
} from '@music-collection/api';

import {
	UpcomingDayView,
	UpcomingMonthView,
	UpcomingReleaseKind,
	UpcomingReleaseView,
} from './upcoming.model';

const MONTH_FORMAT = new Intl.DateTimeFormat('en-GB', {
	month: 'long',
	year: 'numeric',
});
const WEEKDAY_FORMAT = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });
const MILLISECONDS_A_DAY = 24 * 60 * 60 * 1000;

/** A stored `YYYY-MM-DD` as a date, read as noon UTC so no zone shifts it. */
const toDate = (day: string): Date => new Date(`${day}T12:00:00Z`);

/**
 * Whether the record has ever been out. MusicBrainz sets an album's first
 * release date from its earliest pressing, so on a record that has never
 * been released it *is* the day we are waiting for.
 */
export function toKind(release: UpcomingReleaseEntity): UpcomingReleaseKind {
	const first = release.firstReleaseDate;

	return first && first < release.releaseDate ? 'reissue' : 'new';
}

/** `Album`, `EP · Live` — the primary type with what qualifies it. */
export function toTypeLabel(release: UpcomingReleaseEntity): string {
	return [release.primaryType, ...release.secondaryTypes]
		.filter((type): type is string => !!type)
		.join(' · ');
}

/** Whether a vinyl pressing is among the formats — what the filter runs on. */
export const hasVinyl = (formats: string[]): boolean =>
	formats.some((format) => /vinyl|lp/i.test(format));

export function toUpcomingRelease(
	release: UpcomingReleaseEntity
): UpcomingReleaseView {
	const kind = toKind(release);

	return {
		artistImageUrl: release.artistImageUrl,
		artistName: release.artistName,
		artistUid: release.artistUid,
		countries: release.countries.join(' · '),
		coverUrl: coverArtUrl(release.releaseGroupId),
		formats: release.formats,
		kind,
		labels: release.labels.join(' · '),
		namesake: release.matchedBy === 'name',
		onVinyl: hasVinyl(release.formats),
		originalYear:
			kind === 'reissue'
				? (release.firstReleaseDate?.slice(0, 4) ?? null)
				: null,
		releaseDate: release.releaseDate,
		sourceUrl: `${MUSICBRAINZ_RELEASE_GROUP_URL}/${release.releaseGroupId}`,
		title: release.title,
		typeLabel: toTypeLabel(release),
		uid: release.uid,
	};
}

/** How far off the day is, in the words the page uses for it. */
export function toCountdown(day: string, from: string): string {
	const days = Math.round(
		(toDate(day).getTime() - toDate(from).getTime()) / MILLISECONDS_A_DAY
	);

	if (days <= 0) return 'Today';
	if (days === 1) return 'Tomorrow';
	if (days < 7) return `in ${days} days`;
	if (days < 14) return 'next week';

	return `in ${Math.round(days / 7)} weeks`;
}

/**
 * The timeline: months, and within them the days that have something on
 * them. Days with nothing coming are left out — an empty row says nothing a
 * collector needs, and a month of them would bury the ones that matter.
 *
 * The releases are expected in date order, as the effect hands them over.
 */
export function toMonths(
	releases: UpcomingReleaseEntity[],
	today: string
): UpcomingMonthView[] {
	const days = new Map<string, UpcomingDayView>();

	for (const release of releases) {
		const key = release.releaseDate;
		const day = days.get(key);

		if (day) {
			day.releases.push(toUpcomingRelease(release));

			continue;
		}

		const date = toDate(key);

		days.set(key, {
			countdown: toCountdown(key, today),
			day: `${date.getUTCDate()}`,
			key,
			releases: [toUpcomingRelease(release)],
			weekday: WEEKDAY_FORMAT.format(date),
		});
	}

	const months = new Map<string, UpcomingMonthView>();

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
