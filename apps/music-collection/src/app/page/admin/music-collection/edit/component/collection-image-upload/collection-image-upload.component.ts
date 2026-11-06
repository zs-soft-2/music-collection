import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

/**
 * The two ways a picture field is filled without typing an address: a fresh
 * upload, or one from the library. The cover and the badge artwork share
 * it; what the field does with the file is the caller's business, and
 * whatever it projects (a thumbnail) stands at the end of the row.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-image-upload',
	imports: [...I18N_IMPORTS],
	templateUrl: './collection-image-upload.component.html',
	styleUrl: './collection-image-upload.component.scss',
})
export class CollectionImageUploadComponent {
	/** This field's picture is on its way to Storage. */
	public readonly uploading = input(false);
	/** Some picture is on its way: one upload at a time. */
	public readonly disabled = input(false);

	public readonly fileChosen = output<File>();
	public readonly libraryRequested = output<void>();

	/**
	 * The chosen file, handed on. The input is cleared afterwards, so picking
	 * the same file twice still counts as a change.
	 */
	protected choose(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			this.fileChosen.emit(file);
		}

		input.value = '';
	}
}
