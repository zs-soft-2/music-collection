import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { provideRouter } from '@angular/router';
import {
	DocumentStateService,
	DocumentUtilService,
} from '@music-collection/api';

import { DocumentEditComponent } from './document-edit.component';

describe('DocumentEditComponent', () => {
	let component: DocumentEditComponent;
	let fixture: ComponentFixture<DocumentEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [DocumentEditComponent],
			providers: [
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
					useValue: {
						createFormGroupByProperties: jest.fn(() =>
							new FormBuilder().group({
								filePath: [null],
								fileType: [null],
								name: [null],
								originalName: [null],
								uid: [null],
							})
						),
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(DocumentEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
