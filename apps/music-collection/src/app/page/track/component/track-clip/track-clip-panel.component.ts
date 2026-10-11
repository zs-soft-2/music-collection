import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	type TrackClip,
	type TrackClipEstimate,
	type TrackClipStatus,
} from '@music-collection/api';

/**
 * The moving clip made from the song's pictures: what it would cost, the
 * button that orders it, and the clip itself once it is there.
 *
 * Only an editor sees this. The generation runs on the gateway and is paid
 * for per clip, so the panel says the price and the day's allowance before
 * the button rather than after it — and it keeps saying where the work is,
 * because minutes pass between the order and the clip.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-track-clip-panel',
	imports: [...I18N_IMPORTS],
	templateUrl: './track-clip-panel.component.html',
	styleUrls: ['./track-clip-panel.component.scss'],
})
export class TrackClipPanelComponent {
	public readonly clip = input<TrackClip | null>(null);
	public readonly status = input<TrackClipStatus>('none');
	public readonly estimate = input<TrackClipEstimate | null>(null);
	public readonly error = input<string | null>(null);
	/** A call is in flight. */
	public readonly busy = input(false);
	/** There are pictures to build a clip from. */
	public readonly hasPictures = input(false);
	public readonly remainingToday = input<number | null>(null);

	public readonly priceAsked = output<void>();
	public readonly generateAsked = output<void>();

	protected readonly running = computed(
		() => this.status() === 'queued' || this.status() === 'running'
	);

	/**
	 * Nothing is ordered without pictures, while one is being made, or when
	 * the day's allowance is gone — the server refuses all three, and a
	 * button that can only be refused should not be offered.
	 */
	protected readonly canGenerate = computed(
		() =>
			this.hasPictures() &&
			!this.running() &&
			!this.busy() &&
			this.remainingToday() !== 0
	);

	/** The price as a line: "≈ $0.28" — or nothing, when the gateway was quiet. */
	protected readonly price = computed(() => {
		const cost = this.estimate()?.costUsd;

		return typeof cost === 'number' ? `≈ $${cost.toFixed(2)}` : null;
	});
}
