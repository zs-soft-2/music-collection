import {
	COLLECTION_ITEM_GRADE_LABELS,
	CollectionItemEntity,
	CollectionItemGrade,
	CollectionItemPhoto,
	TrackEntity,
} from '@music-collection/api';

import { formatCountry, toDescriptions } from '@music-collection/common/engine';

import { MediaFormat, toMediaFormat } from '../../shared/music-ui';

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
	url: string;
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
	/** Link out to the pressing on Discogs, when it was imported from there. */
	discogsUrl: string | null;
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

export function toCopyPhotos(
	photos: CollectionItemPhoto[] | null | undefined
): CopyPhotoView[] {
	return (photos ?? []).map((photo, index) => ({
		url: photo.url,
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
		discogsUrl: release?.discogsReleaseId
			? `https://www.discogs.com/release/${release.discogsReleaseId}`
			: null,
	};
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
