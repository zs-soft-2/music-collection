import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import {
	genreOf,
	provideGenreTesting,
} from '@music-collection/domain/genre/testing';
import { of } from 'rxjs';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArtistStateService } from '@music-collection/api';

import { ArtistListComponent } from './artist-list.component';

describe('ArtistListComponent', () => {
	let component: ArtistListComponent;
	let fixture: ComponentFixture<ArtistListComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ArtistListComponent],
			providers: [
				provideI18nTesting(),
				...provideGenreTesting([genreOf('Rock')]),
				{
					provide: ArtistStateService,
					useValue: { selectEntities$: jest.fn(() => of([])) },
				},
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ArtistListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
