import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { provideRouter } from '@angular/router';
import {
	ArtistStateService,
	ArtistUtilService,
	DocumentStateService,
} from '@music-collection/api';

import { ArtistEditComponent } from './artist-edit.component';

describe('ArtistEditComponent', () => {
	let component: ArtistEditComponent;
	let fixture: ComponentFixture<ArtistEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ArtistEditComponent],
			providers: [
				provideRouter([]),
				{
					provide: ArtistStateService,
					useValue: { selectEntityById$: jest.fn(() => of(undefined)) },
				},
				{
					provide: ArtistUtilService,
					useValue: {
						createFormGroup: jest.fn(() =>
							new FormBuilder().group({
								artistType: [null],
								country: [null],
								description: [null],
								formedIn: [null],
								headerImage: [null],
								imageUrl: [null],
								mainImage: [null],
								name: [null],
								styles: [null],
								uid: [null],
							})
						),
					},
				},
				{
					provide: DocumentStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ArtistEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
