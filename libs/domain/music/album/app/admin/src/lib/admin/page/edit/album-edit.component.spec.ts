import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { provideRouter } from '@angular/router';
import {
	AlbumStateService,
	AlbumUtilService,
	ArtistStateService,
	DocumentStateService,
} from '@music-collection/api';

import { AlbumEditComponent } from './album-edit.component';

describe('AlbumEditComponent', () => {
	let component: AlbumEditComponent;
	let fixture: ComponentFixture<AlbumEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AlbumEditComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: AlbumStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						dispatchListEntitiesAction: jest.fn(),
						selectEntityById$: jest.fn(() => of(undefined)),
					},
				},
				{
					provide: AlbumUtilService,
					useValue: {
						createFormGroup: jest.fn(() =>
							new FormBuilder().group({
								artist: [null],
								coverImage: [null],
								coverImageUrl: [null],
								format: [null],
								name: [null],
								spotify: [null],
								styles: [null],
								uid: [null],
								year: [null],
								youtubeMusic: [null],
								youtubeVideos: [null],
							})
						),
					},
				},
				{
					provide: ArtistStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						dispatchListEntitiesAction: jest.fn(),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
				{
					provide: DocumentStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(AlbumEditComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
