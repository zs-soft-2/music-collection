import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
	CollectionItemEntity,
	EntityTypeEnum,
	FormatDescriptionEnum,
	FormatEnum,
	GenreEnum,
	MediaEnum,
	ReleaseCountryEnum,
} from '@music-collection/api';

import { CollectionItemSimpleViewComponent } from './collection-item-simple-view.component';

describe('CollectionItemSimpleViewComponent', () => {
	let component: CollectionItemSimpleViewComponent;
	let fixture: ComponentFixture<CollectionItemSimpleViewComponent>;

	const artist = {
		uid: 'artist-1',
		entityType: EntityTypeEnum.Artist,
		name: 'Artist',
		searchParameters: [],
	};

	const collectionItem: CollectionItemEntity = {
		uid: 'collection-item-1',
		entityType: EntityTypeEnum.CollectionItem,
		date: new Date(0),
		userId: 'user-1',
		release: {
			uid: 'release-1',
			entityType: EntityTypeEnum.Release,
			date: new Date(0),
			name: 'Release',
			media: MediaEnum.cassette,
			country: ReleaseCountryEnum.Europe,
			formatDescription: FormatDescriptionEnum.boxSet,
			artist,
			label: {
				uid: 'label-1',
				entityType: EntityTypeEnum.Label,
				name: 'Label',
			},
			album: {
				uid: 'album-1',
				entityType: EntityTypeEnum.Album,
				name: 'Album',
				artist,
				coverImage: null,
				format: FormatEnum.lp,
				genre: GenreEnum.Rock,
				songs: [],
				styles: [],
				year: new Date(0),
			},
		},
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [CollectionItemSimpleViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(CollectionItemSimpleViewComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('collectionItem', collectionItem);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
