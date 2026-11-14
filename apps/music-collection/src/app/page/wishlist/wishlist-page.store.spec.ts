import type {
	AlbumDocument,
	AlbumReference,
	WishlistItemEntity,
} from '@music-collection/api';
import { EntityTypeEnum } from '@music-collection/common/api';

import { toWishlistEntryView } from './wishlist-page.store';

const attached: AlbumDocument = {
	entityType: EntityTypeEnum.Document,
	filePath: 'https://storage/doc.jpg',
	name: 'doc.jpg',
	uid: 'doc-1',
};

const wish = (albumReference: Partial<AlbumReference>): WishlistItemEntity => ({
	uid: 'w1',
	entityType: EntityTypeEnum.WishlistItem,
	isActive: true,
	albumReference: {
		uid: 'al1',
		name: 'In Utero',
		coverImage: null,
		coverImageUrl: null,
		...albumReference,
	},
	artistReference: { uid: 'ar1', name: 'Nirvana' },
	userReference: { uid: 'u1' },
	medias: [],
	sourceLink: '',
});

/**
 * AC-2 of #79: the wishlist page draws each cover from the wish's copy of
 * the album alone, so the entered address has to win there.
 */
describe('toWishlistEntryView cover', () => {
	it('shows the entered address over the attached cover', () => {
		expect(
			toWishlistEntryView(
				wish({ coverImageUrl: 'https://a/url.jpg', coverImage: attached })
			).release.coverUrl
		).toBe('https://a/url.jpg');
	});

	it('still shows the attachment where nothing was entered', () => {
		expect(
			toWishlistEntryView(wish({ coverImage: attached })).release.coverUrl
		).toBe('https://storage/doc.jpg');
	});
});
