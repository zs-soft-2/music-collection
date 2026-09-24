import { combineLatest, firstValueFrom, Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
	AlbumEntity,
	AlbumEntityAdd,
	AlbumEntityUpdate,
	AlbumExternalField,
	AlbumExternalProfile,
	AlbumFormParams,
	AlbumStateService,
	AlbumUtilService,
	ArtistEntity,
	ArtistStateService,
	DocumentEntity,
	DocumentStateService,
	EntityTypeEnum,
	FormatList,
	liveDocuments,
	ReturnNavigationService,
	SearchParams,
	StyleList,
} from '@music-collection/api';
import { isSameCatalogName } from '@music-collection/common/engine';
import {
	CatalogDuplicate,
	DUPLICATE_CATALOG_NAME,
	uniqueCatalogName,
} from '@music-collection/ui';

/** One field of the loaded album next to the form's current value. */
export interface AlbumExternalRow {
	current: string;
	field: AlbumExternalField;
	labelKey: string;
	loaded: string;
	/** Whether the loaded value goes into the form on apply. */
	selected: boolean;
	value: unknown;
}

export interface AlbumExternalComparison {
	rows: AlbumExternalRow[];
	sourceUrl: string;
}

const EXTERNAL_FIELDS: { field: AlbumExternalField; labelKey: string }[] = [
	{ field: 'name', labelKey: 'ui.albumForm.title' },
	{ field: 'format', labelKey: 'ui.albumForm.format' },
	{ field: 'year', labelKey: 'ui.albumForm.year' },
	{ field: 'styles', labelKey: 'ui.albumForm.styles' },
	{ field: 'coverImageUrl', labelKey: 'ui.albumForm.cover-url' },
];

function isEmpty(value: unknown): boolean {
	return (
		value === null ||
		value === undefined ||
		value === '' ||
		(Array.isArray(value) && value.length === 0)
	);
}

function formatValue(value: unknown): string {
	if (isEmpty(value)) {
		return '';
	}
	if (value instanceof Date) {
		const pad = (part: number): string => String(part).padStart(2, '0');

		return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
			value.getDate()
		)}`;
	}
	if (Array.isArray(value)) {
		return value.join(', ');
	}

	return String(value);
}

@Injectable()
export class AlbumFormService {
	private activatedRoute = inject(ActivatedRoute);
	private albumStateService = inject(AlbumStateService);
	private albumUtilService = inject(AlbumUtilService);
	private artistStateService = inject(ArtistStateService);
	private componentUtil = inject(AlbumUtilService);
	private destroyRef = inject(DestroyRef);
	private documentStateService = inject(DocumentStateService);
	private returnNavigation = inject(ReturnNavigationService);
	private router = inject(Router);

	private album!: AlbumEntity | undefined;
	/** Every album of the catalog, for the duplicate check on the title. */
	private catalogAlbums: AlbumEntity[] = [];
	private params!: AlbumFormParams;
	private params$$: ReplaySubject<AlbumFormParams>;

	/** The album this title collides with, blocking or not, or null. */
	public readonly duplicate = signal<CatalogDuplicate | null>(null);
	public readonly externalComparison = signal<AlbumExternalComparison | null>(
		null
	);
	public readonly externalError = signal<string | null>(null);
	public readonly externalLoading = signal(false);

	public constructor() {
		this.params$$ = new ReplaySubject();

		// The catalog may arrive after the form is on screen, so the title is
		// checked again once it does.
		this.albumStateService
			.selectEntities$()
			.pipe(takeUntilDestroyed())
			.subscribe((albums) => {
				if (!albums.length) {
					this.albumStateService.dispatchListEntitiesAction();
				}
				this.catalogAlbums = albums;
				this.recheckName();
			});
	}

	/**
	 * The titles this album would collide with: the other albums of the
	 * artist it is being filed under. Two artists may each have a record
	 * called Destroyer, so the clash is only within one artist — and the
	 * artist is a form field, which is why the list is read on every check.
	 */
	private takenAlbums(): AlbumEntity[] {
		const artistUid = this.params?.formGroup.value['artist']?.uid;

		if (!artistUid) {
			return [];
		}

		return this.catalogAlbums.filter(
			(album) =>
				album.artist?.uid === artistUid && album.uid !== this.album?.uid
		);
	}

	private takenAlbumNames(): string[] {
		return this.takenAlbums().map((album) => album.name);
	}

	/**
	 * Asks the catalog about the title again and names what it collides with.
	 * The validator lets through the collision the album arrived in, so the
	 * report carries both kinds and says which this one is: a blocking clash
	 * the admin can still type their way out of, or a settled one only a merge
	 * in the catalog can end.
	 */
	private recheckName(): void {
		const control = this.params?.formGroup.controls['name'];

		if (!control) {
			return;
		}

		control.updateValueAndValidity({ emitEvent: false });

		const name = String(control.value ?? '');
		const twin = this.takenAlbums().find((album) =>
			isSameCatalogName(album.name, name)
		);

		this.duplicate.set(
			twin
				? {
						blocking: !!control.errors?.[DUPLICATE_CATALOG_NAME],
						name: twin.name,
						uid: twin.uid,
					}
				: null
		);
	}

	/** Puts the selected loaded values into the form; saving stays manual. */
	public applyExternal(): void {
		const comparison = this.externalComparison();
		if (!comparison) {
			return;
		}
		const patch = Object.fromEntries(
			comparison.rows
				.filter((row) => row.selected)
				.map((row) => [row.field, row.value])
		);
		this.params.formGroup.patchValue(patch);
		this.params.formGroup.markAsDirty();
		this.externalComparison.set(null);
		this.params$$.next(this.params);
	}

	public closeExternal(): void {
		this.externalComparison.set(null);
	}

	/**
	 * Opens the album this title collides with, where the admin can see the
	 * two side by side and decide which one the catalog keeps.
	 */
	public openDuplicate(): void {
		const duplicate = this.duplicate();

		if (!duplicate) {
			return;
		}

		this.router.navigate(['..', duplicate.uid], {
			queryParamsHandling: 'preserve',
			relativeTo: this.activatedRoute,
		});
	}

	/** Looks the album up online by the title and artist in the form. */
	public async loadExternal(): Promise<void> {
		const value = this.params.formGroup.value;
		const name = (value['name'] as string | null)?.trim();
		const artistName = (
			value['artist'] as ArtistEntity | null
		)?.name?.trim();
		if (!name || !artistName || this.externalLoading()) {
			return;
		}
		this.externalLoading.set(true);
		this.externalError.set(null);
		try {
			const profile = await firstValueFrom(
				this.albumStateService.fetchExternalProfile$(artistName, name)
			);
			if (profile) {
				this.externalComparison.set(this.compare(profile));
			} else {
				this.externalError.set(
					`No album found for "${artistName} – ${name}".`
				);
			}
		} catch (error) {
			console.error(error);
			this.externalError.set('Loading album data failed.');
		} finally {
			this.externalLoading.set(false);
		}
	}

	public toggleExternalRow(field: AlbumExternalField): void {
		this.externalComparison.update(
			(comparison) =>
				comparison && {
					...comparison,
					rows: comparison.rows.map((row) =>
						row.field === field
							? { ...row, selected: !row.selected }
							: row
					),
				}
		);
	}

	public cancel(): void {
		this.returnNavigation.leave(['../../list'], this.activatedRoute);
	}

	public init$(): Observable<AlbumFormParams> {
		return this.activatedRoute.params.pipe(
			switchMap((data) =>
				combineLatest([
					this.albumStateService.selectEntityById$(data['albumId']),
					this.artistStateService.selectSearchResult$(),
					this.documentStateService.selectSearchResult$(),
				])
			),
			switchMap(([album, artists, documents]) => {
				this.album = album;
				// A withdrawn document is not offered as a cover any more.
				this.params = this.createAlbumParams(
					album,
					artists,
					liveDocuments(documents)
				);
				this.recheckName();

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchArtist(term: string): void {
		const searchParams: SearchParams =
			this.albumUtilService.createSearchParams(
				EntityTypeEnum.Artist,
				term
			);

		this.artistStateService.dispatchSearch(searchParams);
	}

	public searchDocument(term: string): void {
		const searchParams: SearchParams =
			this.albumUtilService.createSearchParams(
				EntityTypeEnum.Document,
				term
			);

		this.documentStateService.dispatchSearch(searchParams);
	}

	public submit(): void {
		if (this.album) {
			this.updateAlbum();
		} else {
			this.addAlbum();
		}

		this.returnNavigation.leave(['../../list'], this.activatedRoute);
	}

	private addAlbum(): void {
		const album: AlbumEntityAdd = this.componentUtil.createEntity(
			this.params.formGroup
		);

		this.albumStateService.dispatchAddEntityAction(album);
	}

	/**
	 * The fields the source knows, preselecting those the form lacks.
	 * Fields with the same value are left out.
	 */
	private compare(profile: AlbumExternalProfile): AlbumExternalComparison {
		const rows = EXTERNAL_FIELDS.map(({ field, labelKey }) => {
			const current = formatValue(this.params.formGroup.value[field]);
			const loaded = formatValue(profile[field]);

			return {
				current,
				field,
				labelKey,
				loaded,
				selected: !current && !!loaded,
				value: profile[field],
			};
		}).filter((row) => row.loaded && row.loaded !== row.current);

		return { rows, sourceUrl: profile.sourceUrl };
	}

	private createAlbumParams(
		album: AlbumEntity | undefined,
		artists: ArtistEntity[],
		documents: DocumentEntity[]
	): AlbumFormParams {
		const formGroup = this.albumUtilService.createFormGroup(album);

		formGroup.controls['name'].addValidators(
			uniqueCatalogName(
				() => this.takenAlbumNames(),
				() => this.album?.name ?? null
			)
		);
		// The title clashes within one artist, so changing the artist has to
		// ask the question again.
		formGroup.controls['artist'].valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.recheckName());
		formGroup.controls['name'].valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.recheckName());

		const albumFormParams: AlbumFormParams = {
			artists,
			documents,
			formatList: FormatList,
			formGroup,
			styleList: StyleList,
			isImagesTabActive: !!album,
		};

		return albumFormParams;
	}

	private updateAlbum(): void {
		const album: AlbumEntityUpdate = this.componentUtil.updateEntity(
			this.params.formGroup
		);

		this.albumStateService.dispatchUpdateEntityAction(album);
	}
}
