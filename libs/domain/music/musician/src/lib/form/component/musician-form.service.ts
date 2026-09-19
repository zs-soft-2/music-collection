import {
	Observable,
	filter,
	first,
	firstValueFrom,
	map,
	of,
	switchMap,
} from 'rxjs';

import { Injectable, inject, signal } from '@angular/core';
import { FunctionsError } from '@angular/fire/functions';
import { ActivatedRoute } from '@angular/router';
import {
	MusicianEntity,
	MusicianExternalField,
	MusicianExternalProfile,
	MusicianFormParams,
	MusicianStateService,
	MusicianUtilService,
	ReturnNavigationService,
	discogsArtistUrl,
} from '@music-collection/api';

/** One field of the loaded profile next to the form's current value. */
export interface MusicianExternalRow {
	current: string;
	field: MusicianExternalField;
	label: string;
	loaded: string;
	/** Whether the loaded value goes into the form on apply. */
	selected: boolean;
	/** The loaded value in the form control's shape. */
	value: unknown;
}

export interface MusicianExternalComparison {
	rows: MusicianExternalRow[];
	sourceUrl: string;
}

const EXTERNAL_FIELDS: { field: MusicianExternalField; label: string }[] = [
	{ field: 'name', label: 'Name' },
	{ field: 'realName', label: 'Real name' },
	{ field: 'description', label: 'Biography' },
	{ field: 'imageUrl', label: 'Portrait URL' },
	{ field: 'sites', label: 'Links' },
	{ field: 'aliases', label: 'Also known as' },
	{ field: 'nameVariations', label: 'Name variations' },
];

/** Links and aliases are edited one per line in a textarea. */
const LINE_FIELDS: MusicianExternalField[] = ['sites', 'aliases'];

function formatValue(value: unknown): string {
	if (Array.isArray(value)) {
		return value.join('\n');
	}

	return typeof value === 'string' ? value.trim() : '';
}

function loadErrorMessage(error: unknown, discogsId: number): string {
	const code = error instanceof FunctionsError ? error.code : null;

	if (code === 'functions/not-found') {
		return `No Discogs artist with id ${discogsId}.`;
	}
	if (code === 'functions/resource-exhausted') {
		return 'Discogs is busy, try again in a minute.';
	}

	return 'Loading musician data failed.';
}

@Injectable()
export class MusicianFormService {
	private activatedRoute = inject(ActivatedRoute);
	private musicianStateService = inject(MusicianStateService);
	private musicianUtilService = inject(MusicianUtilService);
	private returnNavigation = inject(ReturnNavigationService);

	private musician: MusicianEntity | undefined;
	private params!: MusicianFormParams;

	public readonly externalComparison =
		signal<MusicianExternalComparison | null>(null);
	public readonly externalError = signal<string | null>(null);
	public readonly externalLoading = signal(false);

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
	}

	public cancel(): void {
		this.returnNavigation.leave(['../../list'], this.activatedRoute);
	}

	public closeExternal(): void {
		this.externalComparison.set(null);
	}

	public init$(): Observable<MusicianFormParams> {
		return this.activatedRoute.params.pipe(
			// Read once: a later store update must not reset the edited form.
			switchMap((data) =>
				data['musicianId'] === '0'
					? of(undefined)
					: this.musicianStateService
							.selectEntityById$(data['musicianId'])
							.pipe(
								filter((musician) => !!musician),
								first()
							)
			),
			map((musician) => {
				this.musician = musician;
				this.params = {
					formGroup:
						this.musicianUtilService.createFormGroup(musician),
				};

				return this.params;
			})
		);
	}

	/** Loads the Discogs profile of the id in the form. */
	public async loadExternal(): Promise<void> {
		const discogsId = Number(this.params.formGroup.value['discogsId']);
		if (
			!Number.isSafeInteger(discogsId) ||
			discogsId <= 0 ||
			this.externalLoading()
		) {
			return;
		}
		this.externalLoading.set(true);
		this.externalError.set(null);
		try {
			const profile = await firstValueFrom(
				this.musicianStateService.fetchExternalProfile$(discogsId)
			);
			this.externalComparison.set(this.compare(profile));
		} catch (error) {
			console.error(error);
			this.externalError.set(loadErrorMessage(error, discogsId));
		} finally {
			this.externalLoading.set(false);
		}
	}

	public submit(): void {
		if (this.musician) {
			this.musicianStateService.dispatchUpdateEntityAction(
				this.musicianUtilService.updateEntity(this.params.formGroup)
			);
		} else {
			this.musicianStateService.dispatchAddEntityAction(
				this.musicianUtilService.createEntity(this.params.formGroup)
			);
		}

		this.returnNavigation.leave(['../../list'], this.activatedRoute);
	}

	public toggleExternalRow(field: MusicianExternalField): void {
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

	/**
	 * The fields Discogs knows, preselecting those the form lacks.
	 * Fields with the same value are left out.
	 */
	private compare(
		profile: MusicianExternalProfile
	): MusicianExternalComparison {
		const formValue = this.params.formGroup.value;
		const rows = EXTERNAL_FIELDS.map(({ field, label }) => {
			const current = formatValue(formValue[field]);
			const loaded = formatValue(profile[field]);

			return {
				current,
				field,
				label,
				loaded,
				selected: !current && !!loaded,
				value: LINE_FIELDS.includes(field) ? loaded : profile[field],
			};
		}).filter((row) => row.loaded && row.loaded !== row.current);

		return { rows, sourceUrl: discogsArtistUrl(profile.id) };
	}
}
