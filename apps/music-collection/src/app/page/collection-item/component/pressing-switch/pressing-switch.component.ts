import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from '@angular/core';

import { FormatBadgeComponent } from '../../../../shared/music-ui';
import { CopyPressingOption } from '../../collection-item.mapper';

/**
 * The releases of one album, with the copy's own marked, and the move onto
 * another one.
 *
 * It is a list rather than a dropdown because the question it answers is
 * "which of these is mine" — read far more often than the move is made, and
 * a closed select answers it only while it is open. Most albums offer one
 * line today; an album the catalog knows the pressings of offers a dozen,
 * and the list reads the same either way.
 *
 * The move takes two clicks. A pressing picked by accident would carry the
 * copy's number to another release, so pointing at one and moving onto it
 * are kept apart.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-pressing-switch',
	imports: [...I18N_IMPORTS, FormatBadgeComponent],
	templateUrl: './pressing-switch.component.html',
	styleUrls: ['./pressing-switch.component.scss'],
})
export class PressingSwitchComponent {
	/** The album's releases, the copy's own first. */
	public readonly options = input.required<CopyPressingOption[]>();
	/** The catalog is still being read. */
	public readonly loading = input(false);
	/** The move is being written; the list waits rather than lies. */
	public readonly busy = input(false);
	/** Which release is pointed at, none until the collector picks one. */
	public readonly picked = input<string | null>(null);
	public readonly error = input<string | null>(null);

	/** A release was pointed at, or the pick taken back with `null`. */
	public readonly pick = output<string | null>();
	/** Move the copy onto this release. */
	public readonly confirmed = output<string>();
	public readonly cancelled = output<void>();

	/** The release the copy stands under right now. */
	protected readonly current = computed(
		() => this.options().find((option) => option.current) ?? null
	);

	/**
	 * Whether there is anywhere to move to. A catalog that knows one pressing
	 * of the album has nothing to offer, and saying so is better than a list
	 * with a single unclickable line in it.
	 */
	protected readonly others = computed(() =>
		this.options().filter((option) => !option.current)
	);

	/** The release pointed at, once it is one the copy can move onto. */
	protected readonly chosen = computed(() => {
		const picked = this.picked();

		return (
			this.others().find(
				(option) => option.id === picked && !option.taken
			) ?? null
		);
	});

	protected choose(option: CopyPressingOption): void {
		if (option.current || option.taken || this.busy()) {
			return;
		}
		// Clicking the picked one again takes the pick back, so a list read
		// by keyboard or by touch has a way out that is not the Cancel button.
		this.pick.emit(option.id === this.picked() ? null : option.id);
	}
}
