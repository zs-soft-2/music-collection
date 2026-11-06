import {
	ChangeDetectionStrategy,
	Component,
	input,
	linkedSignal,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { Image } from 'primeng/image';

/**
 * The picture at an address someone has entered, or a plain sentence when it
 * cannot be loaded: a broken-image glyph cannot tell a mistyped address from a
 * failure elsewhere.
 *
 * The outcome is what one element on screen did, not part of the record, so it
 * stays here: it never touches the form's value or validity.
 *
 * The status region is always in the document, because a live region announces
 * only what is added to it.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-image-url-preview',
	templateUrl: './image-url-preview.component.html',
	styleUrls: ['./image-url-preview.component.scss'],
	imports: [...I18N_IMPORTS, Image],
})
export class ImageUrlPreviewComponent {
	public readonly url = input.required<string | null | undefined>();
	public readonly alt = input.required<string>();

	/**
	 * Follows the address, so a new one starts over and one that failed before
	 * is tried again. The browser drops the pending events of a replaced
	 * request, so an earlier address cannot report late.
	 */
	public readonly failed = linkedSignal({
		source: this.url,
		computation: () => false,
	});

	public onError(): void {
		this.failed.set(true);
	}
}
