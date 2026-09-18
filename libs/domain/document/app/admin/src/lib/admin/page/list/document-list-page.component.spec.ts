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
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: DocumentStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
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
