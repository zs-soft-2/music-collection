import { provideI18nTesting } from '@music-collection/core/i18n/testing';
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
				provideI18nTesting(),
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

	/**
	 * AC-4 of #79: the table draws from the copy's stored pressing, and so
	 * from its stored album: the entered address there has to win.
	 */
	it('shows the entered address of the stored album over its attachment', () => {
		expect(
			component.imageOf({
				...collectionItem,
				release: {
					...collectionItem.release,
					album: {
						uid: 'al1',
						name: 'Nevermind',
						coverImageUrl: 'https://a/url.jpg',
						coverImage: { filePath: 'https://storage/doc.jpg' },
					},
				},
			} as CollectionItemEntity)
		).toBe('https://a/url.jpg');
	});
});
