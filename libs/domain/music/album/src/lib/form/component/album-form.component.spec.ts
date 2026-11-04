import { provideGenreTesting } from '@music-collection/domain/genre/testing';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom, of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, FormGroupDirective } from '@angular/forms';
import { By } from '@angular/platform-browser';
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

/**
 * #80: the cover address previews through `mc-image-url-preview`. The form is
 * read from the template's own directive: `params$` builds a new form on every
 * subscription, so it would not be the one on screen.
 */
describe('AlbumFormComponent: the cover address preview', () => {
	let fixture: ComponentFixture<AlbumFormComponent>;

	const album = {
		uid: 'album-1',
		name: 'Nevermind',
		artist: { uid: 'artist-1', name: 'Nirvana' },
		format: 'lp',
		genre: 'rock',
		styles: ['grunge'],
		year: 1991,
		coverImageUrl: null,
	};

	function renderedForm(): FormGroup {
		return fixture.debugElement
			.query(By.directive(FormGroupDirective))
			.injector.get(FormGroupDirective).form;
	}

	function enterAddress(address: string): void {
		const input: HTMLInputElement = fixture.nativeElement.querySelector(
			'input#coverImageUrl'
		);

		input.value = address;
		input.dispatchEvent(new Event('input'));
		fixture.detectChanges();
	}

	function picture(): HTMLImageElement | null {
		return fixture.nativeElement.querySelector('mc-image-url-preview img');
	}

	function message(): string | undefined {
		return fixture.nativeElement
			.querySelector('mc-image-url-preview [role="status"]')
			?.textContent?.trim();
	}

	function failToLoad(): void {
		picture()?.dispatchEvent(new Event('error'));
		fixture.detectChanges();
	}

	function saveButton(): HTMLButtonElement | undefined {
		const label = TestBed.inject(TranslocoService).translate(
			'ui.albumForm.save'
		);

		return Array.from<HTMLButtonElement>(
			fixture.nativeElement.querySelectorAll('button')
		).find((button) => button.textContent?.trim() === label);
	}

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

	it('AC-3: says so when it cannot load, and the form can still be saved', () => {
		enterAddress('https://a/cover.jpg');
		expect(picture()?.getAttribute('src')).toBe('https://a/cover.jpg');
		expect(message()).toBe('');
		expect(renderedForm().valid).toBe(true);
		expect(saveButton()?.disabled).toBe(false);

		failToLoad();

		expect(picture()).toBeNull();
		expect(message()).toBe(
			TestBed.inject(TranslocoService).translate(
				'ui.imageUrlPreview.could-not-load'
			)
		);
		expect(message()).not.toBe('ui.imageUrlPreview.could-not-load');
		expect(
			fixture.nativeElement.querySelector('input#coverImageUrl').value
		).toBe('https://a/cover.jpg');
		expect(renderedForm().value['coverImageUrl']).toBe(
			'https://a/cover.jpg'
		);
		expect(renderedForm().valid).toBe(true);
		expect(saveButton()?.disabled).toBe(false);
	});

	it('AC-4: a new address clears the message and shows its picture', () => {
		enterAddress('https://a/bad.jpg');
		failToLoad();

		enterAddress('https://a/good.jpg');

		expect(picture()?.getAttribute('src')).toBe('https://a/good.jpg');
		expect(message()).toBe('');
	});
});
