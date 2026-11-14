import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	type CollectionForm,
	GROUP_OPTIONS,
	STATUS_OPTIONS,
	VISIBILITY_OPTIONS,
} from '../../../music-collection-admin.model';
import { MusicCollectionEditStore } from '../../music-collection-edit.store';

/**
 * The "basics" tab: what the collection is called, where it lives and who
 * sees it. It writes straight into the editor's store, which the page
 * provides; the fields carry no state of their own.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-basics-panel',
	imports: [...I18N_IMPORTS],
	templateUrl: './collection-basics-panel.component.html',
	styleUrl: './collection-basics-panel.component.scss',
})
export class CollectionBasicsPanelComponent {
	protected readonly store = inject(MusicCollectionEditStore);

	protected readonly statusOptions = STATUS_OPTIONS;
	protected readonly visibilityOptions = VISIBILITY_OPTIONS;
	protected readonly groupOptions = GROUP_OPTIONS;

	/** The definitions a collection may sit under — never itself. */
	protected parents(): { uid: string; name: string }[] {
		const uid = this.store.uid();

		return this.store.parents().filter((parent) => parent.uid !== uid);
	}

	protected value(event: Event): string {
		return (event.target as HTMLInputElement | HTMLSelectElement).value;
	}

	protected onVisibility(event: Event): void {
		this.store.setField({
			visibility: this.value(event) as CollectionForm['visibility'],
		});
	}

	protected onParent(event: Event): void {
		this.store.setField({ parentUid: this.value(event) });
	}

	protected onGroup(event: Event): void {
		this.store.setField({
			group: this.value(event) as CollectionForm['group'],
		});
	}
}
