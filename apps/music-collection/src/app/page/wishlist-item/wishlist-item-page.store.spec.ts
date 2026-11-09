import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TextService } from '@music-collection/core/i18n';
import type {
	AlbumDocument,
	AlbumReference,
	WishlistItemEntity,
} from '@music-collection/api';
import { EntityTypeEnum } from '@music-collection/common/api';

import { WishlistDetailsEffect } from '../../data/wishlist-details';
import { WishlistItemPageStore } from './wishlist-item-page.store';

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

function setUp(item: WishlistItemEntity): InstanceType<
	typeof WishlistItemPageStore
> {
	TestBed.configureTestingModule({
		providers: [
			WishlistItemPageStore,
			{
				provide: ActivatedRoute,
				useValue: { paramMap: of(convertToParamMap({ itemId: 'w1' })) },
			},
			{
				provide: WishlistDetailsEffect,
				useValue: { load$: () => of({ item, pressings: [] }) },
			},
			{
				provide: TextService,
				useValue: { translator: () => (key: string) => `[${key}]` },
			},
		],
	});

	return TestBed.inject(WishlistItemPageStore);
}

/**
 * AC-2 of #79: the wish page draws its cover from the wish's copy of the
 * album alone, so the entered address has to win there.
 */
describe('WishlistItemPageStore cover', () => {
	it('shows the entered address over the attached cover', () => {
		const store = setUp(
			wish({ coverImageUrl: 'https://a/url.jpg', coverImage: attached })
		);

		expect(store.coverUrl()).toBe('https://a/url.jpg');
	});

	it('still shows the attachment where nothing was entered', () => {
		const store = setUp(wish({ coverImage: attached }));

		expect(store.coverUrl()).toBe('https://storage/doc.jpg');
	});
});
