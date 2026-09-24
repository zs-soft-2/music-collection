import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { LabelStateService, LabelUtilService } from '@music-collection/api';

import { LabelEditComponent } from './label-edit.component';

describe('LabelEditComponent', () => {
	let component: LabelEditComponent;
	let fixture: ComponentFixture<LabelEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [LabelEditComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: LabelStateService,
					useValue: {
						selectEntityById$: jest.fn(() => of(undefined)),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{
					provide: LabelUtilService,
					useValue: {
						createFormGroup: jest.fn(() =>
							new FormBuilder().group({
								name: [null],
								parent: [null],
								uid: [null],
							})
						),
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(LabelEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
