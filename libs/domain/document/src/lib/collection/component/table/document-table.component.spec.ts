import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	DocumentStateService,
	DocumentUtilService,
} from '@music-collection/api';

import { DocumentTableComponent } from './document-table.component';

describe('DocumentTableComponent', () => {
	let component: DocumentTableComponent;
	let fixture: ComponentFixture<DocumentTableComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DocumentTableComponent],
			providers: [
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

		fixture = TestBed.createComponent(DocumentTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
