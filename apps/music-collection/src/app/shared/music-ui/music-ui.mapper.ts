import {
	AlbumEntity,
	ArtistEntity,
	CollectionItemEntity,
} from '@music-collection/api';

import {
	AlbumView,
	ArtistView,
	EditionTag,
	MediaFormat,
	ReleaseView,
} from './music-ui.model';

const EDITION_TAGS: EditionTag[] = [
	'limited edition',
	'deluxe edition',
	'reissue',
	'remastered',
	'box set',
	'picture disc',
];

const MEDIA_FORMATS: MediaFormat[] = ['vinyl', 'cd', 'cassette', 'dvd'];

/**
 * Dates arrive in several shapes: a Firestore `Timestamp` (`{ seconds }`), a
 * `Date`, an ISO string or epoch milliseconds.
 */
export function toEpochMs(value: unknown): number | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}
	if (value instanceof Date) {
		return isNaN(value.getTime()) ? null : value.getTime();
	}
	if (typeof value === 'number') {
		return value;
	}
	if (typeof value === 'string') {
		const ms = Date.parse(value);
		return isNaN(ms) ? null : ms;
	}
	if (typeof value === 'object' && 'seconds' in value) {
		const seconds = (value as { seconds: unknown }).seconds;
		return typeof seconds === 'number' ? seconds * 1000 : null;
	}
	return null;
}

/** `formatDescription` is typed as one value but is stored as a list. */
function toDescriptions(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.filter((item): item is string => typeof item === 'string');
	}
	return typeof value === 'string' && value ? [value] : [];
}

function toAlbumType(format: unknown): string | null {
	if (typeof format !== 'string' || !format) {
		return null;
	}
	return format.length <= 2
		? format.toUpperCase()
		: format.charAt(0).toUpperCase() + format.slice(1);
}

export function toMediaFormat(media: unknown): MediaFormat {
	return MEDIA_FORMATS.includes(media as MediaFormat)
		? (media as MediaFormat)
		: 'other';
}

export function toReleaseView(item: CollectionItemEntity): ReleaseView {
	const { release } = item;
	const descriptions = toDescriptions(release.formatDescription);

	return {
		id: item.uid,
		albumId: release.album?.uid ?? '',
		title: release.album?.name || release.name || 'Untitled',
		artistId: release.artist?.uid ?? '',
		artistName: release.artist?.name || 'Unknown artist',
		coverUrl: release.album?.coverImage?.filePath || null,
		format: toMediaFormat(release.media),
		albumType: toAlbumType(release.album?.format),
		year: toYear(release.album?.year),
		styles: release.album?.styles ?? [],
		editions: EDITION_TAGS.filter((tag) => descriptions.includes(tag)),
		weight: descriptions.includes('180g') ? 180 : null,
		boxSet: descriptions.includes('box set'),
		pictureDisc: descriptions.includes('picture disc'),
		addedAt: toEpochMs(item.date) ?? 0,
	};
}

function toYear(value: unknown): number | null {
	const ms = toEpochMs(value);
	return ms === null ? null : new Date(ms).getFullYear();
}

/** Countries are stored inconsistently: "USA", "Germany", "UNITED_KINGDOM". */
export function formatCountry(country: unknown): string | null {
	if (typeof country !== 'string' || !country.trim()) {
		return null;
	}
	if (country.length <= 3) {
		return country.toUpperCase();
	}
	return country
		.toLowerCase()
		.split(/[_\s]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

export function toArtistView(artist: ArtistEntity): ArtistView {
	const imageUrl = artist.mainImage?.filePath || null;

	return {
		id: artist.uid,
		name: artist.name,
		imageUrl,
		headerUrl: artist.headerImage?.filePath || imageUrl,
		styles: artist.styles ?? [],
		country: formatCountry(artist.country),
		formedYear: toYear(artist.formedIn),
	};
}

export function toAlbumView(album: AlbumEntity): AlbumView {
	return {
		id: album.uid,
		title: album.name,
		artistName: album.artist?.name ?? '',
		coverUrl: album.coverImage?.filePath || null,
		year: toYear(album.year),
		albumType: toAlbumType(album.format),
		styles: album.styles ?? [],
	};
}
