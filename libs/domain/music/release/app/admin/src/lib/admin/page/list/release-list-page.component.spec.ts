import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ReleaseStateService, ReleaseUtilService } from '@music-collection/api';

import { ReleaseListPageComponent } from './release-list-page.component';

describe('ReleaseListComponent', () => {
	let component: ReleaseListPageComponent;
	let fixture: ComponentFixture<ReleaseListPageComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ReleaseListPageComponent],
			providers: [
				provideI18nTesting(),
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

		fixture = TestBed.createComponent(ReleaseListPageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
