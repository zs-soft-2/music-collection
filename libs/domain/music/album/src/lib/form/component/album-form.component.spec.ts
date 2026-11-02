import { provideGenreTesting } from '@music-collection/domain/genre/testing';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom, of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	AlbumUtilService,
	ArtistStateService,
	DocumentStateService,
} from '@music-collection/api';

import { AlbumUtilServiceImpl } from '../../util/service/album-util.service.impl';
import { AlbumFormComponent } from './album-form.component';

describe('AlbumFormComponent', () => {
	let component: AlbumFormComponent;
	let fixture: ComponentFixture<AlbumFormComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AlbumFormComponent],
			providers: [
				provideI18nTesting(),
				provideGenreTesting(),
				provideRouter([]),
				{
					provide: AlbumStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						dispatchListEntitiesAction: jest.fn(),
						selectEntityById$: jest.fn(() => of(undefined)),
					},
				},
				{ provide: AlbumUtilService, useClass: AlbumUtilServiceImpl },
				{
					provide: ArtistStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						dispatchListEntitiesAction: jest.fn(),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{
					provide: DocumentStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AlbumFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	/**
	 * AC-5 of #60: the placeholder under the cover address used to say the
	 * field is "used when no cover image is attached", which is now the
	 * opposite of what happens. The key said it too, so the key is renamed.
	 */
	it('says the entered address takes precedence over the attachment', () => {
		const transloco = TestBed.inject(TranslocoService);
		const placeholder = fixture.nativeElement
			.querySelector('input#coverImageUrl')
			?.getAttribute('placeholder');

		expect(placeholder).toBe(
			transloco.translate('ui.albumForm.url-wins-over-cover')
		);
		// A key with no translation behind it reads back as itself, which is
		// how the assertion above would otherwise pass on a missing key.
		expect(placeholder).not.toBe('ui.albumForm.url-wins-over-cover');
		expect(placeholder).toMatch(/precedence/i);
		// The sentence that lied. The old key is not named here on purpose:
		// its absence from the repository is checked by the grep in T045.
		expect(placeholder).not.toMatch(/used when no/i);
	});

	/**
	 * FR-007: the order changed, the storage did not. The attached cover
	 * keeps a control of its own in the form.
	 */
	it('still holds the attached cover', async () => {
		const params = await firstValueFrom(component.params$);

		expect(params.formGroup.contains('coverImage')).toBe(true);
	});
});

/**
 * The document picker only draws while an existing album is being edited
 * (`isImagesTabActive`), so FR-007's "still selectable" is asserted here.
 */
describe('AlbumFormComponent: editing an album that has a cover attached', () => {
	let fixture: ComponentFixture<AlbumFormComponent>;

	const album = {
		uid: 'album-1',
		name: 'Nevermind',
		coverImageUrl: 'https://a/url.jpg',
		coverImage: { uid: 'doc-1', name: 'cover', filePath: 'https://s/c.jpg' },
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AlbumFormComponent],
			providers: [
				provideI18nTesting(),
				provideGenreTesting(),
				provideRouter([]),
				{
					provide: AlbumStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						dispatchListEntitiesAction: jest.fn(),
						selectEntityById$: jest.fn(() => of(album)),
					},
				},
				{ provide: AlbumUtilService, useClass: AlbumUtilServiceImpl },
				{
					provide: ArtistStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						dispatchListEntitiesAction: jest.fn(),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{
					provide: DocumentStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AlbumFormComponent);
		fixture.detectChanges();
	});

	it('still offers the document search for the cover', () => {
		expect(
			fixture.nativeElement.querySelector('[inputId="coverImage"]')
		).not.toBeNull();
	});

	/** The attachment it already has is still the one the form holds. */
	it('keeps the attachment it was opened with', async () => {
		const params = await firstValueFrom(
			fixture.componentInstance.params$
		);

		expect(params.formGroup.value['coverImage']).toEqual(album.coverImage);
	});
});
