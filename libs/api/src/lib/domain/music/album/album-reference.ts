import type { Identifiable } from '../../../common';
import type { Album, AlbumReference } from './album';

/**
 * The album copy a wish stores. Every writer goes through here, so a whole
 * album picked in a form never reaches the wish, and a field added to the
 * reference reaches every writer at once.
 */
export function toAlbumReference(
	album: Pick<Album, 'coverImage' | 'coverImageUrl' | 'name'> & Identifiable
): AlbumReference {
	return {
		uid: album.uid,
		name: album.name,
		coverImage: album.coverImage ?? null,
		coverImageUrl: album.coverImageUrl ?? null,
	};
}
