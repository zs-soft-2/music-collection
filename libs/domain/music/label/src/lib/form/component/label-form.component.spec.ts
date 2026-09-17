import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LabelStateService, LabelUtilService } from '@music-collection/api';

import { LabelUtilServiceImpl } from '../../util/service/label-util.service.impl';
import { LabelFormComponent } from './label-form.component';

describe('LabelFormComponent', () => {
	let component: LabelFormComponent;
	let fixture: ComponentFixture<LabelFormComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [LabelFormComponent],
			providers: [
				provideRouter([]),
				{
					provide: LabelStateService,
					useValue: {
						selectEntityById$: jest.fn(() => of(undefined)),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{ provide: LabelUtilService, useClass: LabelUtilServiceImpl },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(LabelFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
