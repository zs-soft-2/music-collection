import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
	AlbumDocument,
	AlbumReference,
	EntityTypeEnum,
	WishlistItemEntity,
} from '@music-collection/api';

import { WishlistItemSimpleViewComponent } from './wishlist-item-simple-view.component';

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

describe('WishlistItemSimpleViewComponent', () => {
	let component: WishlistItemSimpleViewComponent;
	let fixture: ComponentFixture<WishlistItemSimpleViewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideI18nTesting()],
			imports: [WishlistItemSimpleViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(WishlistItemSimpleViewComponent);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		component.wishlistItem = wish({});
		fixture.detectChanges();

		expect(component).toBeTruthy();
	});

	/**
	 * AC-2 of #79: both layouts draw the cover from the wish's copy of the
	 * album, so the entered address has to reach the rendered image.
	 */
	it.each(['horizontal', 'vertical'] as const)(
		'renders the entered address over the attached cover (%s)',
		(layout) => {
			component.wishlistItem = wish({
				coverImageUrl: 'https://a/url.jpg',
				coverImage: attached,
			});
			component.layout = layout;
			fixture.detectChanges();

			const image: HTMLImageElement | null =
				fixture.nativeElement.querySelector('img');

			expect(image?.getAttribute('src')).toBe('https://a/url.jpg');
		}
	);
});
