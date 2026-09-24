import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
	ArtistEntity,
	CountryEnum,
	EntityTypeEnum,
	GenreEnum,
} from '@music-collection/api';

import { ArtistSimpleViewComponent } from './artist-simple-view.component';

describe('ArtistSimpleViewComponent', () => {
	let component: ArtistSimpleViewComponent;
	let fixture: ComponentFixture<ArtistSimpleViewComponent>;

	const artist: ArtistEntity = {
		uid: 'artist-1',
		entityType: EntityTypeEnum.Artist,
		country: CountryEnum.Australia,
		description: '',
		formedIn: null,
		genre: GenreEnum.Rock,
		name: 'Artist',
		sites: [],
		styles: [],
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideI18nTesting()],
			imports: [ArtistSimpleViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(ArtistSimpleViewComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('artist', artist);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
