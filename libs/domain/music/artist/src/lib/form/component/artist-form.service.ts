import { combineLatest, firstValueFrom, Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
	activeGenres,
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate,
	ArtistExternalField,
	ArtistExternalIds,
	ArtistExternalProfile,
	ArtistExternalQuery,
	ArtistFormParams,
	ArtistStateService,
	ArtistUtilService,
	CountryList,
	DocumentEntity,
	DocumentStateService,
	EntityTypeEnum,
	GenreEntity,
	liveDocuments,
	ReturnNavigationService,
	SearchParams,
	StyleName,
	styleOptions,
	stylesOfGenre,
	toDiscogsArtistId,
	toMusicBrainzId,
} from '@music-collection/api';
import { isSameCatalogName } from '@music-collection/common/engine';
import { GenreEffect } from '@music-collection/domain/genre';
import {
	CatalogDuplicate,
	DUPLICATE_CATALOG_NAME,
	uniqueCatalogName,
} from '@music-collection/ui';

import {
	ArtistExternalCandidateRow,
	toCandidateRow,
} from './artist-external-candidate';

/** One field of the loaded profile next to the form's current value. */
export interface ArtistExternalRow {
	current: string;
	field: ArtistExternalField;
	labelKey: string;
	loaded: string;
	/** Whether the loaded value goes into the form on apply. */
	selected: boolean;
	value: unknown;
}

/**
 * The loaded profile against the form, and where it came from. A second link
 * appears where one source filled in what the other left empty.
 */
export interface ArtistExternalComparison {
	/** Page of the source that filled in the gaps; null when there was one. */
	fillerSourceUrl: string | null;
	rows: ArtistExternalRow[];
	sourceUrl: string;
}

const EXTERNAL_FIELDS: { field: ArtistExternalField; labelKey: string }[] = [
	{ field: 'name', labelKey: 'ui.artistForm.name' },
	{ field: 'artistType', labelKey: 'ui.artistForm.type' },
	{ field: 'country', labelKey: 'ui.artistForm.country' },
	{ field: 'formedIn', labelKey: 'ui.artistForm.formed-in' },
	{ field: 'styles', labelKey: 'ui.artistForm.styles' },
	{ field: 'description', labelKey: 'ui.artistForm.description' },
	{ field: 'imageUrl', labelKey: 'ui.artistForm.photo-url' },
	{ field: 'musicBrainzId', labelKey: 'ui.artistForm.musicbrainzId' },
	{ field: 'discogsArtistId', labelKey: 'ui.artistForm.discogsArtistId' },
];

/** No source has named the artist yet; the name is what a load searches on. */
const NO_IDS: ArtistExternalIds = {
	discogsArtistId: null,
	musicBrainzId: null,
};

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
	private destroyRef = inject(DestroyRef);
	private documentStateService = inject(DocumentStateService);
	private genreEffect = inject(GenreEffect);
	private returnNavigation = inject(ReturnNavigationService);
	private router = inject(Router);

	private artist!: ArtistEntity | undefined;
	/** Every artist of the catalog, for the duplicate check on the name. */
	private catalogArtists: ArtistEntity[] = [];
	private formGroup!: FormGroup;
	private params!: ArtistFormParams;
	/** The taxonomy as it was last read; what the style list is narrowed by. */
	private taxonomy: GenreEntity[] = [];
	private params$$: ReplaySubject<ArtistFormParams>;

	/** The artist this name collides with, blocking or not, or null. */
	public readonly duplicate = signal<CatalogDuplicate | null>(null);
	/** The namesakes to choose between; null while there is nothing to ask. */
	public readonly externalCandidates = signal<
		ArtistExternalCandidateRow[] | null
	>(null);
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
				this.recheckName();
			});
	}

	/**
	 * The names this artist would collide with — its own excluded, so that
	 * saving an artist unchanged is not a duplicate of itself.
	 */
	private takenArtists(): ArtistEntity[] {
		return this.catalogArtists.filter(
			(artist) => artist.uid !== this.artist?.uid
		);
	}

	private takenArtistNames(): string[] {
		return this.takenArtists().map((artist) => artist.name);
	}

	/**
	 * Asks the catalog about the name again and names what it collides with.
	 * The validator lets through the collision the artist arrived in, so the
	 * report carries both kinds and says which this one is: a blocking clash
	 * the admin can still type their way out of, or a settled one only a merge
	 * in the catalog can end.
	 */
	private recheckName(): void {
		const control = this.formGroup?.controls['name'];

		if (!control) {
			return;
		}

		control.updateValueAndValidity({ emitEvent: false });

		const name = String(control.value ?? '');
		const twin = this.takenArtists().find((artist) =>
			isSameCatalogName(artist.name, name)
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

	/**
	 * Opens the artist this name collides with, where the admin can see the
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

	/**
	 * Looks the artist up online. An id already in the form — MusicBrainz or
	 * Discogs — names the artist outright; without one the name is searched on,
	 * and the country and the styles already filled in rank the artists
	 * carrying that name. Where several do, the admin is asked which one theirs
	 * is rather than handed a guess: the id alone tells them nothing. The id of
	 * the match comes back as a row of its own, so the next load is spared the
	 * asking.
	 *
	 * The search asks MusicBrainz first and Discogs only where MusicBrainz
	 * knows nobody of the name, so the hits may come from either — which is why
	 * the load runs on whichever id the chosen hit carries.
	 */
	public async loadExternal(): Promise<void> {
		const name = (this.formGroup.value['name'] as string | null)?.trim();
		if (!name || this.externalLoading()) {
			return;
		}
		const ids = this.formIds();
		if (ids.musicBrainzId || ids.discogsArtistId) {
			await this.runExternal(() => this.loadProfile(name, ids));

			return;
		}

		await this.runExternal(async () => {
			const candidates = await firstValueFrom(
				this.artistStateService.searchExternalArtists$(
					this.externalQuery(name)
				)
			);

			if (candidates.length > 1) {
				this.externalCandidates.set(candidates.map(toCandidateRow));
			} else {
				await this.loadProfile(name, candidates[0] ?? NO_IDS);
			}
		});
	}

	/** Loads the artist the admin picked among the namesakes. */
	public async chooseExternalCandidate(
		candidate: ArtistExternalCandidateRow
	): Promise<void> {
		if (this.externalLoading()) {
			return;
		}
		this.externalCandidates.set(null);

		await this.runExternal(() =>
			this.loadProfile(candidate.name, candidate)
		);
	}

	public closeExternalCandidates(): void {
		this.externalCandidates.set(null);
	}

	/** What the form knows to search and rank the artists by. */
	private externalQuery(name: string): ArtistExternalQuery {
		return {
			country: this.formGroup.value['country'] ?? null,
			...this.formIds(),
			name,
			styles: this.formGroup.value['styles'] ?? [],
		};
	}

	/** The ids typed into the form, each read out of a link as well. */
	private formIds(): ArtistExternalIds {
		return {
			discogsArtistId: toDiscogsArtistId(
				this.formGroup.value['discogsArtistId']
			),
			musicBrainzId: toMusicBrainzId(
				this.formGroup.value['musicBrainzId']
			),
		};
	}

	/** The loaded profile against the form; the error says when there is none. */
	private async loadProfile(
		name: string,
		ids: ArtistExternalIds
	): Promise<void> {
		const profile = await firstValueFrom(
			this.artistStateService.fetchExternalProfile$({
				...this.externalQuery(name),
				...ids,
			})
		);

		if (profile) {
			this.externalComparison.set(this.compare(profile));
		} else {
			this.externalError.set(`No artist found for "${name}".`);
		}
	}

	/** One online step: the button waits on it and a failure is reported. */
	private async runExternal(step: () => Promise<void>): Promise<void> {
		this.externalLoading.set(true);
		this.externalError.set(null);
		try {
			await step();
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
					// Starts empty, so a taxonomy that cannot be read leaves
					// the form usable instead of blank.
					this.genreEffect.taxonomy$,
				])
			),
			switchMap(([artist, documents, taxonomy]) => {
				this.artist = artist;
				this.taxonomy = taxonomy;
				this.formGroup = this.artistUtilService.createFormGroup(artist);
				this.formGroup.controls['name'].addValidators(
					uniqueCatalogName(
						() => this.takenArtistNames(),
						() => this.artist?.name ?? null
					)
				);
				this.formGroup.controls['name'].valueChanges
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe(() => this.recheckName());
				this.recheckName();
				this.params = this.createArtistParams(
					this.formGroup,
					// A withdrawn document is not offered as a picture.
					liveDocuments(documents),
					!!artist
				);

				this.formGroup.controls['genre'].valueChanges
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe(() => this.genreChanged());

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
		const rows = EXTERNAL_FIELDS.map(({ field, labelKey }) => {
			const current = formatValue(this.formGroup.value[field]);
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

		return {
			fillerSourceUrl: profile.fillerSourceUrl,
			rows,
			sourceUrl: profile.sourceUrl,
		};
	}

	private createArtistParams(
		formGroup: FormGroup,
		documents: DocumentEntity[],
		isImagesTabActive: boolean
	): ArtistFormParams {
		const artistFormParams: ArtistFormParams = {
			countries: CountryList,
			documents,
			formGroup,
			genres: activeGenres(this.taxonomy),
			isImagesTabActive,
			styleList: this.styleList(formGroup),
		};

		return artistFormParams;
	}

	/**
	 * The styles the form offers: the chosen genre's, and whatever the artist
	 * already carries — a style saved before the taxonomy knew it would
	 * otherwise vanish from the list and be dropped by the next save.
	 */
	private styleList(formGroup: FormGroup): StyleName[] {
		return styleOptions(
			this.taxonomy,
			formGroup.value['genre'],
			formGroup.value['styles'] ?? []
		);
	}

	/**
	 * A genre picked by hand narrows the styles to that genre's, and lets go
	 * of those belonging to the genre before it: a style is a style *of* a
	 * genre, and keeping it would file the band under two.
	 */
	private genreChanged(): void {
		const genre = this.formGroup.value['genre'];
		const allowed = new Set(
			stylesOfGenre(this.taxonomy, genre).map((style) =>
				style.toLowerCase()
			)
		);
		const selected: StyleName[] = this.formGroup.value['styles'] ?? [];
		const kept = selected.filter((style) =>
			allowed.has(style.toLowerCase())
		);

		if (kept.length !== selected.length) {
			this.formGroup.controls['styles'].setValue(kept);
		}

		this.params = { ...this.params, styleList: this.styleList(this.formGroup) };
		this.params$$.next(this.params);
	}

	private updateArtist(): void {
		const artist: ArtistEntityUpdate = this.componentUtil.updateEntity(
			this.params.formGroup
		);

		this.artistStateService.dispatchUpdateEntityAction(artist);
	}
}
