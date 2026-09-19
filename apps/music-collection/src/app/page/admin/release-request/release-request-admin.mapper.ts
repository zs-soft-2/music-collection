import {
	ReleaseEntity,
	ReleaseRequest,
	ReleaseRequestStatus,
	User,
	discogsReleaseUrl,
} from '@music-collection/api';

import {
	FORMAT_LABELS,
	formatCountry,
	toMediaFormat,
	toYear,
} from '../../../shared/music-ui';

export type StatusFilter = ReleaseRequestStatus | 'all';

/** A catalog release of the album, to approve the request with. */
export interface CatalogReleaseOption {
	id: string;
	/** e.g. "Vinyl · Nuclear Blast · Germany · 2011". */
	label: string;
}

export interface ReleaseRequestRow {
	id: string;
	status: ReleaseRequestStatus;
	albumId: string;
	albumName: string;
	artistName: string | null;
	requesterName: string;
	/** e.g. "19 Sep 2026". */
	requestedOn: string;
	decidedOn: string | null;
	/** What the collector requested, e.g. "Vinyl, LP · Charm (CHARM 1) · UK". */
	summary: string;
	note: string | null;
	adminNote: string | null;
	discogsUrl: string | null;
	/** Can be approved by importing the Discogs release. */
	importable: boolean;
	catalogReleases: CatalogReleaseOption[];
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
});

function formatDate(ms: number | undefined): string | null {
	return ms ? DATE_FORMAT.format(new Date(ms)) : null;
}

function requesterName(userId: string, users: Map<string, User>): string {
	const user = users.get(userId);
	return user?.displayName || user?.email || userId;
}

function requestSummary(request: ReleaseRequest): string {
	const pressing = request.pressing;
	const label = pressing?.label
		? pressing.catno
			? `${pressing.label} (${pressing.catno})`
			: pressing.label
		: null;
	const parts = [pressing?.format, label, pressing?.country, pressing?.year]
		.filter((part) => part !== null && part !== undefined && part !== '')
		.join(' · ');

	if (parts) {
		return parts;
	}
	return request.discogsReleaseId
		? `Discogs release ${request.discogsReleaseId}`
		: 'Described pressing';
}

export function toCatalogReleaseOption(
	release: ReleaseEntity
): CatalogReleaseOption {
	return {
		id: release.uid,
		label: [
			FORMAT_LABELS[toMediaFormat(release.media)],
			release.label?.name,
			formatCountry(release.country),
			toYear(release.date),
		]
			.filter(
				(part) => part !== null && part !== undefined && part !== ''
			)
			.join(' · '),
	};
}

export function toReleaseRequestRows(
	requests: ReleaseRequest[],
	users: User[],
	releases: ReleaseEntity[]
): ReleaseRequestRow[] {
	const usersById = new Map(users.map((user) => [user.uid, user]));
	const releasesByAlbum = new Map<string, CatalogReleaseOption[]>();

	for (const release of releases) {
		const albumId = release.album?.uid;
		if (albumId) {
			const options = releasesByAlbum.get(albumId) ?? [];
			options.push(toCatalogReleaseOption(release));
			releasesByAlbum.set(albumId, options);
		}
	}

	return requests.map((request) => ({
		id: request.uid,
		status: request.status,
		albumId: request.album?.uid ?? '',
		albumName: request.album?.name || 'Unknown album',
		artistName: request.album?.artistName ?? null,
		requesterName: requesterName(request.userId, usersById),
		requestedOn: formatDate(request.createdAt) ?? '',
		decidedOn: formatDate(request.decidedAt),
		summary: requestSummary(request),
		note: request.note,
		adminNote: request.adminNote ?? null,
		discogsUrl: request.discogsReleaseId
			? discogsReleaseUrl(request.discogsReleaseId)
			: null,
		importable: !!request.discogsReleaseId,
		catalogReleases: releasesByAlbum.get(request.album?.uid ?? '') ?? [],
	}));
}
