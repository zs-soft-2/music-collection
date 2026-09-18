import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { LabelStateService, LabelUtilService } from '@music-collection/api';

import { LabelTableComponent } from './label-table.component';

describe('LabelTableComponent', () => {
	let component: LabelTableComponent;
	let fixture: ComponentFixture<LabelTableComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [LabelTableComponent],
			providers: [
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

		fixture = TestBed.createComponent(LabelTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
