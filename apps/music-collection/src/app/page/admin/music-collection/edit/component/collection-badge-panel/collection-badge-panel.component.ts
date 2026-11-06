import { of } from 'rxjs';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { ImageLibraryComponent } from '../../../component/image-library.component';
import {
	MusicCollectionEditStore,
	type UploadableField,
} from '../../music-collection-edit.store';
import { CollectionBadgePinComponent } from '../collection-badge-pin/collection-badge-pin.component';
import { CollectionImageUploadComponent } from '../collection-image-upload/collection-image-upload.component';

/**
 * The "badge" tab: the badge's words and hand-made artwork; the pin, which
 * is the server's gallery rather than a field, sits in its own component at
 * the end.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-badge-panel',
	imports: [
		...I18N_IMPORTS,
		CollectionBadgePinComponent,
		CollectionImageUploadComponent,
		ImageLibraryComponent,
	],
	templateUrl: './collection-badge-panel.component.html',
	styleUrl: './collection-badge-panel.component.scss',
})
export class CollectionBadgePanelComponent {
	protected readonly store = inject(MusicCollectionEditStore);

	protected value(event: Event): string {
		return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
	}

	/** The chosen file on its way to Storage. */
	protected upload(field: UploadableField, file: File): void {
		this.store.uploadImage(of({ field, file }));
	}
}
