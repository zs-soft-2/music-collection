import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AuthenticationStateService,
	CollectionItemStateService,
	CollectionItemUtilService,
	ReleaseStateService,
} from '@music-collection/api';

import { CollectionItemUtilServiceImpl } from '../../util/service/collection-item-util.service.impl';
import { CollectionItemFormComponent } from './collection-item-form.component';

describe('CollectionItemFormComponent', () => {
	let component: CollectionItemFormComponent;
	let fixture: ComponentFixture<CollectionItemFormComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CollectionItemFormComponent],
			providers: [
				provideRouter([]),
				{
					provide: AuthenticationStateService,
					useValue: {
						selectAuthenticatedUser$: jest.fn(() => of(undefined)),
					},
				},
				{
					provide: CollectionItemStateService,
					useValue: { selectEntityById$: jest.fn(() => of(undefined)) },
				},
				{
					provide: CollectionItemUtilService,
					useClass: CollectionItemUtilServiceImpl,
				},
				{
					provide: ReleaseStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(CollectionItemFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
