import {
	Observable,
	ReplaySubject,
	filter,
	first,
	firstValueFrom,
	of,
	switchMap,
} from 'rxjs';

import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FunctionsError } from '@angular/fire/functions';
import { ActivatedRoute } from '@angular/router';
import {
	EntityTypeEnum,
	LabelEntity,
	LabelEntityAdd,
	LabelEntityUpdate,
	LabelExternalCandidate,
	LabelExternalField,
	LabelExternalProfile,
	LabelFormParams,
	LabelStateService,
	LabelUtilService,
	ReturnNavigationService,
	SearchParams,
	discogsLabelUrl,
} from '@music-collection/api';

/** One field of the loaded profile next to the form's current value. */
export interface LabelExternalRow {
	current: string;
	field: LabelExternalField;
	labelKey: string;
	loaded: string;
	/** Whether the loaded value goes into the form on apply. */
	selected: boolean;
	/** The loaded value in the form control's shape. */
	value: unknown;
}

export interface LabelExternalComparison {
	/**
	 * The parent label on Discogs, when it names one. Only shown: the
	 * catalog may not have that label, so the parent stays a manual pick.
	 */
	parentName: string | null;
	rows: LabelExternalRow[];
	sourceUrl: string;
}

const EXTERNAL_FIELDS: { field: LabelExternalField; labelKey: string }[] = [
	{ field: 'name', labelKey: 'ui.labelForm.name' },
	{ field: 'description', labelKey: 'ui.labelForm.profile' },
	{ field: 'imageUrl', labelKey: 'ui.labelForm.logo-url' },
	{ field: 'sites', labelKey: 'ui.labelForm.links' },
	{ field: 'discogsId', labelKey: 'ui.labelForm.discogs-id' },
];

/** Links are edited one per line in a textarea. */
const LINE_FIELDS: LabelExternalField[] = ['sites'];

function formatValue(value: unknown): string {
	if (Array.isArray(value)) {
		return value.join('\n');
	}
	if (typeof value === 'number') {
		return String(value);
	}

	return typeof value === 'string' ? value.trim() : '';
}

function loadErrorMessage(error: unknown): string {
	const code = error instanceof FunctionsError ? error.code : null;

	if (code === 'functions/not-found') {
		return 'Discogs does not know this label.';
	}
	if (code === 'functions/resource-exhausted') {
		return 'Discogs is busy, try again in a minute.';
	}

	return 'Loading label data failed.';
}

@Injectable()
export class LabelFormService {
	private activatedRoute = inject(ActivatedRoute);
	private labelStateService = inject(LabelStateService);
	private labelUtilService = inject(LabelUtilService);
	private componentUtil = inject(LabelUtilService);
	private returnNavigation = inject(ReturnNavigationService);

	private label!: LabelEntity | undefined;
	private params!: LabelFormParams;
	private params$$: ReplaySubject<LabelFormParams>;

	/** The labels of the searched name; null while there is nothing to ask. */
	public readonly externalCandidates = signal<
		LabelExternalCandidate[] | null
	>(null);
	public readonly externalComparison = signal<LabelExternalComparison | null>(
		null
	);
	public readonly externalError = signal<string | null>(null);
	public readonly externalLoading = signal(false);

	public constructor() {
		this.params$$ = new ReplaySubject();

		// The parent label suggestions arrive on their own; the form group
		// stays the one built for the edited label, so a search must not
		// throw away what has been typed or loaded into it.
		this.labelStateService
			.selectSearchResult$()
			.pipe(takeUntilDestroyed())
			.subscribe((labels) => {
				if (!this.params) {
					return;
				}
				this.params = { ...this.params, labels };
				this.params$$.next(this.params);
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
		this.params.formGroup.patchValue(patch);
		this.params.formGroup.markAsDirty();
		this.externalComparison.set(null);
	}

	public cancel(): void {
		this.returnNavigation.leave(['../../list'], this.activatedRoute);
	}

	/** Loads the label the admin picked among the ones sharing a name. */
	public async chooseExternalCandidate(
		candidate: LabelExternalCandidate
	): Promise<void> {
		if (this.externalLoading()) {
			return;
		}
		this.externalCandidates.set(null);

		await this.runExternal(() => this.loadProfile(candidate.discogsId));
	}

	public closeExternal(): void {
		this.externalComparison.set(null);
	}

	public closeExternalCandidates(): void {
		this.externalCandidates.set(null);
	}

	public init$(): Observable<LabelFormParams> {
		return this.activatedRoute.params.pipe(
			// Read once: a later store update must not reset the edited form.
			switchMap((data) =>
				data['labelId'] === '0'
					? of(undefined)
					: this.labelStateService
							.selectEntityById$(data['labelId'])
							.pipe(
								filter((label) => !!label),
								first()
							)
			),
			switchMap((label) => {
				this.label = label;
				this.params = {
					formGroup: this.labelUtilService.createFormGroup(label),
					labels: [],
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	/**
	 * Loads the label from Discogs. The Discogs id in the form names it
	 * outright; without one the name is searched on, because the catalog's
	 * labels come from releases and carry no id. Where several labels share
	 * the name the admin is asked which one theirs is rather than handed a
	 * guess; the id of the pick comes back as a row, so the next load is
	 * spared the asking.
	 */
	public async loadExternal(): Promise<void> {
		if (this.externalLoading()) {
			return;
		}

		const discogsId = Number(this.params.formGroup.value['discogsId']);

		if (Number.isSafeInteger(discogsId) && discogsId > 0) {
			await this.runExternal(() => this.loadProfile(discogsId));

			return;
		}

		const name = String(this.params.formGroup.value['name'] ?? '').trim();

		if (!name) {
			return;
		}

		await this.runExternal(async () => {
			const candidates = await firstValueFrom(
				this.labelStateService.searchExternalLabels$(name)
			);

			if (candidates.length > 1) {
				this.externalCandidates.set(candidates);
			} else if (candidates.length === 1) {
				await this.loadProfile(candidates[0].discogsId);
			} else {
				this.externalError.set(`No Discogs label found for "${name}".`);
			}
		});
	}

	public searchLabel(term: string): void {
		const searchParams: SearchParams =
			this.labelUtilService.createSearchParams(
				EntityTypeEnum.Label,
				term
			);

		this.labelStateService.dispatchSearch(searchParams);
	}

	public submit(): void {
		if (this.label) {
			this.updateLabel();
		} else {
			this.addLabel();
		}

		this.returnNavigation.leave(['../../list'], this.activatedRoute);
	}

	public toggleExternalRow(field: LabelExternalField): void {
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

	private addLabel(): void {
		const label: LabelEntityAdd = this.componentUtil.createEntity(
			this.params.formGroup
		);

		this.labelStateService.dispatchAddEntityAction(label);
	}

	/**
	 * The fields Discogs knows, preselecting those the form lacks.
	 * Fields with the same value are left out.
	 */
	private compare(profile: LabelExternalProfile): LabelExternalComparison {
		const formValue = this.params.formGroup.value;
		const rows = EXTERNAL_FIELDS.map(({ field, labelKey }) => {
			const current = formatValue(formValue[field]);
			const loaded = formatValue(profile[field]);

			return {
				current,
				field,
				labelKey,
				loaded,
				selected: !current && !!loaded,
				value: LINE_FIELDS.includes(field) ? loaded : profile[field],
			};
		}).filter((row) => row.loaded && row.loaded !== row.current);

		return {
			parentName: profile.parentName,
			rows,
			sourceUrl: discogsLabelUrl(profile.discogsId),
		};
	}

	/** The loaded profile against the form. */
	private async loadProfile(discogsId: number): Promise<void> {
		const profile = await firstValueFrom(
			this.labelStateService.fetchExternalProfile$(discogsId)
		);

		this.externalComparison.set(this.compare(profile));
	}

	/** One online step: the button waits on it and a failure is reported. */
	private async runExternal(step: () => Promise<void>): Promise<void> {
		this.externalLoading.set(true);
		this.externalError.set(null);
		try {
			await step();
		} catch (error) {
			console.error(error);
			this.externalError.set(loadErrorMessage(error));
		} finally {
			this.externalLoading.set(false);
		}
	}

	private updateLabel(): void {
		const label: LabelEntityUpdate = this.componentUtil.updateEntity(
			this.params.formGroup
		);

		this.labelStateService.dispatchUpdateEntityAction(label);
	}
}
