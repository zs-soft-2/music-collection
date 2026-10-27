import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CollectionView } from '../collection-view';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-view-toggle',
	imports: [...I18N_IMPORTS],
	templateUrl: './collection-view-toggle.component.html',
	styleUrls: ['./collection-view-toggle.component.scss'],
})
export class CollectionViewToggleComponent {
	public readonly view = model.required<CollectionView>();

	public readonly options: {
		value: CollectionView;
		labelKey: string;
		icon: string;
	}[] = [
		{
			value: 'table',
			labelKey: 'ui.collectionViewToggle.table',
			icon: 'pi pi-list',
		},
		{
			value: 'cards',
			labelKey: 'ui.collectionViewToggle.cards',
			icon: 'pi pi-th-large',
		},
	];
}
