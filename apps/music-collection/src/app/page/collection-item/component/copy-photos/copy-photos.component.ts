import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CopyPhotoView } from '../../collection-item.mapper';
import { PhotoSlot } from '../../collection-item-page.store';

/**
 * The photographs of the copy: the record as it stands in the room, not the
 * catalog cover.
 *
 * Two pictures make a card that turns — front and back, the way the sleeve
 * itself does. It turns on hover, on keyboard focus and on a tap, because a
 * phone has no hover and the back is the half worth seeing. With one picture
 * there is nothing to turn to, so the card simply shows it.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-copy-photos',
	imports: [...I18N_IMPORTS],
	templateUrl: './copy-photos.component.html',
	styleUrls: ['./copy-photos.component.scss'],
})
export class CopyPhotosComponent {
	public readonly photos = input.required<CopyPhotoView[]>();
	public readonly albumTitle = input('');
	public readonly canEdit = input(false);
	/** A picture is being scaled, uploaded or written. */
	public readonly busy = input(false);
	public readonly error = input<string | null>(null);

	public readonly chosen = output<{ slot: PhotoSlot; file: File }>();
	public readonly removed = output<number>();

	/** Tapped over: what hover does on a screen that has no pointer. */
	protected readonly turned = signal(false);

	protected readonly front = computed(() => this.photos()[0] ?? null);
	protected readonly back = computed(() => this.photos()[1] ?? null);
	protected readonly canTurn = computed(() => this.photos().length > 1);

	/** The empty slot a new picture goes into. */
	protected readonly nextSlot = computed((): PhotoSlot =>
		this.front() ? 'back' : 'front'
	);

	protected toggle(): void {
		if (this.canTurn()) {
			this.turned.update((turned) => !turned);
		}
	}

	protected choose(slot: PhotoSlot, event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			this.chosen.emit({ slot, file });
		}
		// Cleared, so choosing the same file again is a change the input
		// reports rather than one it swallows.
		input.value = '';
	}
}
