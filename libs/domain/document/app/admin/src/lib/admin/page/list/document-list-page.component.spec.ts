import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	DocumentStateService,
	DocumentUtilService,
} from '@music-collection/api';

import { DocumentListPageComponent } from './document-list-page.component';

describe('DocumentListComponent', () => {
	let component: DocumentListPageComponent;
	let fixture: ComponentFixture<DocumentListPageComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DocumentListPageComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: DocumentStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{ provide: DocumentUtilService, useValue: {} },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(DocumentListPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
