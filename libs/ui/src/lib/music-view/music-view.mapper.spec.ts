import {
	AlbumEntity,
	ArtistEntity,
	CollectionItemEntity,
} from '@music-collection/api';

import {
	toAlbumView,
	toArtistView,
	toReleaseView,
} from './music-view.mapper';

/**
 * The picture order the views are built on (#60). Case numbers refer to
 * `specs/60-artist-album-image-urls/contracts/image-url-rule.md` §3.
 */
const artistOf = (artist: Partial<ArtistEntity>): ArtistEntity =>
	({ uid: 'a1', name: 'Nirvana', ...artist }) as ArtistEntity;

const albumOf = (album: Partial<AlbumEntity>): AlbumEntity =>
	({ uid: 'b1', name: 'Nevermind', ...album }) as AlbumEntity;

const itemOf = (album: Partial<AlbumEntity>): CollectionItemEntity =>
	({
		uid: 'c1',
		release: { uid: 'r1', name: 'Nevermind', album },
	}) as CollectionItemEntity;

describe('toArtistView: the artist picture', () => {
	it('case 10: shows the entered address over the attachment and the import', () => {
		expect(
			toArtistView(
				artistOf({
					imageUrl: 'https://a/url.jpg',
					mainImage: { filePath: 'https://storage/main.jpg' },
					discogs: { imageUrl: 'https://discogs/x.jpg' },
				} as Partial<ArtistEntity>)
			).imageUrl
		).toBe('https://a/url.jpg');
	});

	it('case 11: falls back to the attached main image', () => {
		expect(
			toArtistView(
				artistOf({
					imageUrl: null,
					mainImage: { filePath: 'https://storage/main.jpg' },
					discogs: { imageUrl: 'https://discogs/x.jpg' },
				} as Partial<ArtistEntity>)
			).imageUrl
		).toBe('https://storage/main.jpg');
	});

	it('case 12: keeps the imported photo last', () => {
		expect(
			toArtistView(
				artistOf({
					imageUrl: null,
					discogs: { imageUrl: 'https://discogs/x.jpg' },
				} as Partial<ArtistEntity>)
			).imageUrl
		).toBe('https://discogs/x.jpg');
	});
});

describe('toArtistView: the header picture', () => {
	it('case 16: the attached header keeps precedence over the entered address', () => {
		expect(
			toArtistView(
				artistOf({
					headerImage: { filePath: 'https://storage/header.jpg' },
					imageUrl: 'https://a/url.jpg',
					mainImage: { filePath: 'https://storage/main.jpg' },
				} as Partial<ArtistEntity>)
			).headerUrl
		).toBe('https://storage/header.jpg');
	});

	it('case 17: without an attached header the entered address becomes the banner', () => {
		expect(
			toArtistView(
				artistOf({
					imageUrl: 'https://a/url.jpg',
					mainImage: { filePath: 'https://storage/main.jpg' },
				} as Partial<ArtistEntity>)
			).headerUrl
		).toBe('https://a/url.jpg');
	});

	it('case 18: and then the attached main image', () => {
		expect(
			toArtistView(
				artistOf({
					imageUrl: null,
					mainImage: { filePath: 'https://storage/main.jpg' },
				} as Partial<ArtistEntity>)
			).headerUrl
		).toBe('https://storage/main.jpg');
	});
});

describe('toAlbumView: the cover', () => {
	it('case 1: shows the entered address over the attached cover', () => {
		expect(
			toAlbumView(
				albumOf({
					coverImageUrl: 'https://a/url.jpg',
					coverImage: { filePath: 'https://storage/doc.jpg' },
				} as Partial<AlbumEntity>)
			).coverUrl
		).toBe('https://a/url.jpg');
	});

	it('case 2: still consults the attachment when nothing is entered', () => {
		expect(
			toAlbumView(
				albumOf({
					coverImageUrl: null,
					coverImage: { filePath: 'https://storage/doc.jpg' },
				} as Partial<AlbumEntity>)
			).coverUrl
		).toBe('https://storage/doc.jpg');
	});

	it('case 4: is no cover where there is neither', () => {
		expect(toAlbumView(albumOf({ coverImageUrl: null })).coverUrl).toBeNull();
	});
});

describe('toReleaseView: the cover of the release-s album', () => {
	it('case 1: shows the entered address over the attached cover', () => {
		expect(
			toReleaseView(
				itemOf({
					coverImageUrl: 'https://a/url.jpg',
					coverImage: { filePath: 'https://storage/doc.jpg' },
				} as Partial<AlbumEntity>)
			).coverUrl
		).toBe('https://a/url.jpg');
	});

	it('case 2: still consults the attachment when nothing is entered', () => {
		expect(
			toReleaseView(
				itemOf({
					coverImage: { filePath: 'https://storage/doc.jpg' },
				} as Partial<AlbumEntity>)
			).coverUrl
		).toBe('https://storage/doc.jpg');
	});

	it('case 8: is no cover where the release names no album', () => {
		expect(
			toReleaseView({
				uid: 'c1',
				release: { uid: 'r1', name: 'Untitled' },
			} as CollectionItemEntity).coverUrl
		).toBeNull();
	});
});
