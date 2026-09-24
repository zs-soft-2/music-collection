import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	ReleaseEntity,
	ReleaseStateService,
	ReleaseUtilService,
} from '@music-collection/api';

import { ReleaseTableComponent } from './release-table.component';

const release = {
	uid: '1',
	name: 'Nevermind LP',
	artist: { name: 'Nirvana' },
} as ReleaseEntity;

describe('ReleaseTableComponent', () => {
	let component: ReleaseTableComponent;
	let fixture: ComponentFixture<ReleaseTableComponent>;

	beforeEach(async () => {
		localStorage.clear();
		sessionStorage.clear();

		await TestBed.configureTestingModule({
			imports: [ReleaseTableComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: ReleaseStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([release])),
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

	it('shows the release in both views', () => {
		expect(
			fixture.nativeElement.querySelector('tbody').textContent
		).toContain('Nevermind LP');

		component.collectionView.setView('cards');
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('mc-entity-card').textContent
		).toContain('Nevermind LP');
	});
});
