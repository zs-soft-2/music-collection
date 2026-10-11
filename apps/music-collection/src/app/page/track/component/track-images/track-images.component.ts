import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	MAX_TRACK_IMAGE_HINT,
	type TrackImage,
	type TrackImageModel,
} from '@music-collection/api';

/**
 * The pictures of a song in its header: a strip to run along, and one of them
 * opened large above it.
 *
 * Its own component because it is its own behaviour — a strip that scrolls, a
 * picture that opens, an order that can be changed — and because the player's
 * stage shows the very same list as a backdrop. The page keeps the data; this
 * only shows it and says what was pressed.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-track-images',
	imports: [...I18N_IMPORTS],
	templateUrl: './track-images.component.html',
	styleUrls: ['./track-images.component.scss'],
})
export class TrackImagesComponent {
	public readonly images = input.required<TrackImage[]>();
	public readonly trackName = input('');
	public readonly canEdit = input(false);
	/** There is room for one more picture. */
	public readonly canAdd = input(true);
	/** A picture is being scaled, uploaded or written. */
	public readonly busy = input(false);
	public readonly error = input<string | null>(null);

	/** What the gateway would let this tenant draw with. */
	public readonly models = input<TrackImageModel[]>([]);
	public readonly loadingModels = input(false);

	public readonly chosen = output<File>();
	public readonly drawAsked = output<{
		model: string | null;
		hint: string;
	}>();
	public readonly removed = output<number>();
	public readonly moved = output<{ index: number; direction: -1 | 1 }>();

	/** Which picture is open large, by document; null while only the strip. */
	private readonly openedPath = signal<string | null>(null);

	protected readonly opened = computed(
		() =>
			this.images().find((image) => image.uid === this.openedPath()) ??
			null
	);

	/**
	 * Opening is per document rather than per index: the order can change
	 * under the strip while a picture is open, and the one the reader opened
	 * should not become whichever picture took its place.
	 */
	protected open(image: TrackImage): void {
		this.openedPath.update((uid) => (uid === image.uid ? null : image.uid));
	}

	protected close(): void {
		this.openedPath.set(null);
	}

	/** The model picked for drawing; empty means "let the gateway choose". */
	protected readonly model = signal('');
	/** A short line of direction for the drawing. */
	protected readonly hint = signal('');
	protected readonly hintLimit = MAX_TRACK_IMAGE_HINT;

	protected setModel(event: Event): void {
		this.model.set((event.target as HTMLSelectElement).value);
	}

	protected setHint(event: Event): void {
		this.hint.set((event.target as HTMLInputElement).value);
	}

	protected draw(): void {
		this.drawAsked.emit({
			model: this.model() || null,
			hint: this.hint().trim(),
		});
	}

	protected choose(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			this.chosen.emit(file);
		}
		// Cleared, so choosing the same file again is a change the input
		// reports rather than one it swallows.
		input.value = '';
	}
}
