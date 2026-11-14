import { of } from 'rxjs';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { ImageLibraryComponent } from '../../../component/image-library.component';
import {
	MusicCollectionEditStore,
	type UploadableField,
} from '../../music-collection-edit.store';
import { SceneGeneratorComponent } from '../../scene-generator/scene-generator.component';
import { CollectionImageUploadComponent } from '../collection-image-upload/collection-image-upload.component';

/**
 * The "looks" tab: the cover behind the collection — typed, uploaded,
 * picked from the library, or drawn on the scene pad right below.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-looks-panel',
	imports: [
		...I18N_IMPORTS,
		CollectionImageUploadComponent,
		ImageLibraryComponent,
		SceneGeneratorComponent,
	],
	templateUrl: './collection-looks-panel.component.html',
	styleUrl: './collection-looks-panel.component.scss',
})
export class CollectionLooksPanelComponent {
	protected readonly store = inject(MusicCollectionEditStore);

	protected value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}

	/** The chosen file on its way to Storage. */
	protected upload(field: UploadableField, file: File): void {
		this.store.uploadImage(of({ field, file }));
	}
}
