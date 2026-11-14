import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import type { AlbumEntity, AlbumReference } from '@music-collection/api';

import { WishlistItemUtilServiceImpl } from './wishlist-item-util.service.impl';

const reference: AlbumReference = {
	uid: 'al1',
	name: 'In Utero',
	coverImage: null,
	coverImageUrl: 'https://a/url.jpg',
};

/** The form the admin wishlist editor builds, holding `albumReference`. */
const form = (albumReference: unknown): FormGroup =>
	new FormGroup({
		uid: new FormControl('w1'),
		albumReference: new FormControl(albumReference),
		artistReference: new FormControl({ uid: 'ar1', name: 'Nirvana' }),
		userReference: new FormControl({ uid: 'u1', displayName: 'Kurt' }),
		medias: new FormControl(['vinyl']),
		isActive: new FormControl(true),
		sourceLink: new FormControl(''),
	});

describe('WishlistItemUtilServiceImpl', () => {
	let service: WishlistItemUtilServiceImpl;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideI18nTesting(), WishlistItemUtilServiceImpl],
		});
		service = TestBed.inject(WishlistItemUtilServiceImpl);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	/** AC-1 of #79: the wishlist surfaces read only this copy of the album. */
	describe('the album reference it stores', () => {
		it('keeps the entered cover address of a new wish', () => {
			const album = {
				...reference,
				format: 'LP',
				songs: [],
			} as unknown as AlbumEntity;

			expect(service.createEntity(form(album)).albumReference).toEqual(
				reference
			);
		});

		it('keeps the entered cover address when a wish is edited', () => {
			expect(service.updateEntity(form(reference)).albumReference).toEqual(
				reference
			);
		});

		/**
		 * Re-picking the album in the editor puts the whole album into the
		 * control: only the reference fields may be stored.
		 */
		it('narrows a re-picked album to the reference fields', () => {
			const album = {
				...reference,
				format: 'LP',
				genre: 'Rock',
				songs: [],
			} as unknown as AlbumEntity;

			const stored = service.updateEntity(form(album)).albumReference;

			expect(stored).toEqual(reference);
			expect(stored).not.toHaveProperty('format');
		});
	});
});
