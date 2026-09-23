import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	DocumentEntity,
	DocumentStateService,
	DocumentUtilService,
} from '@music-collection/api';

import { DocumentTableComponent } from './document-table.component';

const document = {
	uid: '1',
	name: 'Badge',
	originalName: 'badge.png',
} as DocumentEntity;

describe('DocumentTableComponent', () => {
	let component: DocumentTableComponent;
	let fixture: ComponentFixture<DocumentTableComponent>;

	beforeEach(async () => {
		localStorage.clear();
		sessionStorage.clear();

		await TestBed.configureTestingModule({
			imports: [DocumentTableComponent],
			providers: [
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: DocumentStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([document])),
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

	it('shows the document in both views', () => {
		expect(
			fixture.nativeElement.querySelector('tbody').textContent
		).toContain('Badge');

		component.collectionView.setView('cards');
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('mc-entity-card').textContent
		).toContain('Badge');
	});
});
