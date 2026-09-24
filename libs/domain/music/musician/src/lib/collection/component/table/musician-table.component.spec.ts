import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MusicianEntity, MusicianStateService } from '@music-collection/api';

import { MusicianTableComponent } from './musician-table.component';

const musician = {
	uid: '1',
	name: 'Kurt Cobain',
	realName: 'Kurt Donald Cobain',
} as MusicianEntity;

describe('MusicianTableComponent', () => {
	let component: MusicianTableComponent;
	let fixture: ComponentFixture<MusicianTableComponent>;

	beforeEach(async () => {
		localStorage.clear();
		sessionStorage.clear();

		await TestBed.configureTestingModule({
			imports: [MusicianTableComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: MusicianStateService,
					useValue: {
						isLoading$: jest.fn(() => of(false)),
						selectEntities$: jest.fn(() => of([musician])),
					},
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(MusicianTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('shows the musician in both views', () => {
		expect(
			fixture.nativeElement.querySelector('tbody').textContent
		).toContain('Kurt Cobain');

		component.collectionView.setView('cards');
		fixture.detectChanges();

		expect(
			fixture.nativeElement.querySelector('mc-entity-card').textContent
		).toContain('Kurt Cobain');
	});
});
