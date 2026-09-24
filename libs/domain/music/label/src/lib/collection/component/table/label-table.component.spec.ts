import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { LabelStateService, LabelUtilService } from '@music-collection/api';

import { LabelTableComponent } from './label-table.component';

const label = { uid: '1', name: 'Sub Pop' } as LabelEntity;

describe('LabelTableComponent', () => {
	let component: LabelTableComponent;
	let fixture: ComponentFixture<LabelTableComponent>;

	beforeEach(async () => {
		localStorage.clear();
		sessionStorage.clear();

		await TestBed.configureTestingModule({
			imports: [LabelTableComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: LabelStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([label])),
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

	it('shows the label in both views', () => {
		expect(
			fixture.nativeElement.querySelector('tbody').textContent
		).toContain('Sub Pop');

		component.collectionView.setView('cards');
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('mc-entity-card').textContent
		).toContain('Sub Pop');
	});
});
