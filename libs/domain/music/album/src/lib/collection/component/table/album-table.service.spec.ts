import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	type AlbumEntity,
	AlbumStateService,
	AlbumUtilService,
	ArtistStateService,
} from '@music-collection/api';

import { AlbumTableService, withSongList } from './album-table.service';

describe('AlbumTableService', () => {
	let service: AlbumTableService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				AlbumTableService,
				provideRouter([]),
				{ provide: AlbumStateService, useValue: {} },
				{ provide: AlbumUtilService, useValue: {} },
				{ provide: ArtistStateService, useValue: {} },
			],
		});

		service = TestBed.inject(AlbumTableService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});
});

describe('withSongList', () => {
	const album = (uid: string, songs?: string[] | null) =>
		({ uid, songs }) as unknown as AlbumEntity;

	it('gives an album never given songs an empty list', () => {
		expect(
			withSongList([album('1'), album('2', null)]).map(
				({ songs }) => songs
			)
		).toEqual([[], []]);
	});

	it('leaves an album that has its songs as it is', () => {
		const filled = album('1', ['One', 'Two']);

		expect(withSongList([filled])[0]).toBe(filled);
	});
});
