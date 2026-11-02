import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
	ArtistEntity,
	CountryEnum,
	EntityTypeEnum,
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
		genre: 'Rock',
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

/**
 * AC-3 of #60: the view used to ask the attached main image and nothing else,
 * so an artist whose only picture is a typed-in address got an empty frame.
 */
describe('ArtistSimpleViewComponent: the picture it draws', () => {
	let fixture: ComponentFixture<ArtistSimpleViewComponent>;

	const artistOf = (artist: Partial<ArtistEntity>): ArtistEntity =>
		({
			uid: 'artist-1',
			entityType: EntityTypeEnum.Artist,
			country: CountryEnum.Australia,
			description: '',
			formedIn: null,
			genre: 'Rock',
			name: 'Artist',
			sites: [],
			styles: [],
			...artist,
		}) as ArtistEntity;

	const imageSrc = async (
		artist: ArtistEntity
	): Promise<string | null | undefined> => {
		await TestBed.configureTestingModule({
			providers: [provideI18nTesting()],
			imports: [ArtistSimpleViewComponent],
		}).compileComponents();

		fixture = TestBed.createComponent(ArtistSimpleViewComponent);
		fixture.componentRef.setInput('artist', artist);
		fixture.detectChanges();

		return fixture.nativeElement
			.querySelector('p-image img')
			?.getAttribute('src');
	};

	beforeEach(() => TestBed.resetTestingModule());

	it('case 13: draws the entered address where there is no attachment', async () => {
		expect(
			await imageSrc(artistOf({ imageUrl: 'https://a/url.jpg' }))
		).toBe('https://a/url.jpg');
	});

	it('case 10: draws the entered address over the attachment', async () => {
		expect(
			await imageSrc(
				artistOf({
					imageUrl: 'https://a/url.jpg',
					mainImage: { filePath: 'https://storage/main.jpg' },
				} as Partial<ArtistEntity>)
			)
		).toBe('https://a/url.jpg');
	});

	/** The attachment is reordered, never dropped (FR-007). */
	it('case 11: still draws the attachment where nothing was entered', async () => {
		expect(
			await imageSrc(
				artistOf({
					mainImage: { filePath: 'https://storage/main.jpg' },
				} as Partial<ArtistEntity>)
			)
		).toBe('https://storage/main.jpg');
	});
});
