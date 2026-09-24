import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
	EntityTypeEnum,
	FormatDescriptionEnum,
	FormatEnum,
	GenreEnum,
	MediaEnum,
	ReleaseCountryEnum,
	ReleaseEntity,
} from '@music-collection/api';
import { provideAngularSvgIcon } from 'angular-svg-icon';

import { ReleaseSimpleViewComponent } from './release-simple-view.component';

describe('ReleaseSimpleViewComponent', () => {
	let component: ReleaseSimpleViewComponent;
	let fixture: ComponentFixture<ReleaseSimpleViewComponent>;

	const artist = {
		uid: 'artist-1',
		entityType: EntityTypeEnum.Artist,
		name: 'Artist',
		searchParameters: [],
	};

	const release: ReleaseEntity = {
		uid: 'release-1',
		entityType: EntityTypeEnum.Release,
		name: 'Release',
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
			year: new Date(1987, 0, 1),
		},
		artist,
		country: ReleaseCountryEnum.Europe,
		date: new Date(1987, 0, 1),
		formatDescription: FormatDescriptionEnum.g180,
		label: {
			uid: 'label-1',
			entityType: EntityTypeEnum.Label,
			name: 'Label',
		},
		media: MediaEnum.vinyl,
	};

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ReleaseSimpleViewComponent],
			providers: [
				provideI18nTesting(),
				provideHttpClient(),
				provideHttpClientTesting(),
				provideAngularSvgIcon(),
			],
		}).compileComponents();

		fixture = TestBed.createComponent(ReleaseSimpleViewComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('release', release);
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
