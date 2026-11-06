import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	type CriteriaForm,
	ENUM_CRITERIA,
	ENUM_OPERATOR_OPTIONS,
	type EnumOperator,
} from '../../../music-collection-admin.model';
import { EntityPickerComponent } from '../../../component/entity-picker.component';
import { MusicCollectionEditStore } from '../../music-collection-edit.store';

type EnumCriterion = (typeof ENUM_CRITERIA)[number];
type EnumCriterionKey = EnumCriterion['key'];

/**
 * The "rule" tab: the filters a record has to pass to belong to the
 * collection. Every change goes to the store as a whole criteria form; the
 * preview beside the tabs resolves it from there.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-rule-panel',
	imports: [...I18N_IMPORTS, EntityPickerComponent],
	templateUrl: './collection-rule-panel.component.html',
	styleUrl: './collection-rule-panel.component.scss',
})
export class CollectionRulePanelComponent {
	protected readonly store = inject(MusicCollectionEditStore);

	protected readonly enumCriteria = ENUM_CRITERIA;
	protected readonly operatorOptions = ENUM_OPERATOR_OPTIONS;

	/**
	 * What a criterion offers: the list the code knows, or — for the styles —
	 * the taxonomy's, which arrives with the page rather than with the build.
	 */
	protected options(criterion: EnumCriterion): readonly string[] {
		return criterion.options ?? this.store.styles();
	}

	protected onYear(key: 'yearFrom' | 'yearTo', event: Event): void {
		const raw = this.value(event).trim();

		this.patchCriteria({ [key]: raw ? Number(raw) : null });
	}

	protected onOperator(key: EnumCriterionKey, event: Event): void {
		const criteria = this.store.form().criteria;

		this.patchCriteria({
			[key]: {
				...criteria[key],
				operator: this.value(event) as EnumOperator,
			},
		});
	}

	protected onValues(key: EnumCriterionKey, event: Event): void {
		const criteria = this.store.form().criteria;

		this.patchCriteria({
			[key]: { ...criteria[key], values: this.selected(event) },
		});
	}

	protected onCriteria(patch: Partial<CriteriaForm>): void {
		this.patchCriteria(patch);
	}

	/** Free text, because a Discogs role is free text. */
	protected onRoles(event: Event): void {
		this.patchCriteria({
			creditRoles: this.value(event)
				.split(',')
				.map((role) => role.trim())
				.filter(Boolean),
		});
	}

	private value(event: Event): string {
		return (event.target as HTMLInputElement | HTMLSelectElement).value;
	}

	private selected(event: Event): string[] {
		return Array.from(
			(event.target as HTMLSelectElement).selectedOptions
		).map((option) => option.value);
	}

	private patchCriteria(patch: Partial<CriteriaForm>): void {
		this.store.setCriteria({ ...this.store.form().criteria, ...patch });
	}
}
