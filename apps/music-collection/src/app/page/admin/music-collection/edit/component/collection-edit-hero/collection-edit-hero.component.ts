import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	type CollectionForm,
	VISIBILITY_OPTIONS,
} from '../../../music-collection-admin.model';

/**
 * The head of the editor: the collection as it will be seen, not the form.
 * The cover stands blurred behind it, and the pills say what counts once it
 * is saved — whether it is published, who sees it, and how many records it
 * catches.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-edit-hero',
	imports: [...I18N_IMPORTS],
	templateUrl: './collection-edit-hero.component.html',
	styleUrl: './collection-edit-hero.component.scss',
})
export class CollectionEditHeroComponent {
	public readonly form = input.required<CollectionForm>();
	public readonly isNew = input(false);
	/** While loading only the title stands; the pills would be guesses. */
	public readonly isLoading = input(false);
	public readonly previewTotal = input(0);

	/** A láthatóság szava a címkéhez, a legördülővel egy forrásból. */
	protected readonly visibilityLabel = computed(() => {
		const visibility = this.form().visibility;

		return (
			VISIBILITY_OPTIONS.find((one) => one.value === visibility) ??
			VISIBILITY_OPTIONS[0]
		).labelKey;
	});
}
