import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
	CollectionItemEntity,
	CollectionItemStateService,
	CollectionItemUtilService,
} from '@music-collection/api';

import { CollectionItemTableComponent } from './collection-item-table.component';

const collectionItem = {
	uid: '1',
	release: { name: 'Nevermind LP', artist: { name: 'Nirvana' } },
} as CollectionItemEntity;

describe('CollectionItemTableComponent', () => {
	let component: CollectionItemTableComponent;
	let fixture: ComponentFixture<CollectionItemTableComponent>;

	beforeEach(async () => {
		localStorage.clear();
		sessionStorage.clear();

		await TestBed.configureTestingModule({
			imports: [CollectionItemTableComponent],
			providers: [
				provideRouter([]),
				provideNoopAnimations(),
				{
					provide: CollectionItemStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([collectionItem])),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{ provide: CollectionItemUtilService, useValue: {} },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(CollectionItemTableComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('shows the collection item in both views', () => {
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
