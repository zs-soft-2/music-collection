import {
	AlbumEntity,
	CollectionItemDisposalReason,
	CollectionItemEntity,
	ContributionEntity,
	DiscogsVersion,
	ReleaseEntity,
	ReleaseRequest,
	ReleaseRequestPressing,
	TrackEntity,
	discogsReleaseUrl,
	isSpotifyAlbumId,
	isYoutubePlaylistId,
	isYoutubeVideoId,
} from '@music-collection/api';

import {
	AlbumView,
	CREDIT_CATEGORY_LABELS,
	CreditCategory,
	EDITION_TAGS,
	EditionTag,
	MediaFormat,
	ReleaseView,
	creditCategory,
	formatCountry,
	performerOrder,
	formatGenre,
	toAlbumView,
	toDescriptions,
	toMediaFormat,
	toReleaseView,
	toYear,
} from '../../shared/music-ui';

export interface OriginalReleaseView {
	released: string | null;
	country: string | null;
	/** e.g. "Megaforce Worldwide (81741-1), Atlantic (7 81741-1)". */
	labels: string | null;
	formats: string | null;
	discogsUrl: string;
}

export interface AlbumProfileView extends AlbumView {
	artistId: string;
	genre: string | null;
	original: OriginalReleaseView | null;
	spotifyAlbumId: string | null;
	youtubePlaylistId: string | null;
	youtubeVideoIds: string[];
}

/** A catalog release (pressing) of the album, offered to be collected. */
export interface ReleaseOptionView {
	id: string;
	format: MediaFormat;
	/** Pressing weight in grams (180g vinyl). */
	weight: number | null;
	labelName: string | null;
	country: string | null;
	year: number | null;
	editions: EditionTag[];
	/** The collector already has a copy of this release. */
	owned: boolean;
}

/** A Discogs pressing of the album, to request when not in the catalog. */
export interface DiscogsVersionView {
	id: number;
	format: MediaFormat;
	/** Discogs format text, e.g. "Vinyl, LP, Album, Reissue". */
	formatText: string | null;
	label: string | null;
	catno: string | null;
	country: string | null;
	year: number | null;
	discogsUrl: string;
	/** The collector has a pending request for it. */
	requested: boolean;
}

/** A release request of the collector for the album. */
export interface PendingRequestView {
	id: string;
	/** e.g. "Vinyl, LP · Megaforce (81741-1) · US · 1987". */
	summary: string;
	note: string | null;
	discogsUrl: string | null;
	/** The admin's reason, when rejected. */
	adminNote: string | null;
}

/** What the collector asks the admin to add to the catalog. */
export interface ReleaseRequestDraft {
	discogsReleaseId: number | null;
	pressing: ReleaseRequestPressing | null;
	note: string | null;
}

export const DISPOSAL_REASON_LABELS: Record<
	CollectionItemDisposalReason,
	string
> = {
	sold: 'Sold',
	traded: 'Traded',
	gifted: 'Given away',
	lost: 'Lost',
	other: 'Other',
};

/** What the collector tells about a copy leaving the collection. */
export interface DisposalDraft {
	reason: CollectionItemDisposalReason;
	/** When it left (epoch ms). */
	date: number;
	note: string | null;
}

/** A copy gone from the collection. */
export interface PastCopyView extends ReleaseView {
	reason: string;
	/** When it left (epoch ms). */
	disposedAt: number;
	note: string | null;
}

export interface TrackRow {
	id: string;
	position: string | null;
	name: string;
	duration: string | null;
	/** Credits limited to this track, e.g. "Wolf Hoffmann: Electric Sitar, Acoustic Guitar". */
	credits: string[];
}

export interface TrackGroup {
	/** "Side A", "Disc 2", a heading from the release, or empty. */
	label: string;
	tracks: TrackRow[];
	duration: string | null;
}

export interface CreditRole {
	label: string;
	/** Track positions the role is limited to, e.g. "A1, B3". */
	tracks: string | null;
}

export interface CreditPerson {
	musicianUid: string;
	name: string;
	creditedAs: string | null;
	roles: CreditRole[];
}

export interface CreditGroup {
	key: CreditCategory;
	label: string;
	people: CreditPerson[];
}

export function toAlbumProfile(album: AlbumEntity): AlbumProfileView {
	const discogs = album.discogs;

	return {
		...toAlbumView(album),
		artistId: album.artist?.uid ?? '',
		genre: formatGenre(album.genre),
		spotifyAlbumId: isSpotifyAlbumId(album.spotifyAlbumId)
			? album.spotifyAlbumId
			: null,
		youtubePlaylistId: isYoutubePlaylistId(album.youtubePlaylistId)
			? album.youtubePlaylistId
			: null,
		youtubeVideoIds: (album.youtubeVideoIds ?? []).filter(isYoutubeVideoId),
		original: discogs
			? {
					released: discogs.released,
					country: formatCountry(discogs.country),
					labels:
						discogs.labels
							?.map((label) =>
								label.catno && label.catno !== 'none'
									? `${label.name} (${label.catno})`
									: label.name
							)
							.join(', ') || null,
					formats: discogs.formats?.join(' · ') || null,
					discogsUrl: `https://www.discogs.com/release/${discogs.releaseId}`,
				}
			: null,
	};
}

/** "38:04" or "1:02:03" from seconds. */
export function formatDuration(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const rest = String(seconds % 60).padStart(2, '0');

	return hours
		? `${hours}:${String(minutes).padStart(2, '0')}:${rest}`
		: `${minutes}:${rest}`;
}

/** Total length of tracks; null when any duration is unknown. */
export function totalDuration(tracks: TrackEntity[]): string | null {
	if (!tracks.length || tracks.some((track) => track.durationSec === null)) {
		return null;
	}
	return formatDuration(
		tracks.reduce((sum, track) => sum + (track.durationSec ?? 0), 0)
	);
}

/**
 * Track references of a credit: "A1, B3" or ranges such as "A1 to A3",
 * resolved against the album's positions in play order.
 */
export function parseTrackRefs(
	text: string | null,
	positions: string[]
): Set<string> {
	const refs = new Set<string>();

	for (const part of (text ?? '').split(',')) {
		const token = part.trim();
		const range = token.match(/^(.+?)\s+to\s+(.+)$/i);

		if (range) {
			const from = positions.indexOf(range[1].trim());
			const to = positions.indexOf(range[2].trim());
			if (from >= 0 && to >= from) {
				positions
					.slice(from, to + 1)
					.forEach((position) => refs.add(position));
			}
		} else if (token) {
			refs.add(token);
		}
	}
	return refs;
}

const roleLabel = (contribution: ContributionEntity) =>
	contribution.roleDetail
		? `${contribution.role} (${contribution.roleDetail})`
		: contribution.role;

/** Groups tracks by release heading, vinyl side or disc number. */
export function groupTracks(
	tracks: TrackEntity[],
	contributions: ContributionEntity[]
): TrackGroup[] {
	const positions = tracks.map((track) => track.position ?? '');
	/** position → person → roles, in credit order. */
	const trackCredits = new Map<string, Map<string, string[]>>();

	for (const contribution of contributions) {
		if (!contribution.tracks) {
			continue;
		}
		const refs = parseTrackRefs(contribution.tracks, positions);
		// A credit covering every track belongs to the album, not to tracks.
		if (refs.size >= tracks.length) {
			continue;
		}
		for (const position of refs) {
			const people =
				trackCredits.get(position) ?? new Map<string, string[]>();
			const roles = people.get(contribution.name) ?? [];
			roles.push(roleLabel(contribution));
			people.set(contribution.name, roles);
			trackCredits.set(position, people);
		}
	}

	const creditsOf = (position: string | null): string[] =>
		Array.from(trackCredits.get(position ?? '')?.entries() ?? []).map(
			([name, roles]) => `${name}: ${roles.join(', ')}`
		);

	const groupOf = (track: TrackEntity): string => {
		if (track.heading) {
			return track.heading;
		}
		const position = track.position ?? '';
		const side = position.match(/^([A-Z])\d*$/i);
		if (side) {
			return `Side ${side[1].toUpperCase()}`;
		}
		const disc = position.match(/^(\d+)[-.]\d+$/);
		if (disc) {
			return `Disc ${Number(disc[1])}`;
		}
		return '';
	};

	const groups: { label: string; tracks: TrackEntity[] }[] = [];
	for (const track of tracks) {
		const label = groupOf(track);
		const last = groups[groups.length - 1];
		if (last && last.label === label) {
			last.tracks.push(track);
		} else {
			groups.push({ label, tracks: [track] });
		}
	}

	// A single unnamed or single-side group needs no label.
	const showLabels = groups.length > 1;

	return groups.map((group) => ({
		label: showLabels ? group.label : '',
		duration: groups.length > 1 ? totalDuration(group.tracks) : null,
		tracks: group.tracks.map((track) => ({
			id: track.uid,
			position: track.position,
			name: track.name,
			duration: track.duration,
			credits: creditsOf(track.position),
		})),
	}));
}

function performerRank(person: CreditPerson): number {
	const ranks = person.roles.map((role) => {
		return performerOrder(role.label) + (role.tracks ? 10 : 0);
	});
	return Math.min(...ranks);
}

/** Credits grouped by category, one entry per person with all their roles. */
export function groupCredits(
	contributions: ContributionEntity[]
): CreditGroup[] {
	const groups = new Map<CreditCategory, Map<string, CreditPerson>>();

	for (const contribution of contributions) {
		const category = creditCategory(contribution.role);
		const people = groups.get(category) ?? new Map<string, CreditPerson>();
		const person = people.get(contribution.musicianUid) ?? {
			musicianUid: contribution.musicianUid,
			name: contribution.name,
			creditedAs:
				contribution.creditedAs &&
				contribution.creditedAs !== contribution.name
					? contribution.creditedAs
					: null,
			roles: [],
		};
		const label = roleLabel(contribution);

		if (
			!person.roles.some(
				(role) =>
					role.label === label && role.tracks === contribution.tracks
			)
		) {
			person.roles.push({ label, tracks: contribution.tracks });
		}
		people.set(contribution.musicianUid, person);
		groups.set(category, people);
	}

	return (Object.keys(CREDIT_CATEGORY_LABELS) as CreditCategory[])
		.filter((key) => groups.has(key))
		.map((key) => {
			const people = Array.from(
				(groups.get(key) ?? new Map()).values()
			).map((person) => ({
				...person,
				// Album-wide roles before track-limited ones.
				roles: [...person.roles].sort(
					(a, b) => Number(!!a.tracks) - Number(!!b.tracks)
				),
			}));

			return {
				key,
				label: CREDIT_CATEGORY_LABELS[key],
				people:
					key === 'performers'
						? people.sort(
								(a, b) =>
									performerRank(a) - performerRank(b) ||
									a.name.localeCompare(b.name)
							)
						: people.sort((a, b) => a.name.localeCompare(b.name)),
			};
		});
}

/** The album's releases, owned ones last, then by year and format. */
export function toReleaseOptions(
	releases: ReleaseEntity[],
	ownedReleaseIds: Set<string>
): ReleaseOptionView[] {
	return releases
		.map((release): ReleaseOptionView => {
			const descriptions = toDescriptions(release.formatDescription);

			return {
				id: release.uid,
				format: toMediaFormat(release.media),
				weight: descriptions.includes('180g') ? 180 : null,
				labelName: release.label?.name || null,
				country: formatCountry(release.country),
				year: toYear(release.date),
				editions: EDITION_TAGS.filter((tag) =>
					descriptions.includes(tag)
				),
				owned: ownedReleaseIds.has(release.uid),
			};
		})
		.sort(
			(a, b) =>
				Number(a.owned) - Number(b.owned) ||
				(a.year ?? Infinity) - (b.year ?? Infinity) ||
				a.format.localeCompare(b.format)
		);
}

const DISCOGS_MEDIA: Record<string, MediaFormat> = {
	vinyl: 'vinyl',
	cd: 'cd',
	cassette: 'cassette',
	dvd: 'dvd',
};

function discogsMediaFormat(majorFormats: string[]): MediaFormat {
	for (const format of majorFormats) {
		const media = DISCOGS_MEDIA[format.toLowerCase()];
		if (media) {
			return media;
		}
	}
	return 'other';
}

export function toDiscogsVersionViews(
	versions: DiscogsVersion[],
	requestedIds: Set<number>
): DiscogsVersionView[] {
	return versions.map((version) => ({
		id: version.id,
		format: discogsMediaFormat(version.majorFormats),
		formatText: version.format,
		label: version.label,
		catno: version.catno,
		country: version.country,
		year: version.year,
		discogsUrl: discogsReleaseUrl(version.id),
		requested: requestedIds.has(version.id),
	}));
}

/** The pressing a request is about, as the collector saw it. */
export function toRequestPressing(
	version: DiscogsVersionView
): ReleaseRequestPressing {
	return {
		format: version.formatText,
		label: version.label,
		catno: version.catno,
		country: version.country,
		year: version.year,
	};
}

function pressingSummary(pressing: ReleaseRequestPressing | null): string {
	if (!pressing) {
		return '';
	}
	const label = pressing.label
		? pressing.catno
			? `${pressing.label} (${pressing.catno})`
			: pressing.label
		: null;

	return [pressing.format, label, pressing.country, pressing.year]
		.filter((part) => part !== null && part !== '')
		.join(' · ');
}

export function toPendingRequestView(
	request: ReleaseRequest
): PendingRequestView {
	const summary = pressingSummary(request.pressing);

	return {
		id: request.uid,
		summary:
			summary ||
			(request.discogsReleaseId
				? `Discogs release ${request.discogsReleaseId}`
				: 'Described pressing'),
		note: request.note,
		discogsUrl: request.discogsReleaseId
			? discogsReleaseUrl(request.discogsReleaseId)
			: null,
		adminNote: request.adminNote ?? null,
	};
}

export function toPastCopyView(item: CollectionItemEntity): PastCopyView {
	return {
		...toReleaseView(item),
		reason: item.disposal
			? DISPOSAL_REASON_LABELS[item.disposal.reason] ??
				DISPOSAL_REASON_LABELS.other
			: DISPOSAL_REASON_LABELS.other,
		disposedAt: item.disposal?.date ?? 0,
		note: item.disposal?.note ?? null,
	};
}
