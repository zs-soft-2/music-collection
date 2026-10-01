import { WishlistItemEntity } from '@music-collection/api';
import { MediaEnum } from '@music-collection/common/api';
import { MusicCollectionStanding } from '@music-collection/domain/music-collection/core';
import { ageWeight } from '@music-collection/domain/music-collection/engine';
import { MediaFormat, ReleaseView } from '@music-collection/ui/music-view';

import { PublicUserLocation } from '../user-location';
import { UserSetting } from '../user-settings';

/**
 * The collector's own page, as a stranger gets it.
 *
 * One document, put together when the collector writes, so that a visit
 * costs a single read rather than a query over somebody's shelf. Everything
 * a visitor sees is denormalized into it on purpose: a visitor has no
 * catalog in their cache — and if they have one, it may be narrowed to two
 * genres — so a document that only named album ids would draw a page full of
 * holes.
 *
 * What is NOT here matters as much. No price, no estimated worth, no shelf
 * place, no serial number, no copy photographs: the photographs live behind
 * closed Storage rules anyway, so the shop window shows catalog covers. The
 * points are the only measure that goes out.
 *
 * The numbers are the collector's own word. They are computed on their
 * machine, because resolving collections needs the catalog that is already
 * cached there — so this document can never feed a leaderboard or a reward.
 * An official ranking would have to be computed on the server, from the
 * shelf itself.
 */

/** How many records the shop window holds. Mirrored in `firestore.rules`. */
export const SHOWCASE_LIMIT = 24;
/** How many badges travel with the profile. Mirrored in `firestore.rules`. */
export const BADGE_LIMIT = 50;
/** How many collections are shown as the ones closest to finishing. */
export const PURSUIT_LIMIT = 3;
/** How many wishes a visitor is shown. Mirrored in `firestore.rules`. */
export const WISHLIST_LIMIT = 200;
/** A shop link is a link, not an essay. */
export const SOURCE_LINK_MAX_LENGTH = 500;

/**
 * What the collector chose. Two consents, not one: a shelf worth showing is
 * not the same as a list of what one is still missing, and the family that
 * reads the second is not the stranger who found the first.
 */
export interface CollectorProfileSettings {
	/** Whether the public page exists at all. */
	shared: boolean;
	/** Whether the wishlist goes on it. */
	shareWishlist: boolean;
}

export const NO_COLLECTOR_PROFILE: CollectorProfileSettings = {
	shared: false,
	shareWishlist: false,
};

export const COLLECTOR_PROFILE_SETTING: UserSetting<CollectorProfileSettings> =
	{
		id: 'collector-profile',
		featureKey: 'collector-profile-setting',
		storageKey: 'mc-collector-profile',
		toValue: (data) => ({
			shared: data['shared'] === true,
			shareWishlist: data['shareWishlist'] === true,
		}),
		toDocument: ({ shared, shareWishlist }) => ({ shared, shareWishlist }),
	};

/** Who the page is about, as the user document holds it. */
export interface CollectorProfileOwner {
	uid: string;
	displayName?: string | null;
	photoURL?: string | null;
}

/** One record from the shelf, as the shop window shows it. */
export interface CollectorShowcaseRecord {
	title: string;
	artistName: string;
	year: number | null;
	format: MediaFormat;
	coverUrl: string | null;
	/** Limited edition, picture disc, box set — what makes this copy special. */
	editions: string[];
}

/** A badge earned by owning every album of a collection. */
export interface CollectorBadge {
	slug: string;
	name: string;
	imageUrl: string | null;
	points: number;
}

/** A collection being worked on, and how far it has got. */
export interface CollectorPursuit {
	slug: string;
	name: string;
	owned: number;
	total: number;
}

/** A record still wanted — the list a family buys a present from. */
export interface CollectorWish {
	title: string;
	artistName: string;
	coverUrl: string | null;
	/** The formats that would do; empty means any pressing is welcome. */
	medias: MediaEnum[];
	/** Where it is for sale, when the collector noted one. */
	sourceLink?: string;
}

/** The shelf in numbers. */
export interface CollectorNumbers {
	copies: number;
	albums: number;
	artists: number;
	/** Only the formats actually on the shelf, so the document stays small. */
	byFormat: Partial<Record<MediaFormat, number>>;
	oldestYear: number | null;
	/**
	 * The year the first copy was filed here — which is when the collecting
	 * arrived in this app, not when it began.
	 */
	since: number | null;
}

/** The only measure that goes out: points, and what earned them. */
export interface CollectorPoints {
	total: number;
	completedCollections: number;
}

export interface PublicCollectorProfile {
	uid: string;
	displayName?: string;
	photoURL?: string;
	/** From the location consent — never more than that level let out. */
	countryCode?: string;
	city?: string;
	numbers: CollectorNumbers;
	points: CollectorPoints;
	badges: CollectorBadge[];
	pursuits: CollectorPursuit[];
	showcase: CollectorShowcaseRecord[];
	/** Present only while the collector shares it. */
	wishlist?: CollectorWish[];
}

/** The document as it comes back: what was written, plus the sync stamp. */
export type CollectorProfileDocument = PublicCollectorProfile & {
	/** Epoch milliseconds; written by `FirestoreSyncService` on every save. */
	updatedAt?: number;
};

/**
 * The whole shelf, in a document of its own.
 *
 * The page carries a window of two dozen records, because a visit should cost
 * one read and a few kilobytes. A collector-to-collector visit often wants
 * the rest of it — "what else has he got?" — and that is this list: a second
 * read, made only when somebody asks for it, and without covers, so a
 * thousand records are a couple of hundred kilobytes rather than a megabyte.
 */
export const ALBUM_LIST_LIMIT = 3000;

/** One record as the full list names it: no cover, no copy, just the record. */
export interface CollectorAlbumEntry {
	title: string;
	artistName: string;
	year: number | null;
	format: MediaFormat;
}

export interface PublicCollectorAlbums {
	uid: string;
	/** Everything on the shelf — even where the list below had to stop. */
	count: number;
	albums: CollectorAlbumEntry[];
}

export type CollectorAlbumsDocument = PublicCollectorAlbums & {
	updatedAt?: number;
};

/** Everything the snapshot is made of, all of it already on the client. */
export interface CollectorProfileSource {
	settings: CollectorProfileSettings;
	owner: CollectorProfileOwner;
	/** The copies owned; the ones gone from the collection are not here. */
	releases: readonly ReleaseView[];
	standings: readonly MusicCollectionStanding[];
	wishes: readonly WishlistItemEntity[];
	/** What the location consent already publishes, or null. */
	location: PublicUserLocation | null;
	/** Epoch milliseconds, so the age of a record does not depend on the clock. */
	now: number;
}

function toNumbers(releases: readonly ReleaseView[]): CollectorNumbers {
	const albums = new Set<string>();
	const artists = new Set<string>();
	const byFormat: Partial<Record<MediaFormat, number>> = {};
	let oldestYear: number | null = null;
	let since: number | null = null;

	for (const release of releases) {
		if (release.albumId) {
			albums.add(release.albumId);
		}

		if (release.artistId) {
			artists.add(release.artistId);
		}

		byFormat[release.format] = (byFormat[release.format] ?? 0) + 1;

		if (
			release.year !== null &&
			(oldestYear === null || release.year < oldestYear)
		) {
			oldestYear = release.year;
		}

		if (release.addedAt && (since === null || release.addedAt < since)) {
			since = release.addedAt;
		}
	}

	return {
		copies: releases.length,
		albums: albums.size,
		artists: artists.size,
		byFormat,
		oldestYear,
		since: since === null ? null : new Date(since).getFullYear(),
	};
}

/**
 * How much a copy earns its place in the window: what the pressing is, and
 * how long it has been around. The same two things the scoring weighs — the
 * age from the engine, so the window and the points cannot disagree about
 * what counts as old.
 */
function showcaseWeight(release: ReleaseView, now: number): number {
	return (
		release.editions.length * 2 +
		(release.weight === 180 ? 1 : 0) +
		ageWeight(release.year, now) * 2
	);
}

function toShowcase(
	releases: readonly ReleaseView[],
	now: number
): CollectorShowcaseRecord[] {
	return [...releases]
		.sort(
			(one, other) =>
				showcaseWeight(other, now) - showcaseWeight(one, now) ||
				(one.year ?? Number.MAX_SAFE_INTEGER) -
					(other.year ?? Number.MAX_SAFE_INTEGER) ||
				one.title.localeCompare(other.title)
		)
		.slice(0, SHOWCASE_LIMIT)
		.map((release) => ({
			title: release.title,
			artistName: release.artistName,
			year: release.year,
			format: release.format,
			coverUrl: release.coverUrl,
			editions: release.editions,
		}));
}

function toPoints(
	standings: readonly MusicCollectionStanding[]
): CollectorPoints {
	let total = 0;
	let completedCollections = 0;

	for (const { progress, score } of standings) {
		total += score.earnedPoints;

		if (progress.completed) {
			completedCollections += 1;
		}
	}

	return { total, completedCollections };
}

/** The badges earned, the most valuable first. */
function toBadges(
	standings: readonly MusicCollectionStanding[]
): CollectorBadge[] {
	return standings
		.filter(({ progress }) => progress.completed)
		.sort((one, other) => other.score.earnedPoints - one.score.earnedPoints)
		.slice(0, BADGE_LIMIT)
		.map(({ collection, score }) => ({
			slug: collection.slug,
			name: collection.badge?.name || collection.name,
			// The cast pin where there is one, the typed-in artwork until then.
			imageUrl:
				collection.badge?.image?.filePath ??
				collection.badge?.artworkUrl ??
				null,
			points: score.earnedPoints,
		}));
}

/**
 * What is being worked on: started, not finished, nearest first. A
 * collection without a single record is not a pursuit, it is a list the
 * collector has not met yet.
 */
function toPursuits(
	standings: readonly MusicCollectionStanding[]
): CollectorPursuit[] {
	return standings
		.filter(
			({ progress }) =>
				!progress.completed && progress.owned > 0 && progress.total > 0
		)
		.sort(
			(one, other) =>
				other.progress.percentage - one.progress.percentage ||
				one.collection.name.localeCompare(other.collection.name)
		)
		.slice(0, PURSUIT_LIMIT)
		.map(({ collection, progress }) => ({
			slug: collection.slug,
			name: collection.name,
			owned: progress.owned,
			total: progress.total,
		}));
}

/**
 * A shop link only where it is a web address this page may offer a stranger.
 * The rules cannot look inside a list — Firestore has no iteration — so a
 * link that leaves here unchecked is one the page would hand to a visitor on
 * our own domain.
 */
function toSourceLink(link: string | undefined): string | undefined {
	const trimmed = link?.trim();

	return trimmed &&
		trimmed.startsWith('https://') &&
		trimmed.length <= SOURCE_LINK_MAX_LENGTH
		? trimmed
		: undefined;
}

function toWishlist(wishes: readonly WishlistItemEntity[]): CollectorWish[] {
	return wishes.slice(0, WISHLIST_LIMIT).map((wish) => {
		const sourceLink = toSourceLink(wish.sourceLink);
		const wanted: CollectorWish = {
			title: wish.albumReference?.name ?? '',
			artistName: wish.artistReference?.name ?? '',
			coverUrl: wish.albumReference?.coverImage?.filePath ?? null,
			// `all` is not a format but the absence of a preference, and an
			// empty list says the same thing without the visitor having to
			// know our enum.
			medias: (wish.medias ?? []).filter(
				(media) => media !== MediaEnum.all
			),
		};

		if (sourceLink) {
			wanted.sourceLink = sourceLink;
		}

		return wanted;
	});
}

/**
 * The entry in the directory: one collector, small enough that a page may
 * hold everybody's.
 *
 * The page document is ten to twenty kilobytes — a window of covers, a
 * wishlist — and a wall of those would be half a megabyte to draw a grid of
 * faces. This is the same collector in a few hundred bytes: who they are,
 * what the shelf adds up to, and the collections they have finished, which is
 * what the wall is actually about.
 */
export interface PublicCollectorCard {
	uid: string;
	displayName?: string;
	photoURL?: string;
	countryCode?: string;
	city?: string;
	/** What the shelf holds, for sorting by size. */
	copies: number;
	points: number;
	/** The collections finished, the most valuable first. */
	badges: CollectorBadge[];
}

export type CollectorCardDocument = PublicCollectorCard & {
	updatedAt?: number;
};

/**
 * The directory entry, or null when nothing is shared.
 *
 * Built from the same source as the page, so the two cannot disagree: a card
 * showing a badge the page does not is a card nobody can trust.
 */
export function toPublicCollectorCard(
	source: CollectorProfileSource
): PublicCollectorCard | null {
	const { settings, owner, releases, standings, location } = source;

	if (!settings.shared || !owner.uid) {
		return null;
	}

	const card: PublicCollectorCard = {
		uid: owner.uid,
		copies: releases.length,
		points: toPoints(standings).total,
		badges: toBadges(standings),
	};

	if (owner.displayName) {
		card.displayName = owner.displayName;
	}

	if (owner.photoURL) {
		card.photoURL = owner.photoURL;
	}

	if (location?.countryCode) {
		card.countryCode = location.countryCode;
	}

	if (location?.city) {
		card.city = location.city;
	}

	return card;
}

/**
 * The whole shelf, by artist and then by year — the order a collector would
 * read a shelf in, and the one the collection page opens with.
 *
 * Null whenever the profile is not shared: the list is part of the page, not
 * a thing of its own, so it comes and goes with it.
 */
export function toPublicCollectorAlbums(
	source: CollectorProfileSource
): PublicCollectorAlbums | null {
	const { settings, owner, releases } = source;

	if (!settings.shared || !owner.uid) {
		return null;
	}

	const albums = [...releases]
		.sort(
			(one, other) =>
				one.artistName.localeCompare(other.artistName) ||
				(one.year ?? Number.MAX_SAFE_INTEGER) -
					(other.year ?? Number.MAX_SAFE_INTEGER) ||
				one.title.localeCompare(other.title)
		)
		.slice(0, ALBUM_LIST_LIMIT)
		.map((release) => ({
			title: release.title,
			artistName: release.artistName,
			year: release.year,
			format: release.format,
		}));

	return { uid: owner.uid, count: releases.length, albums };
}

/**
 * The document the others may read, or null when there is nothing to share.
 *
 * This is where both consents are enforced. A profile that is not shared
 * produces nothing at all — the page is the document, so withdrawing it is
 * deleting it — and a wishlist that is not shared never leaves this
 * function, so a later change of mind about what the page draws cannot
 * expose it either. The place comes from the location consent and is never
 * widened here: whatever that level already published is all this may carry.
 */
export function toPublicCollectorProfile(
	source: CollectorProfileSource
): PublicCollectorProfile | null {
	const { settings, owner, releases, standings, wishes, location, now } =
		source;

	if (!settings.shared || !owner.uid) {
		return null;
	}

	const profile: PublicCollectorProfile = {
		uid: owner.uid,
		numbers: toNumbers(releases),
		points: toPoints(standings),
		badges: toBadges(standings),
		pursuits: toPursuits(standings),
		showcase: toShowcase(releases, now),
	};

	if (owner.displayName) {
		profile.displayName = owner.displayName;
	}

	if (owner.photoURL) {
		profile.photoURL = owner.photoURL;
	}

	if (location?.countryCode) {
		profile.countryCode = location.countryCode;
	}

	if (location?.city) {
		profile.city = location.city;
	}

	if (settings.shareWishlist) {
		profile.wishlist = toWishlist(wishes);
	}

	return profile;
}

/**
 * A short fingerprint of what would be published.
 *
 * The snapshot is rebuilt whenever the shelf changes, and most of those
 * changes leave the page identical — a copy graded, a shelf place moved, a
 * record filed that did not make the window. Writing anyway would cost a
 * write per keystroke somewhere else in the app, so the fingerprint is what
 * decides, and the document is only written when the page would actually
 * read differently.
 *
 * The hash is FNV-1a over the JSON, with the length appended: the order of
 * the fields comes from how this module builds them, so it is stable, and two
 * different pages would have to agree on both the hash and the length to be
 * mistaken for one another.
 */
export function collectorProfileFingerprint(
	profile: PublicCollectorProfile
): string {
	const json = JSON.stringify(profile);
	let hash = 2166136261;

	for (let index = 0; index < json.length; index += 1) {
		hash ^= json.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return `${(hash >>> 0).toString(36)}:${json.length}`;
}
