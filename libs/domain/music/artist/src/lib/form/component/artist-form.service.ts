import { combineLatest, firstValueFrom, Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
	ARTIST_TYPE_OPTIONS,
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate,
	ArtistExternalField,
	ArtistExternalProfile,
	ArtistFormParams,
	ArtistStateService,
	ArtistUtilService,
	CountryList,
	DocumentEntity,
	DocumentStateService,
	EntityTypeEnum,
	ReturnNavigationService,
	SearchParams,
	StyleList,
} from '@music-collection/api';
import { uniqueCatalogName } from '@music-collection/ui';

/** One field of the loaded profile next to the form's current value. */
export interface ArtistExternalRow {
	current: string;
	field: ArtistExternalField;
	label: string;
	loaded: string;
	/** Whether the loaded value goes into the form on apply. */
	selected: boolean;
	value: unknown;
}

export interface ArtistExternalComparison {
	rows: ArtistExternalRow[];
	sourceUrl: string;
}

const EXTERNAL_FIELDS: { field: ArtistExternalField; label: string }[] = [
	{ field: 'name', label: 'Name' },
	{ field: 'artistType', label: 'Type' },
	{ field: 'country', label: 'Country' },
	{ field: 'formedIn', label: 'Formed in' },
	{ field: 'styles', label: 'Styles' },
	{ field: 'description', label: 'Description' },
	{ field: 'imageUrl', label: 'Photo URL' },
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
export class ArtistFormService {
	private activatedRoute = inject(ActivatedRoute);
	private artistStateService = inject(ArtistStateService);
	private artistUtilService = inject(ArtistUtilService);
	private componentUtil = inject(ArtistUtilService);
	private documentStateService = inject(DocumentStateService);
	private returnNavigation = inject(ReturnNavigationService);

	private artist!: ArtistEntity | undefined;
	/** Every artist of the catalog, for the duplicate check on the name. */
	private catalogArtists: ArtistEntity[] = [];
	private formGroup!: FormGroup;
	private params!: ArtistFormParams;
	private params$$: ReplaySubject<ArtistFormParams>;

	public readonly externalComparison =
		signal<ArtistExternalComparison | null>(null);
	public readonly externalError = signal<string | null>(null);
	public readonly externalLoading = signal(false);

	public constructor() {
		this.params$$ = new ReplaySubject();

		// The catalog may arrive after the form is on screen, so the name is
		// checked again once it does.
		this.artistStateService
			.selectEntities$()
			.pipe(takeUntilDestroyed())
			.subscribe((artists) => {
				if (!artists.length) {
					this.artistStateService.dispatchListEntitiesAction();
				}
				this.catalogArtists = artists;
				this.formGroup?.controls['name'].updateValueAndValidity();
			});
	}

	/**
	 * The names this artist would collide with — its own excluded, so that
	 * saving an artist unchanged is not a duplicate of itself.
	 */
	private takenArtistNames(): string[] {
		return this.catalogArtists
			.filter((artist) => artist.uid !== this.artist?.uid)
			.map((artist) => artist.name);
	}

	public cancel(): void {
		this.returnNavigation.leave(['../../list'], this.activatedRoute);
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
		this.formGroup.patchValue(patch);
		this.formGroup.markAsDirty();
		this.externalComparison.set(null);
		this.params$$.next(this.params);
	}

	public closeExternal(): void {
		this.externalComparison.set(null);
	}

	/** Looks the artist up online by the name in the form. */
	public async loadExternal(): Promise<void> {
		const name = (this.formGroup.value['name'] as string | null)?.trim();
		if (!name || this.externalLoading()) {
			return;
		}
		this.externalLoading.set(true);
		this.externalError.set(null);
		try {
			const profile = await firstValueFrom(
				this.artistStateService.fetchExternalProfile$(name)
			);
			if (profile) {
				this.externalComparison.set(this.compare(profile));
			} else {
				this.externalError.set(`No artist found for "${name}".`);
			}
		} catch (error) {
			console.error(error);
			this.externalError.set('Loading artist data failed.');
		} finally {
			this.externalLoading.set(false);
		}
	}

	public toggleExternalRow(field: ArtistExternalField): void {
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

	public init$(): Observable<ArtistFormParams> {
		return this.activatedRoute.params.pipe(
			switchMap((data) =>
				combineLatest([
					this.artistStateService.selectEntityById$(data['artistId']),
					this.documentStateService.selectSearchResult$(),
				])
			),
			switchMap(([artist, documents]) => {
				this.artist = artist;
				this.formGroup = this.artistUtilService.createFormGroup(artist);
				this.formGroup.controls['name'].addValidators(
					uniqueCatalogName(() => this.takenArtistNames())
				);
				this.formGroup.controls['name'].updateValueAndValidity();
				this.params = this.createArtistParams(
					this.formGroup,
					documents,
					!!artist
				);

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public mainImageUpload(file: File): void {
		console.log(file);
	}

	public searchDocument(term: string): void {
		const searchParams: SearchParams =
			this.artistUtilService.createSearchParams(
				EntityTypeEnum.Document,
				term
			);
		this.documentStateService.dispatchSearch(searchParams);
	}

	public submit(): void {
		if (this.artist) {
			this.updateArtist();
		} else {
			this.addArtist();
		}

		this.returnNavigation.leave(['../../list'], this.activatedRoute);
	}

	private addArtist(): void {
		const artist: ArtistEntityAdd = this.componentUtil.createEntity(
			this.params.formGroup
		);

		this.artistStateService.dispatchAddEntityAction(artist);
	}

	/**
	 * The fields the source knows, preselecting those the form lacks.
	 * Fields with the same value are left out.
	 */
	private compare(profile: ArtistExternalProfile): ArtistExternalComparison {
		const rows = EXTERNAL_FIELDS.map(({ field, label }) => {
			const current = formatValue(this.formGroup.value[field]);
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

	private createArtistParams(
		formGroup: FormGroup,
		documents: DocumentEntity[],
		isImagesTabActive: boolean
	): ArtistFormParams {
		const artistFormParams: ArtistFormParams = {
			artistTypes: ARTIST_TYPE_OPTIONS,
			countries: CountryList,
			documents,
			formGroup,
			isImagesTabActive,
			styleList: StyleList,
		};

		return artistFormParams;
	}

	private updateArtist(): void {
		const artist: ArtistEntityUpdate = this.componentUtil.updateEntity(
			this.params.formGroup
		);

		this.artistStateService.dispatchUpdateEntityAction(artist);
	}
}
