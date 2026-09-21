import {
	AlbumEntity,
	ArtistEntity,
	CollectionItemEntity,
	DEFAULT_ARTIST_TYPE,
} from '@music-collection/api';
import {
	formatCountry,
	toDescriptions,
	toEpochMs,
	toYear,
} from '@music-collection/common/engine';

import {
	AlbumView,
	ArtistView,
	DiscographyAlbum,
	EditionTag,
	FORMAT_ORDER,
	MediaFormat,
	ReleaseView,
} from './music-view.model';

export const EDITION_TAGS: EditionTag[] = [
	'limited edition',
	'deluxe edition',
	'reissue',
	'remastered',
	'box set',
	'picture disc',
];

const MEDIA_FORMATS: MediaFormat[] = [
	'vinyl',
	'cd',
	'cassette',
	'dvd',
	'boxset',
];

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
	// Filed under the box set medium, or only tagged as one: either way the
	// shelf draws the wide spine and the card says box set.
	const format = toMediaFormat(release.media);

	return {
		id: item.uid,
		albumId: release.album?.uid ?? '',
		releaseId: release.uid ?? null,
		title: release.album?.name || release.name || 'Untitled',
		artistId: release.artist?.uid ?? '',
		artistName: release.artist?.name || 'Unknown artist',
		coverUrl:
			release.album?.coverImage?.filePath ||
			release.album?.coverImageUrl ||
			null,
		format,
		albumType: toAlbumType(release.album?.format),
		year: toYear(release.album?.year),
		styles: release.album?.styles ?? [],
		editions: EDITION_TAGS.filter((tag) => descriptions.includes(tag)),
		weight: descriptions.includes('180g') ? 180 : null,
		boxSet: format === 'boxset' || descriptions.includes('box set'),
		pictureDisc: descriptions.includes('picture disc'),
		addedAt: toEpochMs(item.date) ?? 0,
		labelName: release.label?.name || null,
		country: formatCountry(release.country),
	};
}

export function toArtistView(artist: ArtistEntity): ArtistView {
	const imageUrl =
		artist.mainImage?.filePath ||
		artist.imageUrl ||
		artist.discogs?.imageUrl ||
		null;

	return {
		id: artist.uid,
		name: artist.name,
		type: artist.artistType ?? DEFAULT_ARTIST_TYPE,
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
		coverUrl: album.coverImage?.filePath || album.coverImageUrl || null,
		year: toYear(album.year),
		albumType: toAlbumType(album.format),
		styles: album.styles ?? [],
	};
}

/** The artist's albums, oldest first, with the formats owned of each. */
export function toDiscography(
	albums: AlbumView[],
	releases: ReleaseView[]
): DiscographyAlbum[] {
	const owned = new Map<string, Set<MediaFormat>>();

	for (const release of releases) {
		const formats = owned.get(release.albumId) ?? new Set<MediaFormat>();
		formats.add(release.format);
		owned.set(release.albumId, formats);
	}

	return albums
		.map((album) => ({
			...album,
			ownedFormats: FORMAT_ORDER.filter((format) =>
				owned.get(album.id)?.has(format)
			),
		}))
		.sort(
			(a, b) =>
				(a.year ?? Number.MAX_SAFE_INTEGER) -
					(b.year ?? Number.MAX_SAFE_INTEGER) ||
				a.title.localeCompare(b.title)
		);
}
