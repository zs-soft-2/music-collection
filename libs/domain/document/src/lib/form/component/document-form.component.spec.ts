import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	DocumentStateService,
	DocumentUtilService,
} from '@music-collection/api';

import { DocumentUtilServiceImpl } from '../../util/service/document-util.service.impl';
import { DocumentFormComponent } from './document-form.component';

describe('DocumentFormComponent', () => {
	let component: DocumentFormComponent;
	let fixture: ComponentFixture<DocumentFormComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DocumentFormComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: DocumentStateService,
					useValue: {
						selectEntityById$: jest.fn(() => of(undefined)),
						selectFilePath$: jest.fn(() => of(undefined)),
					},
				},
				{
					provide: DocumentUtilService,
					useClass: DocumentUtilServiceImpl,
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(DocumentFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
