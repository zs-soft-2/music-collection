import { NgTemplateOutlet } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Injector,
	afterNextRender,
	computed,
	effect,
	input,
	output,
	inject,
	signal,
	viewChild,
} from '@angular/core';
import { parseDiscogsReleaseId } from '@music-collection/api';

import {
	FORMAT_LABELS,
	FormatBadgeComponent,
	MediaFormat,
} from '../../../../shared/music-ui';
import {
	DiscogsVersionView,
	PendingRequestView,
	ReleaseOptionView,
	ReleaseRequestDraft,
	toRequestPressing,
} from '../../album.mapper';

/** The catalog releases, the album's Discogs pressings, or a description. */
type PickerView = 'catalog' | 'discogs' | 'describe';

type FormatFilter = MediaFormat | 'all';

const NOTE_MAX_LENGTH = 500;

/**
 * Modal to add a copy of the album: the collector picks the pressing they own
 * from the catalog. When it is missing, they request it from the admin — picked
 * from the album's Discogs pressings or described.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-picker',
	imports: [FormatBadgeComponent, NgTemplateOutlet],
	templateUrl: './release-picker.component.html',
	styleUrls: ['./release-picker.component.scss'],
})
export class ReleasePickerComponent {
	public readonly albumTitle = input.required<string>();
	public readonly releases = input.required<ReleaseOptionView[]>();
	public readonly loading = input(false);
	public readonly adding = input(false);
	public readonly error = input<string | null>(null);
	public readonly pendingRequests = input<PendingRequestView[]>([]);
	public readonly rejectedRequests = input<PendingRequestView[]>([]);
	/** The album has a Discogs master to list pressings of. */
	public readonly discogsAvailable = input(false);
	public readonly discogsVersions = input<DiscogsVersionView[]>([]);
	public readonly discogsLoading = input(false);
	public readonly discogsError = input<string | null>(null);
	public readonly requesting = input(false);
	public readonly requestError = input<string | null>(null);

	/** The id of the catalog release picked. */
	public readonly picked = output<string>();
	/** The Discogs pressings are needed. */
	public readonly discogsRequested = output<void>();
	public readonly requestSent = output<ReleaseRequestDraft>();
	/** Closed by the button, Escape or the page. */
	public readonly closed = output<void>();

	protected readonly view = signal<PickerView>('catalog');
	protected readonly formatFilter = signal<FormatFilter>('all');
	protected readonly selectedVersion = signal<DiscogsVersionView | null>(
		null
	);
	protected readonly note = signal('');
	protected readonly discogsLink = signal('');
	protected readonly noteMaxLength = NOTE_MAX_LENGTH;
	protected readonly formatLabels = FORMAT_LABELS;

	protected readonly busy = computed(
		() => this.adding() || this.requesting()
	);

	/** The formats the Discogs pressings come in, for the filter. */
	protected readonly discogsFormats = computed(() => [
		...new Set(this.discogsVersions().map((version) => version.format)),
	]);

	protected readonly filteredVersions = computed(() => {
		const filter = this.formatFilter();
		return filter === 'all'
			? this.discogsVersions()
			: this.discogsVersions().filter(
					(version) => version.format === filter
				);
	});

	protected readonly linkedReleaseId = computed(() =>
		parseDiscogsReleaseId(this.discogsLink())
	);

	protected readonly linkInvalid = computed(
		() => this.discogsLink().trim() !== '' && !this.linkedReleaseId()
	);

	/** A description needs a Discogs link or a few words. */
	protected readonly canDescribe = computed(
		() =>
			!this.linkInvalid() &&
			(!!this.linkedReleaseId() || this.note().trim().length > 0)
	);

	private readonly dialog =
		viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
	private readonly injector = inject(Injector);

	public constructor() {
		// Shown only while open; open it modally once rendered.
		afterNextRender(() => this.dialog().nativeElement.showModal());

		// Escape must not close the dialog halfway through a write.
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

	protected show(view: PickerView): void {
		this.view.set(view);
		this.selectedVersion.set(null);
		this.note.set('');
		if (view === 'discogs') {
			this.discogsRequested.emit();
		}
		// The button pressed is gone: focus the start of the new view.
		afterNextRender(
			() =>
				this.dialog()
					.nativeElement.querySelector<HTMLElement>(
						view === 'catalog' ? '.option, .icon-button' : '.back'
					)
					?.focus(),
			{ injector: this.injector }
		);
	}

	protected select(version: DiscogsVersionView): void {
		if (!version.requested) {
			this.selectedVersion.set(version);
			this.note.set('');
		}
	}

	protected onInput(target: 'note' | 'link', event: Event): void {
		const value = (event.target as HTMLInputElement | HTMLTextAreaElement)
			.value;
		(target === 'note' ? this.note : this.discogsLink).set(value);
	}

	protected requestSelected(): void {
		const version = this.selectedVersion();
		if (version) {
			this.requestSent.emit({
				discogsReleaseId: version.id,
				pressing: toRequestPressing(version),
				note: this.note().trim() || null,
			});
		}
	}

	protected requestDescribed(): void {
		if (this.canDescribe()) {
			this.requestSent.emit({
				discogsReleaseId: this.linkedReleaseId(),
				pressing: null,
				note: this.note().trim() || null,
			});
		}
	}
}
