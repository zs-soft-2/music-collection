import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	afterNextRender,
	computed,
	effect,
	input,
	output,
	signal,
	viewChild,
} from '@angular/core';
import {
	COLLECTION_ITEM_DISPOSAL_REASONS,
	CollectionItemDisposalReason,
} from '@music-collection/api';

import { FormatBadgeComponent, ReleaseView } from '../../../../shared/music-ui';
import { DISPOSAL_REASON_LABELS, DisposalDraft } from '../../album.mapper';

const NOTE_MAX_LENGTH = 500;

/** `YYYY-MM-DD` of the local day, as a date input takes it. */
function toDateInput(date: Date): string {
	const pad = (value: number) => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Modal to remove a copy from the collection: sold, traded, given away… The
 * copy is kept in the collector's history.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-copy-removal',
	imports: [...I18N_IMPORTS, FormatBadgeComponent],
	templateUrl: './copy-removal.component.html',
	styleUrls: ['./copy-removal.component.scss'],
})
export class CopyRemovalComponent {
	public readonly albumTitle = input.required<string>();
	public readonly copy = input.required<ReleaseView>();
	public readonly busy = input(false);
	public readonly error = input<string | null>(null);

	public readonly removed = output<DisposalDraft>();
	/** Closed by the button, Escape or the page. */
	public readonly closed = output<void>();

	protected readonly reasons = COLLECTION_ITEM_DISPOSAL_REASONS;
	protected readonly reasonLabels = DISPOSAL_REASON_LABELS;
	protected readonly noteMaxLength = NOTE_MAX_LENGTH;
	protected readonly today = toDateInput(new Date());

	protected readonly reason = signal<CollectionItemDisposalReason>('sold');
	protected readonly date = signal(this.today);
	protected readonly note = signal('');

	/** Local noon of the picked day: the same day in every time zone near. */
	private readonly disposedAt = computed(() => {
		const [year, month, day] = this.date().split('-').map(Number);
		return year && month && day
			? new Date(year, month - 1, day, 12).getTime()
			: NaN;
	});

	protected readonly dateInvalid = computed(
		() => !Number.isFinite(this.disposedAt()) || this.date() > this.today
	);

	private readonly dialog =
		viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

	public constructor() {
		afterNextRender(() => this.dialog().nativeElement.showModal());

		// Escape must not close the dialog halfway through the write.
		effect((onCleanup) => {
			const dialog = this.dialog().nativeElement;
			const busy = this.busy();
			const onCancel = (event: Event) => {
				if (busy) {
					event.preventDefault();
				}
			};
			dialog.addEventListener('cancel', onCancel);
			onCleanup(() => dialog.removeEventListener('cancel', onCancel));
		});
	}

	protected close(): void {
		if (!this.busy()) {
			this.dialog().nativeElement.close();
		}
	}

	protected onInput(target: 'date' | 'note', event: Event): void {
		const value = (event.target as HTMLInputElement | HTMLTextAreaElement)
			.value;
		(target === 'date' ? this.date : this.note).set(value);
	}

	protected submit(): void {
		if (!this.dateInvalid() && !this.busy()) {
			this.removed.emit({
				reason: this.reason(),
				date: Math.min(this.disposedAt(), Date.now()),
				note: this.note().trim() || null,
			});
		}
	}
}
