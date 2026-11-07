import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	AlbumDocument,
	AlbumReference,
	EntityTypeEnum,
	WishlistItemEntity,
	ExportImportService,
	WishlistItemStateService,
	WishlistItemUtilService,
} from '@music-collection/api';

import { WishlistItemTableComponent } from './wishlist-item-table.component';

const wishlistItem = {
	uid: '1',
	albumReference: { name: 'In Utero' },
	artistReference: { name: 'Nirvana' },
} as WishlistItemEntity;

describe('WishlistItemTableComponent', () => {
	let component: WishlistItemTableComponent;
	let fixture: ComponentFixture<WishlistItemTableComponent>;

	beforeEach(async () => {
		localStorage.clear();
		sessionStorage.clear();

		await TestBed.configureTestingModule({
			imports: [WishlistItemTableComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: WishlistItemStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([wishlistItem])),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{ provide: WishlistItemUtilService, useValue: {} },
				{ provide: ExportImportService, useValue: {} },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(WishlistItemTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('shows the wishlist item in both views', () => {
		expect(
			fixture.nativeElement.querySelector('tbody').textContent
		).toContain('In Utero');

		component.collectionView.setView('cards');
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('mc-entity-card').textContent
		).toContain('In Utero');
	});

	/**
	 * AC-3 of #60, AC-2 of #79: the wishlist used to ask the attached cover
	 * and nothing else, so a wished album whose only cover is a typed-in
	 * address had none. Real fixtures, so the compiler checks the shape.
	 */
	const attached: AlbumDocument = {
		entityType: EntityTypeEnum.Document,
		filePath: 'https://storage/doc.jpg',
		name: 'doc.jpg',
		uid: 'doc-1',
	};

	const wish = (albumReference: Partial<AlbumReference>): WishlistItemEntity => ({
		uid: '1',
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
		userReference: { uid: 'u1', displayName: 'Kurt' },
		medias: [],
		sourceLink: '',
	});

	it('case 3: shows the entered address where there is no attachment', () => {
		expect(
			component.imageOf(wish({ coverImageUrl: 'https://a/url.jpg' }))
		).toBe('https://a/url.jpg');
	});

	it('case 1: shows the entered address over the attached cover', () => {
		expect(
			component.imageOf(
				wish({ coverImageUrl: 'https://a/url.jpg', coverImage: attached })
			)
		).toBe('https://a/url.jpg');
	});

	/** The attachment is reordered, never dropped (FR-007). */
	it('case 2: still shows the attachment where nothing was entered', () => {
		expect(component.imageOf(wish({ coverImage: attached }))).toBe(
			'https://storage/doc.jpg'
		);
	});
});
