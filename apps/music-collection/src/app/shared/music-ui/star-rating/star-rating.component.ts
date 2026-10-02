import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal,
} from '@angular/core';

/**
 * The five stars a collector gives a record, and the same five standing still
 * when somebody else's verdict is shown.
 *
 * Whole stars only. Half a star asks a collector to split a hair they never
 * wanted to split, and on a phone it asks a thumb to hit a target half as
 * wide — while the point of a scale is that two records can be held up
 * against each other.
 *
 * A star is given the moment it is pressed: no form, no save. Taking the
 * verdict back is its own button rather than a second press on the same star,
 * because a collector pressing four twice means four, not nothing.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-star-rating',
	host: { class: 'star-rating' },
	imports: [...I18N_IMPORTS],
	templateUrl: './star-rating.component.html',
	styleUrls: ['./star-rating.component.scss'],
})
export class StarRatingComponent {
	/** The stars given, or null while the record stands unjudged. */
	public readonly stars = input<number | null>(null);
	/** Somebody else's verdict, or an average: shown, never pressed. */
	public readonly readonly = input(false);
	/** What the group of stars is called, for a screen reader. */
	public readonly label = input<string | null>(null);
	/** A verdict is on its way to Firestore; the stars wait for it. */
	public readonly busy = input(false);
	/** Whether taking the verdict back is offered at all. */
	public readonly clearable = input(true);

	public readonly rated = output<number>();
	public readonly cleared = output<void>();

	protected readonly scale = [1, 2, 3, 4, 5];

	/**
	 * The star under the pointer or the focus, so the row fills up to it
	 * before anything is written: a collector should see what they are about
	 * to say.
	 */
	protected readonly previewed = signal<number | null>(null);

	protected readonly shown = computed(
		() => this.previewed() ?? this.stars() ?? 0
	);

	/** A verdict is only there to be taken back once one was given. */
	protected readonly takeBackable = computed(
		() => this.clearable() && this.stars() !== null && !this.readonly()
	);

	protected choose(star: number): void {
		if (!this.busy()) {
			this.rated.emit(star);
		}
	}

	protected preview(star: number | null): void {
		if (!this.readonly()) {
			this.previewed.set(star);
		}
	}
}
