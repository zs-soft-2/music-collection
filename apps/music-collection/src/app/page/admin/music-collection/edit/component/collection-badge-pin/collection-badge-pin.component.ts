import { of } from 'rxjs';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { AiMarkComponent } from '../../../../../../shared/music-ui';
import { ImageLibraryComponent } from '../../../component/image-library.component';
import { MusicCollectionEditStore } from '../../music-collection-edit.store';

/**
 * The pin: the badge's picture, drawn by an image model, uploaded by hand
 * or picked from what is already filed — and the gallery of every one this
 * collection has had.
 *
 * It sits in the badge panel's field grid as one wide field; the panel puts
 * `mc-field is-wide badge-art` on this host on purpose, so the grid and the
 * global field layout take it the way they took the `div` it used to be.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-badge-pin',
	imports: [...I18N_IMPORTS, AiMarkComponent, ImageLibraryComponent],
	templateUrl: './collection-badge-pin.component.html',
	styleUrl: './collection-badge-pin.component.scss',
})
export class CollectionBadgePinComponent {
	protected readonly store = inject(MusicCollectionEditStore);

	protected value(event: Event): string {
		return (event.target as HTMLSelectElement).value;
	}

	/**
	 * A hand-made pin. It is not a form field like the other two uploads:
	 * the picture goes to the server, which files it and makes it the
	 * badge, so there is nothing here to write into the form.
	 */
	protected choosePin(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			this.store.uploadPin(of(file));
		}

		input.value = '';
	}
}
