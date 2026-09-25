import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

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
});
