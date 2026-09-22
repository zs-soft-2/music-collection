import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	ArtistStateService,
	LabelStateService,
	ReleaseStateService,
	ReleaseUtilService,
} from '@music-collection/api';

import { ReleaseEditComponent } from './release-edit.component';

describe('ReleaseEditComponent', () => {
	let component: ReleaseEditComponent;
	let fixture: ComponentFixture<ReleaseEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ReleaseEditComponent],
			providers: [
				provideRouter([]),
				{
					provide: ReleaseStateService,
					useValue: {
						selectEntityById$: jest.fn(() => of(undefined)),
					},
				},
				{
					provide: ReleaseUtilService,
					useValue: {
						createOrUpdateFormGroupForDisabling: jest.fn(() =>
							new FormBuilder().group({
								album: [null],
								artist: [null],
								country: [null],
								date: [null],
								formatDescription: [null],
								label: [null],
								media: [null],
								name: [null],
								uid: [null],
							})
						),
					},
				},
				{
					provide: AlbumStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
				{
					provide: ArtistStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
				{
					provide: LabelStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ReleaseEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
