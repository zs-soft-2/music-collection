import { MediaEnum, MediaList } from '@music-collection/common/api';
import { FORMAT_ORDER, MediaFormat } from '@music-collection/ui/music-view';

import {
	CollectorAlbumsDocument,
	CollectorProfileDocument,
} from '../../data/collector-profile';
import { countryName } from '../../data/user-location';
import {
	CollectorAlbumsView,
	CollectorBadgeView,
	CollectorFormatView,
	CollectorNumbersView,
	CollectorPursuitView,
	CollectorRecordView,
	CollectorView,
	CollectorWishView,
	EDITION_MAX,
	EDITIONS_MAX,
	NAME_MAX,
	TITLE_MAX,
} from './collector.model';

/**
 * From the published document onto what this page renders.
 *
 * This is the border post of the feature. The document was written by the
 * collector's own browser, and the security rules can only hold its shape:
 * Firestore rules have no iteration, so the numbers and the list lengths are
 * checked up there while the contents of the lists are not. Everything that
 * comes out of a list therefore arrives here unvetted, and leaves here as one
 * of three things — a clipped string, a picture this page may load, or
 * nothing.
 *
 * Pictures and links are held to `https://`. A `javascript:` or `data:` URL in
 * an `<img src>` or an `<a href>` would be this page handing a visitor
 * something a stranger wrote, under our own domain; the hosting CSP would
 * catch much of that, but a page that relies on a header to be safe is a page
 * that is not.
 */

/** The last character code a line of text has no business carrying. */
const LAST_CONTROL_CODE = 0x1f;
const DELETE_CODE = 0x7f;

/** As much of a text as the page has room for, and nothing that breaks a line. */
function clip(value: unknown, max: number): string {
	if (typeof value !== 'string') {
		return '';
	}

	let plain = '';

	for (const character of value.slice(0, max * 2)) {
		const code = character.codePointAt(0) ?? 0;

		plain +=
			code <= LAST_CONTROL_CODE || code === DELETE_CODE ? ' ' : character;
	}

	return plain.trim().slice(0, max);
}

/** A picture this page may load, or nothing. */
function picture(value: unknown): string | null {
	return typeof value === 'string' && value.startsWith('https://')
		? value
		: null;
}

/** A whole number at least zero, or null where the document said otherwise. */
function count(value: unknown): number | null {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0
		? value
		: null;
}

function year(value: unknown): number | null {
	return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

/** One of ours, or the catch-all — never whatever string arrived. */
function format(value: unknown): MediaFormat {
	return FORMAT_ORDER.includes(value as MediaFormat)
		? (value as MediaFormat)
		: 'other';
}

function list(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

/** The shop link, with the host it leads to — or neither. */
function shopLink(value: unknown): {
	sourceLink: string | null;
	sourceHost: string | null;
} {
	const link = picture(value);

	if (!link) {
		return { sourceLink: null, sourceHost: null };
	}

	try {
		return { sourceLink: link, sourceHost: new URL(link).host };
	} catch {
		return { sourceLink: null, sourceHost: null };
	}
}

function toFormats(byFormat: unknown): CollectorFormatView[] {
	const counts = (byFormat ?? {}) as Record<string, unknown>;

	return FORMAT_ORDER.map((format) => ({
		format,
		count: count(counts[format]) ?? 0,
	})).filter((entry) => entry.count > 0);
}

function toNumbers(document: CollectorProfileDocument): CollectorNumbersView {
	const numbers = document.numbers ?? ({} as CollectorNumbersView);

	return {
		copies: count(numbers.copies) ?? 0,
		albums: count(numbers.albums) ?? 0,
		artists: count(numbers.artists) ?? 0,
		oldestYear: year(numbers.oldestYear),
		since: year(numbers.since),
		formats: toFormats(numbers.byFormat),
	};
}

function toBadges(document: CollectorProfileDocument): CollectorBadgeView[] {
	return list(document.badges).map((entry) => {
		const badge = entry as Record<string, unknown>;

		return {
			name: clip(badge['name'], NAME_MAX),
			imageUrl: picture(badge['imageUrl']),
			points: count(badge['points']) ?? 0,
		};
	});
}

function toPursuits(
	document: CollectorProfileDocument
): CollectorPursuitView[] {
	return list(document.pursuits)
		.map((entry) => {
			const pursuit = entry as Record<string, unknown>;
			const total = count(pursuit['total']) ?? 0;
			const owned = Math.min(count(pursuit['owned']) ?? 0, total);

			return {
				name: clip(pursuit['name'], NAME_MAX),
				owned,
				total,
				percentage: total ? Math.round((owned / total) * 100) : 0,
			};
		})
		.filter((pursuit) => pursuit.total > 0);
}

function toShowcase(document: CollectorProfileDocument): CollectorRecordView[] {
	return list(document.showcase).map((entry) => {
		const record = entry as Record<string, unknown>;

		return {
			title: clip(record['title'], TITLE_MAX),
			artistName: clip(record['artistName'], NAME_MAX),
			year: year(record['year']),
			format: format(record['format']),
			coverUrl: picture(record['coverUrl']),
			editions: list(record['editions'])
				.slice(0, EDITIONS_MAX)
				.map((edition) => clip(edition, EDITION_MAX))
				.filter(Boolean),
		};
	});
}

function toWishlist(document: CollectorProfileDocument): CollectorWishView[] {
	return list(document.wishlist).map((entry) => {
		const wish = entry as Record<string, unknown>;

		return {
			title: clip(wish['title'], TITLE_MAX),
			artistName: clip(wish['artistName'], NAME_MAX),
			coverUrl: picture(wish['coverUrl']),
			// A format the app does not know is nothing a shop could be asked
			// for either.
			medias: list(wish['medias']).filter((media): media is MediaEnum =>
				MediaList.includes(media as MediaEnum)
			),
			...shopLink(wish['sourceLink']),
		};
	});
}

/** The place, as much of it as was shared. */
function toPlace(document: CollectorProfileDocument): string | null {
	const code = clip(document.countryCode, 2);
	const city = clip(document.city, 60);

	if (!code) {
		return city || null;
	}

	return city ? `${city}, ${countryName(code)}` : countryName(code);
}

export function toCollectorView(
	document: CollectorProfileDocument | null
): CollectorView | null {
	if (!document) {
		return null;
	}

	const displayName = clip(document.displayName, NAME_MAX) || null;

	return {
		hero: {
			displayName,
			photoURL: picture(document.photoURL),
			initial: (displayName ?? '?').charAt(0).toUpperCase(),
			place: toPlace(document),
			updatedAt: count(document.updatedAt),
		},
		numbers: toNumbers(document),
		points: {
			total: count(document.points?.total) ?? 0,
			completedCollections:
				count(document.points?.completedCollections) ?? 0,
		},
		badges: toBadges(document),
		pursuits: toPursuits(document),
		showcase: toShowcase(document),
		wishlist: toWishlist(document),
	};
}

/**
 * The full shelf, as unvetted as everything else that travelled inside a
 * document: same border post, same three outcomes.
 */
export function toCollectorAlbums(
	document: CollectorAlbumsDocument | null
): CollectorAlbumsView {
	if (!document) {
		return { count: 0, albums: [] };
	}

	const albums = list(document.albums).map((entry) => {
		const album = entry as Record<string, unknown>;

		return {
			title: clip(album['title'], TITLE_MAX),
			artistName: clip(album['artistName'], NAME_MAX),
			year: year(album['year']),
			format: format(album['format']),
		};
	});

	// The count is what the shelf holds; the list may have stopped short of
	// it, and saying so is more honest than counting the rows drawn.
	return { count: count(document.count) ?? albums.length, albums };
}
