import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { LabelStateService, LabelUtilService } from '@music-collection/api';

import { LabelListPageComponent } from './label-list-page.component';

describe('LabelListComponent', () => {
	let component: LabelListPageComponent;
	let fixture: ComponentFixture<LabelListPageComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [LabelListPageComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: LabelStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{ provide: LabelUtilService, useValue: {} },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(LabelListPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
