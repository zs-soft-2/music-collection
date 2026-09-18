import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	ReleaseStateService,
	ReleaseUtilService,
} from '@music-collection/api';

import { ReleaseTableComponent } from './release-table.component';

describe('ReleaseTableComponent', () => {
	let component: ReleaseTableComponent;
	let fixture: ComponentFixture<ReleaseTableComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ReleaseTableComponent],
			providers: [
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: ReleaseStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{ provide: ReleaseUtilService, useValue: {} },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ReleaseTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
