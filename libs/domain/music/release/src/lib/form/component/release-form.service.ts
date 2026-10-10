import { combineLatest, Observable, ReplaySubject, firstValueFrom } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FunctionsError } from '@angular/fire/functions';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
	AlbumEntity,
	AlbumStateService,
	ArtistEntity,
	ArtistStateService,
	DiscogsVersion,
	EntityTypeEnum,
	FormatDescriptionList,
	LabelEntity,
	LabelStateService,
	MediaList,
	ParamItem,
	QueryConstraintTypeEnum,
	QueryOperatorEnum,
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
	ReleaseExternalField,
	ReleaseExternalPressing,
	ReleaseFormParams,
	ReleaseStateService,
	ReleaseUtilService,
	ReturnNavigationService,
	SearchParams,
	discogsReleaseUrl,
} from '@music-collection/api';

import {
	countryOptions,
	toExternalPressing,
} from '../../data/service/release-discogs.mapper';

/** One field of the loaded pressing next to the form's current value. */
export interface ReleaseExternalRow {
	current: string;
	field: ReleaseExternalField;
	labelKey: string;
	loaded: string;
	/** Whether the loaded value goes into the form on apply. */
	selected: boolean;
	value: unknown;
}

/**
 * The pressing the admin picked against the form, and where it came from.
 * `labelName` is carried even where the catalog had no label of that name:
 * the admin is told what Discogs calls it rather than left with an empty
 * field and no reason for it.
 */
export interface ReleaseExternalComparison {
	labelMissing: string | null;
	rows: ReleaseExternalRow[];
	sourceUrl: string;
}

const EXTERNAL_FIELDS: { field: ReleaseExternalField; labelKey: string }[] = [
	{ field: 'name', labelKey: 'ui.releaseForm.name' },
	{ field: 'media', labelKey: 'ui.releaseForm.media' },
	{ field: 'country', labelKey: 'ui.releaseForm.country' },
	{
		field: 'formatDescription',
		labelKey: 'ui.releaseForm.format-description',
	},
	{ field: 'date', labelKey: 'ui.releaseForm.date' },
	{ field: 'label', labelKey: 'ui.releaseForm.label' },
	{ field: 'catno', labelKey: 'ui.releaseForm.catno' },
	{ field: 'discogsReleaseId', labelKey: 'ui.releaseForm.discogs-id' },
];

function formatValue(value: unknown): string {
	if (value === null || value === undefined || value === '') {
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
	// A label, in the form and in the loaded pressing alike, is a document;
	// what the admin compares is its name.
	if (typeof value === 'object' && 'name' in (value as object)) {
		return String((value as { name: unknown }).name ?? '');
	}

	return String(value);
}

function loadErrorMessage(error: unknown): string {
	const code = error instanceof FunctionsError ? error.code : null;

	if (code === 'functions/not-found') {
		return 'Discogs does not know this album.';
	}
	if (code === 'functions/resource-exhausted') {
		return 'Discogs is busy, try again in a minute.';
	}

	return 'Loading the pressings failed.';
}

@Injectable()
export class ReleaseFormService {
	private activatedRoute = inject(ActivatedRoute);
	private destroyRef = inject(DestroyRef);
	private releaseStateService = inject(ReleaseStateService);
	private releaseUtilService = inject(ReleaseUtilService);
	private albumStateService = inject(AlbumStateService);
	private artistStateService = inject(ArtistStateService);
	private componentUtil = inject(ReleaseUtilService);
	private labelStateService = inject(LabelStateService);
	private returnNavigation = inject(ReturnNavigationService);

	/** The catalog's labels, to put a Discogs label name on a document. */
	private catalogLabels: LabelEntity[] = [];
	private formGroup!: FormGroup;
	private params!: ReleaseFormParams;
	private params$$: ReplaySubject<ReleaseFormParams>;
	private release!: ReleaseEntity | undefined;

	/**
	 * The sleeve colour as the form holds it, for the swatch's label and
	 * the button that takes it off.
	 *
	 * A signal rather than a read of `formGroup.value` in the template: the
	 * app runs zoneless, and the picker writing to its control dirties the
	 * picker's own view and nothing above it. The form would go on saying
	 * "not set" over a colour the admin had already chosen.
	 */
	public readonly coverColor = signal<string | null>(null);
	public readonly externalComparison =
		signal<ReleaseExternalComparison | null>(null);
	public readonly externalError = signal<string | null>(null);
	public readonly externalLoading = signal(false);
	/** The album's pressings on Discogs; null while there is nothing to pick. */
	public readonly externalVersions = signal<DiscogsVersion[] | null>(null);

	public constructor() {
		this.params$$ = new ReplaySubject();

		// Asked for before a load needs them: the match happens the moment
		// the admin picks a pressing, and a list still on its way would
		// leave every label unmatched.
		this.labelStateService
			.selectEntities$()
			.pipe(takeUntilDestroyed())
			.subscribe((labels) => {
				if (!labels.length) {
					this.labelStateService.dispatchListEntitiesAction();
				}
				this.catalogLabels = labels;
			});
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

		// The country the pressing carries is rarely one of the four the
		// list starts with, so it is put on the list before it is set —
		// a select cannot hold a value it does not offer.
		this.params = {
			...this.params,
			countryList: countryOptions(
				this.params.formGroup.value['country'],
				patch['country'] as string | null
			),
		};
		this.params.formGroup.patchValue(patch);
		this.params.formGroup.markAsDirty();
		this.externalComparison.set(null);
		this.params$$.next(this.params);
	}

	public cancel(): void {
		this.returnNavigation.leave(['../../list'], this.activatedRoute);
	}

	/** The pressing the admin says this release is, against the form. */
	public chooseExternalVersion(version: DiscogsVersion): void {
		this.externalVersions.set(null);
		this.externalComparison.set(
			this.compare(toExternalPressing(version, this.catalogLabels))
		);
	}

	/**
	 * Takes the sleeve colour off the pressing. The picker has no empty
	 * state of its own — it always points at some colour — so saying "we do
	 * not know what this one looks like" needs a button.
	 */
	public clearCoverColor(): void {
		const control = this.params?.formGroup.get('coverColor');

		if (control && control.value !== null) {
			control.setValue(null);
			control.markAsDirty();
		}
	}

	public closeExternal(): void {
		this.externalComparison.set(null);
	}

	public closeExternalVersions(): void {
		this.externalVersions.set(null);
	}

	public init$(): Observable<ReleaseFormParams> {
		return this.activatedRoute.params.pipe(
			switchMap((data) =>
				combineLatest([
					this.releaseStateService.selectEntityById$(
						data['releaseId']
					),
					this.artistStateService.selectSearchResult$(),
					this.albumStateService.selectSearchResult$(),
					this.labelStateService.selectSearchResult$(),
				])
			),
			switchMap(([release, artists, albums, labels]) => {
				const isFirst = !this.formGroup;

				this.release = release;
				this.formGroup =
					this.releaseUtilService.createOrUpdateFormGroupForDisabling(
						this.formGroup,
						release,
						!!artists?.length,
						!release
					);

				if (isFirst) {
					this.watchCoverColor();
				}
				this.params = this.updateReleaseParams(
					this.params,
					artists,
					albums,
					labels,
					this.formGroup
				);

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	/**
	 * The album's pressings on Discogs, for the admin to pick this release
	 * out of. The album carries the Discogs master where it was imported
	 * from one; most of the catalog was seeded from elsewhere and carries
	 * none, so the title and the artist are searched on instead.
	 */
	public async loadExternal(): Promise<void> {
		const album = this.params.formGroup.value[
			'album'
		] as AlbumEntity | null;
		const artistName = this.artistName();

		if (!album?.name || !artistName || this.externalLoading()) {
			return;
		}

		this.externalLoading.set(true);
		this.externalError.set(null);

		try {
			const masterId =
				album.discogs?.masterId ??
				(await firstValueFrom(
					this.releaseStateService.findExternalMaster$(
						artistName,
						album.name
					)
				));

			if (!masterId) {
				this.externalError.set(
					`No Discogs album found for "${artistName} – ${album.name}".`
				);

				return;
			}

			const versions = await firstValueFrom(
				this.releaseStateService.listExternalVersions$(masterId)
			);

			if (versions.length) {
				this.externalVersions.set(versions);
			} else {
				this.externalError.set(
					'Discogs lists no pressing of this album.'
				);
			}
		} catch (error) {
			console.error(error);
			this.externalError.set(loadErrorMessage(error));
		} finally {
			this.externalLoading.set(false);
		}
	}

	public searchAlbum(term: string): void {
		const searchParams: SearchParams =
			this.releaseUtilService.createSearchParamsForAlbum(
				term,
				this.formGroup.value['artist']?.uid
			);

		this.albumStateService.dispatchSearch(searchParams);
	}

	public searchArtist(term: string): void {
		const searchParams: SearchParams = this.createSearchParams(
			EntityTypeEnum.Artist,
			term
		);

		this.artistStateService.dispatchSearch(searchParams);
	}

	public searchLabel(term: string): void {
		const searchParams: SearchParams = this.createSearchParams(
			EntityTypeEnum.Label,
			term
		);

		this.labelStateService.dispatchSearch(searchParams);
	}

	public submit(): void {
		if (this.release) {
			this.updateRelease();
		} else {
			this.addRelease();
		}

		this.returnNavigation.leave(['../../list'], this.activatedRoute);
	}

	public toggleExternalRow(field: ReleaseExternalField): void {
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

	/** Keeps `coverColor` on whatever the control holds, however it got there. */
	private watchCoverColor(): void {
		const control = this.formGroup.get('coverColor');

		if (!control) {
			return;
		}

		this.coverColor.set(control.value ?? null);
		control.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((value) => this.coverColor.set(value ?? null));
	}

	private addRelease(): void {
		const release: ReleaseEntityAdd = this.componentUtil.createEntity(
			this.params.formGroup
		);

		this.releaseStateService.dispatchAddEntityAction(release);
	}

	/**
	 * The artist the pressing is searched under: the one in the form, or —
	 * before an artist has been picked — the album's own.
	 */
	private artistName(): string | null {
		const artist = this.params.formGroup.value[
			'artist'
		] as ArtistEntity | null;
		const album = this.params.formGroup.value[
			'album'
		] as AlbumEntity | null;

		return artist?.name?.trim() || album?.artist?.name?.trim() || null;
	}

	/**
	 * The fields the pressing names, preselecting those the form lacks.
	 * Fields holding the same value are left out.
	 */
	private compare(
		pressing: ReleaseExternalPressing
	): ReleaseExternalComparison {
		const rows = EXTERNAL_FIELDS.map(({ field, labelKey }) => {
			const current = formatValue(this.params.formGroup.value[field]);
			const loaded = formatValue(pressing[field]);

			return {
				current,
				field,
				labelKey,
				loaded,
				selected: !current && !!loaded,
				value: pressing[field],
			};
		}).filter((row) => row.loaded && row.loaded !== row.current);

		return {
			labelMissing: pressing.label ? null : pressing.labelName,
			rows,
			sourceUrl: discogsReleaseUrl(pressing.discogsReleaseId),
		};
	}

	private createSearchParams(
		entityType: EntityTypeEnum,
		term: string
	): SearchParams {
		const query: ParamItem<string> = {
			queryConstraint: QueryConstraintTypeEnum.where,
			operation: QueryOperatorEnum.arrayContains,
			field: 'searchParameters',
			value: term.toLowerCase(),
		};

		const searchParams: SearchParams = [{ entityType, query }];

		return searchParams;
	}

	private updateRelease(): void {
		const release: ReleaseEntityUpdate = this.componentUtil.updateEntity(
			this.params.formGroup
		);

		this.releaseStateService.dispatchUpdateEntityAction(release);
	}

	private updateReleaseParams(
		params: ReleaseFormParams,
		artists: ArtistEntity[],
		albums: AlbumEntity[],
		labels: LabelEntity[],
		formGroup: FormGroup
	): ReleaseFormParams {
		let releaseFormParams: ReleaseFormParams;

		if (!params) {
			releaseFormParams = {
				artists,
				albums,
				// The pressing being edited may carry a country the short
				// list never had; it is an option here so the select shows
				// it instead of reading as empty.
				countryList: countryOptions(formGroup.value['country']),
				formGroup,
				formatDescriptionList: FormatDescriptionList,
				labels,
				mediaList: MediaList,
			};
		} else {
			params.artists = artists;
			params.albums = albums;
			params.formGroup = formGroup;
			params.labels = labels;

			releaseFormParams = params;
		}

		return releaseFormParams;
	}
}
