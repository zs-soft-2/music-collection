import { provideGenreTesting } from '@music-collection/domain/genre/testing';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom, of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import {
	ArtistStateService,
	ArtistUtilService,
	DocumentStateService,
} from '@music-collection/api';

import { Select } from 'primeng/select';

import { ArtistUtilServiceImpl } from '../../util/service/artist-util.service.impl';
import { ArtistFormComponent } from './artist-form.component';

describe('ArtistFormComponent', () => {
	let component: ArtistFormComponent;
	let fixture: ComponentFixture<ArtistFormComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ArtistFormComponent],
			providers: [
				provideI18nTesting(),
				provideGenreTesting(),
				provideRouter([]),
				{
					provide: ArtistStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						dispatchListEntitiesAction: jest.fn(),
						selectEntityById$: jest.fn(() => of(undefined)),
					},
				},
				{ provide: ArtistUtilService, useClass: ArtistUtilServiceImpl },
				{
					provide: DocumentStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ArtistFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	/**
	 * The select is asked for the label it would draw, rather than the options
	 * it was handed: an option carrying the key and not the word reads `empty`
	 * on screen, and the list of keys would pass any assertion made on it.
	 */
	it('names every kind of act in the language in force', () => {
		const select = fixture.debugElement.query(
			By.css('p-select[inputId="artistType"]')
		)?.componentInstance as Select | undefined;

		expect(select).toBeDefined();
		expect(
			(select?.options() as object[]).map((option) =>
				select?.getOptionLabel(option)
			)
		).toEqual(['Band', 'Project', 'Formation']);
	});

	/**
	 * AC-5 of #60: the placeholder under the photo address used to say the
	 * field is "used when no main image is attached", which is now the
	 * opposite of what happens. The key said it too, so the key is renamed.
	 */
	it('says the entered address takes precedence over the attachment', async () => {
		const transloco = TestBed.inject(TranslocoService);
		const placeholder = fixture.nativeElement
			.querySelector('input#imageUrl')
			?.getAttribute('placeholder');

		expect(placeholder).toBe(
			transloco.translate('ui.artistForm.url-wins-over-main')
		);
		// A key with no translation behind it reads back as itself, which is
		// how the assertion above would otherwise pass on a missing key.
		expect(placeholder).not.toBe('ui.artistForm.url-wins-over-main');
		expect(placeholder).toMatch(/precedence/i);
		// The sentence that lied. The old key is not named here on purpose:
		// its absence from the repository is checked by the grep in T045.
		expect(placeholder).not.toMatch(/used when no/i);
	});

	/**
	 * FR-007: the order changed, the storage did not. Both attachments keep a
	 * control of their own in the form.
	 */
	it('still holds both attached pictures', async () => {
		const params = await firstValueFrom(component.params$);

		expect(params.formGroup.contains('headerImage')).toBe(true);
		expect(params.formGroup.contains('mainImage')).toBe(true);
	});
});

/**
 * The document pickers only draw while an existing artist is being edited
 * (`isImagesTabActive`), so FR-007's "still selectable" is asserted here.
 */
describe('ArtistFormComponent: editing an artist that has attachments', () => {
	let fixture: ComponentFixture<ArtistFormComponent>;

	const artist = {
		uid: 'artist-1',
		name: 'Nirvana',
		imageUrl: 'https://a/url.jpg',
		mainImage: { uid: 'doc-1', name: 'main', filePath: 'https://s/m.jpg' },
		headerImage: { uid: 'doc-2', name: 'head', filePath: 'https://s/h.jpg' },
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ArtistFormComponent],
			providers: [
				provideI18nTesting(),
				provideGenreTesting(),
				provideRouter([]),
				{
					provide: ArtistStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						dispatchListEntitiesAction: jest.fn(),
						selectEntityById$: jest.fn(() => of(artist)),
					},
				},
				{ provide: ArtistUtilService, useClass: ArtistUtilServiceImpl },
				{
					provide: DocumentStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ArtistFormComponent);
		fixture.detectChanges();
	});

	it('still offers the document search for both pictures', () => {
		expect(
			fixture.nativeElement.querySelector('[inputId="headerImage"]')
		).not.toBeNull();
		expect(
			fixture.nativeElement.querySelector('[inputId="mainImage"]')
		).not.toBeNull();
	});

	/** The attachment it already has is still the one the form holds. */
	it('keeps the attachments it was opened with', async () => {
		const params = await firstValueFrom(
			fixture.componentInstance.params$
		);

		expect(params.formGroup.value['mainImage']).toEqual(artist.mainImage);
		expect(params.formGroup.value['headerImage']).toEqual(
			artist.headerImage
		);
	});
});
