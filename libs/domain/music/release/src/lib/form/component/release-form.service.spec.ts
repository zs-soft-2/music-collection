import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
	AlbumEntity,
	AlbumStateService,
	ArtistStateService,
	DiscogsVersion,
	EntityTypeEnum,
	LabelEntity,
	LabelStateService,
	MediaEnum,
	ReleaseFormParams,
	ReleaseStateService,
	ReleaseUtilService,
} from '@music-collection/api';

import { ReleaseUtilServiceImpl } from '../../util/service/release-util.service.impl';
import { ReleaseFormService } from './release-form.service';

const ALBUM = {
	uid: 'album-1',
	name: 'The Legacy',
	artist: { uid: 'artist-1', name: 'Testament' },
} as AlbumEntity;

const LABEL = {
	uid: 'label-1',
	entityType: EntityTypeEnum.Label,
	name: 'Music On Vinyl',
} as LabelEntity;

const VERSION: DiscogsVersion = {
	id: 100,
	title: 'The Legacy',
	format: 'LP, Album, Reissue',
	majorFormats: ['Vinyl'],
	label: 'Music On Vinyl',
	catno: 'MOVLP2620',
	country: 'Germany',
	year: 2019,
	thumbUrl: null,
};

describe('ReleaseFormService', () => {
	let service: ReleaseFormService;
	let params: ReleaseFormParams;
	let findExternalMaster$: jest.Mock;
	let listExternalVersions$: jest.Mock;

	beforeEach(() => {
		findExternalMaster$ = jest.fn(() => of(4242));
		listExternalVersions$ = jest.fn(() => of([VERSION]));

		TestBed.configureTestingModule({
			providers: [
				provideI18nTesting(),
				ReleaseFormService,
				provideRouter([]),
				{
					provide: ReleaseStateService,
					useValue: {
						findExternalMaster$,
						listExternalVersions$,
						selectEntityById$: jest.fn(() => of(undefined)),
					},
				},
				{
					provide: ReleaseUtilService,
					useClass: ReleaseUtilServiceImpl,
				},
				{
					provide: AlbumStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
				{
					provide: ArtistStateService,
					useValue: { selectSearchResult$: jest.fn(() => of([])) },
				},
				{
					provide: LabelStateService,
					useValue: {
						dispatchListEntitiesAction: jest.fn(),
						selectEntities$: jest.fn(() => of([LABEL])),
						selectSearchResult$: jest.fn(() => of([])),
					},
				},
			],
		});

		service = TestBed.inject(ReleaseFormService);
		// The form the admin sees: every answer the service publishes lands
		// here, so the tests read the same object the template binds to.
		service.init$().subscribe((emitted) => (params = emitted));
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('does not ask Discogs before an album is picked', async () => {
		await service.loadExternal();

		expect(findExternalMaster$).not.toHaveBeenCalled();
		expect(service.externalVersions()).toBeNull();
	});

	it('lists the pressings of the album in the form', async () => {
		pickAlbum();

		await service.loadExternal();

		expect(findExternalMaster$).toHaveBeenCalledWith(
			'Testament',
			'The Legacy'
		);
		expect(listExternalVersions$).toHaveBeenCalledWith(4242);
		expect(service.externalVersions()).toEqual([VERSION]);
	});

	/*
	 * An album imported from Discogs names its master, and asking the search
	 * for one it already knows would spend a call on a worse answer.
	 */
	it('takes the master off the album where it carries one', async () => {
		pickAlbum({ discogs: { masterId: 77 } } as Partial<AlbumEntity>);

		await service.loadExternal();

		expect(findExternalMaster$).not.toHaveBeenCalled();
		expect(listExternalVersions$).toHaveBeenCalledWith(77);
	});

	it('says so where Discogs knows no such album', async () => {
		findExternalMaster$.mockReturnValue(of(null));
		pickAlbum();

		await service.loadExternal();

		expect(service.externalVersions()).toBeNull();
		expect(service.externalError()).toContain('Testament');
	});

	it('reports a failed load instead of leaving the button spinning', async () => {
		listExternalVersions$.mockImplementation(() => {
			throw new Error('offline');
		});
		pickAlbum();

		await service.loadExternal();

		expect(service.externalLoading()).toBe(false);
		expect(service.externalError()).toBeTruthy();
	});

	it('puts the picked pressing next to what the form holds', () => {
		pickAlbum();
		service.chooseExternalVersion(VERSION);

		const comparison = service.externalComparison();

		expect(service.externalVersions()).toBeNull();
		expect(comparison?.sourceUrl).toContain('/release/100');
		expect(
			comparison?.rows.map((row) => [row.field, row.loaded, row.selected])
		).toEqual([
			['name', 'The Legacy', true],
			['media', 'vinyl', true],
			['country', 'Germany', true],
			['formatDescription', 'reissue', true],
			['date', '2019-01-01', true],
			['label', 'Music On Vinyl', true],
			['catno', 'MOVLP2620', true],
			['discogsReleaseId', '100', true],
		]);
	});

	it('leaves out what the form already says', () => {
		pickAlbum();
		params.formGroup.patchValue({ media: MediaEnum.vinyl });
		service.chooseExternalVersion(VERSION);

		expect(
			service.externalComparison()?.rows.map((row) => row.field)
		).not.toContain('media');
	});

	it('only writes the rows that are ticked', () => {
		pickAlbum();
		service.chooseExternalVersion(VERSION);
		service.toggleExternalRow('catno');
		service.applyExternal();

		const value = params.formGroup.value;

		expect(value['catno']).toBeNull();
		expect(value['media']).toBe(MediaEnum.vinyl);
		expect(value['label']).toEqual(LABEL);
		expect(value['discogsReleaseId']).toBe(100);
		expect(service.externalComparison()).toBeNull();
	});

	/*
	 * The select offers four countries and pressings come from everywhere; a
	 * value it does not offer would read as an empty field.
	 */
	it('offers the loaded country on the select before setting it', (done) => {
		pickAlbum();
		service.chooseExternalVersion(VERSION);
		service.init$().subscribe((params) => {
			if (params.formGroup.value['country'] === 'Germany') {
				expect(params.countryList).toContain('Germany');
				done();
			}
		});
		service.applyExternal();
	});

	function formValue() {
		let group!: ReturnType<
			ReleaseUtilServiceImpl['createEntity']
		> extends never
			? never
			: any;

		service.init$().subscribe((params) => (group = params.formGroup));

		return group;
	}

	function pickAlbum(fields: Partial<AlbumEntity> = {}): void {
		formValue().patchValue({ album: { ...ALBUM, ...fields } });
	}
});
