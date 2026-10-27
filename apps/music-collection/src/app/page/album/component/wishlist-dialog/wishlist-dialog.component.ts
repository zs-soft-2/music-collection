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
import { MediaEnum } from '@music-collection/api';

import { WISHLIST_MEDIA_LABELS, WishlistDraft } from '../../album.mapper';

/** The media a wanted album is looked for on; `all` means any of them. */
const MEDIA_OPTIONS: MediaEnum[] = [
	MediaEnum.all,
	MediaEnum.vinyl,
	MediaEnum.cd,
	MediaEnum.cassette,
	MediaEnum.dvd,
	MediaEnum.boxset,
];

/** Modal to put an album on the wishlist: the media wanted and a shop link. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-wishlist-dialog',
	imports: [...I18N_IMPORTS],
	templateUrl: './wishlist-dialog.component.html',
	styleUrls: ['./wishlist-dialog.component.scss'],
})
export class WishlistDialogComponent {
	public readonly albumTitle = input.required<string>();
	public readonly artistName = input<string | null>(null);
	public readonly busy = input(false);
	public readonly error = input<string | null>(null);

	public readonly wished = output<WishlistDraft>();
	/** Closed by the button, Escape or the page. */
	public readonly closed = output<void>();

	protected readonly options = MEDIA_OPTIONS;
	protected readonly labels = WISHLIST_MEDIA_LABELS;

	/** Any medium until the collector narrows it down. */
	protected readonly medias = signal<MediaEnum[]>([MediaEnum.all]);
	protected readonly sourceLink = signal('');

	protected readonly linkInvalid = computed(() => {
		const link = this.sourceLink().trim();
		return !!link && !/^https?:\/\/\S+$/i.test(link);
	});

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

	protected isPicked(media: MediaEnum): boolean {
		return this.medias().includes(media);
	}

	/** `all` rules the others out, and a media list is never empty. */
	protected toggleMedia(media: MediaEnum): void {
		this.medias.update((picked) => {
			if (media === MediaEnum.all) {
				return [MediaEnum.all];
			}
			const next = picked
				.filter((item) => item !== MediaEnum.all)
				.filter((item) => item !== media);

			return picked.includes(media)
				? next.length
					? next
					: [MediaEnum.all]
				: [...next, media];
		});
	}

	protected onLink(event: Event): void {
		this.sourceLink.set((event.target as HTMLInputElement).value);
	}

	protected submit(): void {
		if (this.linkInvalid() || this.busy()) {
			return;
		}

		this.wished.emit({
			medias: this.medias(),
			sourceLink: this.sourceLink().trim() || null,
		});
	}
}
