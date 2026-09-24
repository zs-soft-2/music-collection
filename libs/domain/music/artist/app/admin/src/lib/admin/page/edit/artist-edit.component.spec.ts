import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	ArtistStateService,
	DocumentStateService,
} from '@music-collection/api';
import { ArtistUtilModule } from '@music-collection/domain/artist';

import { ArtistEditComponent } from './artist-edit.component';

describe('ArtistEditComponent', () => {
	let component: ArtistEditComponent;
	let fixture: ComponentFixture<ArtistEditComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			// The real form group, so a new field of the form does not have
			// to be repeated here.
			imports: [ArtistEditComponent, ArtistUtilModule],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: ArtistStateService,
					useValue: {
						selectEntities$: jest.fn(() => of([])),
						dispatchListEntitiesAction: jest.fn(),
						selectEntityById$: jest.fn(() => of(undefined)),
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
