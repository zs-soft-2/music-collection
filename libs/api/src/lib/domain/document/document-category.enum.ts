/**
 * What a document was made for.
 *
 * The wrapper record over the file is what makes this possible at all: the
 * bytes in Storage say nothing about why they were uploaded, and the
 * document says it. A machine files one on its own — the badges drawn for
 * the collections are such a set — and an admin picks one by hand for
 * everything else, so that a picker can later offer covers to an album and
 * pictures to an artist instead of the whole library.
 *
 * A document may still carry none: an upload nobody has filed yet is a file
 * someone picked, and nothing more is known about it.
 */
export enum DocumentCategoryEnum {
	AlbumCover = 'album-cover',
	ArtistImage = 'artist-image',
	Badge = 'badge',
	Scene = 'scene',
	TrackImage = 'track-image',
}

/**
 * Every category, in the order the admin offers them: the ones picked by
 * hand first, the generated one last.
 */
export const DOCUMENT_CATEGORIES: DocumentCategoryEnum[] = [
	DocumentCategoryEnum.AlbumCover,
	DocumentCategoryEnum.ArtistImage,
	DocumentCategoryEnum.TrackImage,
	DocumentCategoryEnum.Scene,
	DocumentCategoryEnum.Badge,
];

/**
 * The category a stored value stands for, or `undefined` when it is none of
 * them — an older document may hold whatever was written before the list
 * was what it is now.
 */
export const documentCategoryOf = (
	value: string | null | undefined
): DocumentCategoryEnum | undefined =>
	DOCUMENT_CATEGORIES.find((category) => category === value);
