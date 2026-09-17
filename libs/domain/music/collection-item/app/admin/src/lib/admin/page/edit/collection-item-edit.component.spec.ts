import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { provideRouter } from '@angular/router';
import {
	AuthenticationStateService,
	CollectionItemStateService,
	CollectionItemUtilService,
	ReleaseStateService,
} from '@music-collection/api';

import { CollectionItemEditComponent } from './collection-item-edit.component';

describe('CollectionItemEditComponent', () => {
	let component: CollectionItemEditComponent;
	let fixture: ComponentFixture<CollectionItemEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CollectionItemEditComponent],
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
					useValue: {
						createFormGroupByUser: jest.fn(() =>
							new FormBuilder().group({
								date: [null],
								description: [null],
								release: [null],
								uid: [null],
								userId: [null],
							})
						),
					},
				},
				{
					provide: ReleaseStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(CollectionItemEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
