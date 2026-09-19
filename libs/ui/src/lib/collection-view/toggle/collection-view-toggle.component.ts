import { ChangeDetectionStrategy, Component, model } from '@angular/core';

import { CollectionView } from '../collection-view';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-view-toggle',
	templateUrl: './collection-view-toggle.component.html',
	styleUrls: ['./collection-view-toggle.component.scss'],
})
export class CollectionViewToggleComponent {
	public readonly view = model.required<CollectionView>();

	public readonly options: {
		value: CollectionView;
		label: string;
		icon: string;
	}[] = [
		{ value: 'table', label: 'Table', icon: 'pi pi-list' },
		{ value: 'cards', label: 'Cards', icon: 'pi pi-th-large' },
	];
}
