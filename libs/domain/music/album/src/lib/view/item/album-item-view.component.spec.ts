import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
	AlbumEntity,
	EntityTypeEnum,
	FormatEnum,
	GenreEnum,
} from '@music-collection/api';

import { AlbumItemViewComponent } from './album-item-view.component';

describe('AlbumItemViewComponent', () => {
	let component: AlbumItemViewComponent;
	let fixture: ComponentFixture<AlbumItemViewComponent>;

	const album: AlbumEntity = {
		uid: 'album-1',
		entityType: EntityTypeEnum.Album,
		name: 'Album',
		artist: {
			uid: 'artist-1',
			entityType: EntityTypeEnum.Artist,
			name: 'Artist',
			searchParameters: [],
		},
		coverImage: null,
		format: FormatEnum.lp,
		genre: GenreEnum.Rock,
		songs: [],
		styles: [],
		year: new Date(1987, 0, 1),
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideI18nTesting()],
			imports: [AlbumItemViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(AlbumItemViewComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('album', album);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
