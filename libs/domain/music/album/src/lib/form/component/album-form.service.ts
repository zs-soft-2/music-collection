import { combineLatest, firstValueFrom, Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
	ReturnNavigationService,
	SearchParams,
	StyleList,
} from '@music-collection/api';

/** One field of the loaded album next to the form's current value. */
export interface AlbumExternalRow {
	current: string;
	field: AlbumExternalField;
	label: string;
	loaded: string;
	/** Whether the loaded value goes into the form on apply. */
	selected: boolean;
	value: unknown;
}

export interface AlbumExternalComparison {
	rows: AlbumExternalRow[];
	sourceUrl: string;
}

const EXTERNAL_FIELDS: { field: AlbumExternalField; label: string }[] = [
	{ field: 'name', label: 'Title' },
	{ field: 'format', label: 'Format' },
	{ field: 'year', label: 'Year' },
	{ field: 'styles', label: 'Styles' },
	{ field: 'coverImageUrl', label: 'Cover URL' },
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
	private documentStateService = inject(DocumentStateService);
	private returnNavigation = inject(ReturnNavigationService);

	private album!: AlbumEntity | undefined;
	private params!: AlbumFormParams;
	private params$$: ReplaySubject<AlbumFormParams>;

	public readonly externalComparison = signal<AlbumExternalComparison | null>(
		null
	);
	public readonly externalError = signal<string | null>(null);
	public readonly externalLoading = signal(false);

	public constructor() {
		this.params$$ = new ReplaySubject();
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
				this.params = this.createAlbumParams(album, artists, documents);

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
		const rows = EXTERNAL_FIELDS.map(({ field, label }) => {
			const current = formatValue(this.params.formGroup.value[field]);
			const loaded = formatValue(profile[field]);

			return {
				current,
				field,
				label,
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
