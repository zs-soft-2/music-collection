import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	GROUP_OPTIONS,
	SORT_OPTIONS,
	VIEW_OPTIONS,
} from '../../../collection/collection.model';
import { ProfilePageStore } from '../../profile-page.store';

/**
 * How the lists are laid out: what the collection page opens with, and how
 * much of an album page shows at once. The pages themselves keep these
 * switches too — this is where they can be set without going there first.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-lists',
	imports: [...I18N_IMPORTS],
	template: `
		<ng-container *transloco="let t">
			<fieldset>
				<legend>{{ t('page.profile.listSettings.order') }}</legend>
				@for (option of sorts; track option.value) {
					<button
						type="button"
						[class.selected]="
							store.collectionView().sort === option.value
						"
						(click)="
							store.setCollectionView({ sort: option.value })
						"
					>
						{{ t(option.labelKey) }}
					</button>
				}
			</fieldset>

			<fieldset>
				<legend>{{ t('page.profile.listSettings.grouping') }}</legend>
				@for (option of groups; track option.value) {
					<button
						type="button"
						[class.selected]="
							store.collectionView().group === option.value
						"
						(click)="
							store.setCollectionView({ group: option.value })
						"
					>
						{{ t(option.labelKey) }}
					</button>
				}
			</fieldset>

			<fieldset>
				<legend>{{ t('page.profile.listSettings.view') }}</legend>
				@for (option of views; track option.value) {
					<button
						type="button"
						[class.selected]="
							store.collectionView().view === option.value
						"
						(click)="
							store.setCollectionView({ view: option.value })
						"
					>
						<i class="{{ option.icon }}" aria-hidden="true"></i>
						{{ t(option.labelKey) }}
					</button>
				}
			</fieldset>

			<label class="switch">
				<input
					type="checkbox"
					[checked]="store.albumCompact()"
					(change)="store.setAlbumCompact(!store.albumCompact())"
				/>
				{{ t('page.profile.listSettings.albumCompact') }}
			</label>
		</ng-container>
	`,
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			gap: 1.25rem;
		}

		fieldset {
			display: flex;
			flex-wrap: wrap;
			gap: 0.4rem;
			padding: 0;
			margin: 0;
			border: 0;
		}

		legend {
			padding: 0;
			margin-bottom: 0.5rem;
			font-size: 0.75rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		button {
			display: inline-flex;
			align-items: center;
			gap: 0.4rem;
			padding: 0.45rem 0.85rem;
			font: inherit;
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
			background: var(--mc-surface-2);
			border: 1px solid transparent;
			border-radius: 999px;
			cursor: pointer;

			&:hover {
				color: var(--mc-text);
			}

			&.selected {
				color: var(--mc-text);
				border-color: var(--mc-primary);
			}
		}

		.switch {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			font-size: 0.875rem;
			color: var(--mc-text-muted);
			cursor: pointer;

			input {
				accent-color: var(--mc-primary);
			}
		}
	`,
})
export class ProfileListsComponent {
	protected readonly store = inject(ProfilePageStore);

	protected readonly sorts = SORT_OPTIONS;
	protected readonly groups = GROUP_OPTIONS;
	protected readonly views = VIEW_OPTIONS;
}
