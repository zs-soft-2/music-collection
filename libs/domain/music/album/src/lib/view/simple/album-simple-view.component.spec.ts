import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
	EntityTypeEnum,
	FormatEnum,
	GenreEnum,
	SimpleAlbum,
} from '@music-collection/api';

import { AlbumSimpleViewComponent } from './album-simple-view.component';

describe('AlbumSimpleViewComponent', () => {
	let component: AlbumSimpleViewComponent;
	let fixture: ComponentFixture<AlbumSimpleViewComponent>;

	const album: SimpleAlbum = {
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
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AlbumSimpleViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(AlbumSimpleViewComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('album', album);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
