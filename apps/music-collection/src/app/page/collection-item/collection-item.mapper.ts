import {
	COLLECTION_ITEM_GRADE_LABELS,
	CollectionItemEntity,
	CollectionItemGrade,
	CollectionItemPhoto,
	ReleaseEntity,
	TrackEntity,
} from '@music-collection/api';

import { formatCountry, toDescriptions } from '@music-collection/common/engine';

import {
	MediaFormat,
	RemovedCopyView,
	toMediaFormat,
	toReleaseView,
} from '../../shared/music-ui';

/**
 * Presentation models of the copy page.
 *
 * The page reads down the hierarchy the records are actually kept in: the
 * album is the work, the release is the pressing that work came out on, and
 * the copy is the one on the shelf. Each layer adds what the one above it
 * cannot know — the album does not know which label pressed this one, and
 * the pressing does not know what was paid for it at a fair in 2019.
 */

/** A picture of the copy, as the card shows it. */
export interface CopyPhotoView {
	/**
	 * Where the picture can be shown from; null until Storage has answered
	 * for it, and for a file that is no longer there. The card keeps the
	 * place either way, so the front stays the front while it loads.
	 */
	url: string | null;
	width: number;
	height: number;
	/** "Front" or "Back" — what the card is showing. */
	side: string;
}

/** The pressing this copy is of: what the release adds to the album. */
export interface CopyPressingView {
	id: string | null;
	name: string;
	format: MediaFormat;
	/** e.g. "LP, Album, Reissue, 180g". */
	formatDescription: string | null;
	labelName: string | null;
	country: string | null;
	/** Only the format is known: the album, not a pressing of it. */
	generic: boolean;
	/** Link out to the pressing on Discogs, when it was imported from there. */
	discogsUrl: string | null;
}

/**
 * A release of the album as the copy page offers it: one line the collector
 * can tell their own pressing by, and what stands in the way of moving the
 * copy onto it.
 */
export interface CopyPressingOption {
	id: string;
	/** The pressing's own name, or the album's where it carries none. */
	name: string;
	format: MediaFormat;
	/** e.g. "LP, Album, Reissue, 180g". */
	formatDescription: string | null;
	labelName: string | null;
	country: string | null;
	year: number | null;
	/** The album on a medium, not a pressing of it. */
	generic: boolean;
	/** The release this copy is filed under right now. */
	current: boolean;
	/** Another copy of this collector's already stands under this release. */
	taken: boolean;
}

/** The year a release came out, as far as its date says. */
function releaseYear(release: ReleaseEntity): number | null {
	const date = release.date ? new Date(release.date) : null;

	return date && !Number.isNaN(date.getTime()) ? date.getFullYear() : null;
}

/**
 * The releases of one album, as the copy page lists them to be picked from.
 *
 * Archived pressings are left out unless this very copy stands on one: a
 * release an admin took off the catalog is not one to move a record onto,
 * but a record already there must still be able to name where it stands.
 *
 * The one the copy is filed under comes first — the question the list answers
 * is "which one is mine", and that is read before anything is changed — and
 * the rest follow by year, newest last, the way a discography reads.
 */
export function toPressingOptions(
	releases: ReleaseEntity[],
	albumId: string,
	currentReleaseId: string | null,
	ownedReleaseIds: Set<string>
): CopyPressingOption[] {
	return releases
		.filter(
			(release) =>
				release.album?.uid === albumId &&
				(release.active !== false || release.uid === currentReleaseId)
		)
		.map((release): CopyPressingOption => {
			const descriptions = toDescriptions(release.formatDescription);
			const current = release.uid === currentReleaseId;

			return {
				id: release.uid,
				name: release.name || release.album?.name || '',
				format: toMediaFormat(release.media),
				formatDescription: descriptions.length
					? descriptions.join(', ')
					: null,
				labelName: release.label?.name || null,
				country: formatCountry(release.country),
				year: releaseYear(release),
				generic: !!release.generic,
				current,
				taken: !current && ownedReleaseIds.has(release.uid),
			};
		})
		.sort(
			(a, b) =>
				Number(b.current) - Number(a.current) ||
				Number(a.generic) - Number(b.generic) ||
				(a.year ?? Infinity) - (b.year ?? Infinity) ||
				a.format.localeCompare(b.format)
		);
}

/** How the copy was come by, ready to read. */
export interface CopyProvenanceView {
	/** "12 March 2019", or null when only the place is known. */
	date: string | null;
	place: string | null;
	/** "4 500 HUF", already formatted. */
	price: string | null;
	/** Nothing at all is told about the purchase. */
	empty: boolean;
}

/** The grades, spelled out. */
export interface CopyConditionView {
	media: string | null;
	sleeve: string | null;
	empty: boolean;
}

/** A track, and whether this pressing is the reason it is in the list. */
export interface CopyTrackView {
	id: string;
	position: string | null;
	name: string;
	duration: string | null;
	/** Only on this pressing — a bonus cut, a side the reissue added. */
	exclusive: boolean;
}

const GRADE_LABEL = (grade: CollectionItemGrade | null): string | null =>
	grade ? `${grade} — ${COLLECTION_ITEM_GRADE_LABELS[grade]}` : null;

/**
 * The pictures the copy points at, with the URLs Storage has given back for
 * them so far. The document names the file; only Storage can say where it is
 * to be read from, and it says so to its owner alone.
 */
export function toCopyPhotos(
	photos: CollectionItemPhoto[] | null | undefined,
	urls: Record<string, string>
): CopyPhotoView[] {
	return (photos ?? []).map((photo, index) => ({
		url: urls[photo.path] ?? null,
		width: photo.width,
		height: photo.height,
		side: index === 0 ? 'Front' : 'Back',
	}));
}

export function toCopyPressing(item: CollectionItemEntity): CopyPressingView {
	const release = item.release;
	const descriptions = toDescriptions(release?.formatDescription);

	return {
		id: release?.uid ?? null,
		name: release?.name || '',
		format: toMediaFormat(release?.media),
		formatDescription: descriptions.length ? descriptions.join(', ') : null,
		labelName: release?.label?.name || null,
		country: formatCountry(release?.country),
		generic: !!release?.generic,
		discogsUrl: release?.discogsReleaseId
			? `https://www.discogs.com/release/${release.discogsReleaseId}`
			: null,
	};
}

/**
 * The copy as the removal dialog names it, so that a collector who owns two
 * pressings of the same album can see which one they are letting go of.
 *
 * The five fields are read out of the record's own view rather than worked
 * out again here: the shelf and the album page hand the dialog exactly that
 * view, and a pressing must not weigh 180g on two pages and nothing on the
 * third.
 */
export function toRemovedCopy(item: CollectionItemEntity): RemovedCopyView {
	const { format, weight, generic, labelName, country } = toReleaseView(item);

	return { format, weight, generic, labelName, country };
}

export function toCopyProvenance(
	item: CollectionItemEntity
): CopyProvenanceView {
	const purchase = item.purchase ?? null;
	const date = purchase?.date ? formatDate(purchase.date) : null;
	const place = purchase?.place || null;
	const price =
		purchase?.price != null
			? formatPrice(purchase.price, purchase.currency)
			: null;

	return { date, place, price, empty: !date && !place && !price };
}

export function toCopyCondition(item: CollectionItemEntity): CopyConditionView {
	const media = GRADE_LABEL(item.condition?.media ?? null);
	const sleeve = GRADE_LABEL(item.condition?.sleeve ?? null);

	return { media, sleeve, empty: !media && !sleeve };
}

/**
 * The copy's number, spelled the way it reads on the record — "No. 123 of
 * 500", or "No. 123" alone where the edition size was never printed on it.
 */
export function toCopySerial(item: CollectionItemEntity): string | null {
	const serial = item.serial ?? null;

	if (!serial) {
		return null;
	}

	return serial.total != null
		? `No. ${serial.number} of ${serial.total}`
		: `No. ${serial.number}`;
}

/**
 * The tracklist of this copy: the album's tracks, and the ones only this
 * pressing has, marked so the difference is visible rather than implied.
 */
export function toCopyTracks(
	tracks: TrackEntity[],
	releaseUid: string | null
): CopyTrackView[] {
	return tracks.map((track) => ({
		id: track.uid,
		position: track.position,
		name: track.name,
		duration: track.duration,
		exclusive: !!releaseUid && track.releaseUid === releaseUid,
	}));
}

function formatDate(epochMs: number): string {
	return new Date(epochMs).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

/**
 * The price as it was paid. The currency is shown as the code rather than a
 * symbol: a collection crosses borders, and "4 500 HUF" cannot be mistaken
 * for anything else the way a bare number could.
 */
function formatPrice(price: number, currency: string | null): string {
	const amount = new Intl.NumberFormat(undefined, {
		maximumFractionDigits: 2,
	}).format(price);

	return currency ? `${amount} ${currency}` : amount;
}
