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
	linkedSignal,
	output,
	inject,
	signal,
	viewChild,
} from '@angular/core';
import { copySerialProblem, parseDiscogsReleaseId } from '@music-collection/api';

import {
	FORMAT_LABELS,
	FormatBadgeComponent,
	MATCH_LABELS,
	MediaFormat,
} from '../../../../shared/music-ui';
import {
	DiscogsVersionView,
	PendingRequestView,
	ReleaseOptionView,
	ReleaseRequestDraft,
	toRequestPressing,
} from '../../album.mapper';

/**
 * The catalog releases, the album's Discogs pressings, a photo of the record
 * itself, or a description.
 */
type PickerView = 'catalog' | 'discogs' | 'photo' | 'describe';

type FormatFilter = MediaFormat | 'all';

/**
 * A pressing the collector says they own, and the number on their copy of it
 * where the edition was numbered. The numbers travel as typed: parsing them
 * is the store's job, the same way the copy page's form hands its draft over.
 */
export interface CopyPick {
	releaseId: string;
	serialNumber: string;
	serialTotal: string;
}

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
	/**
	 * Where the picker opens. A scan sends the collector straight to the
	 * pressing it recognised, so the dialog must not start on the catalog
	 * list they have already been past.
	 */
	public readonly initialView = input<PickerView>('catalog');
	/** The catalog release the scan recognised, to point at. */
	public readonly highlightReleaseId = input<string | null>(null);
	/** The Discogs pressing the scan recognised, preselected to request. */
	public readonly highlightDiscogsReleaseId = input<number | null>(null);
	/** The pressings a photo of the record turned up. */
	public readonly photoVersions = input<DiscogsVersionView[]>([]);
	public readonly photoScanning = input(false);
	public readonly photoScanned = input(false);
	public readonly photoError = input<string | null>(null);
	/** The photo being read, shown while it is. */
	public readonly photoPreviewUrl = input<string | null>(null);
	public readonly discogsLoading = input(false);
	public readonly discogsError = input<string | null>(null);
	public readonly requesting = input(false);
	public readonly requestError = input<string | null>(null);

	/** The catalog pressing picked, with the copy's number where it has one. */
	public readonly picked = output<CopyPick>();
	/** The Discogs pressings are needed. */
	public readonly discogsRequested = output<void>();
	/** A photo of the record, to identify the pressing from. */
	public readonly photoPicked = output<Blob>();
	/** The same photo once more — the reader was busy, the picture is fine. */
	public readonly photoRetried = output<void>();
	public readonly requestSent = output<ReleaseRequestDraft>();
	/** Closed by the button, Escape or the page. */
	public readonly closed = output<void>();

	protected readonly view = linkedSignal<PickerView, PickerView>({
		source: this.initialView,
		computation: (initial) => initial,
	});
	protected readonly formatFilter = signal<FormatFilter>('all');
	protected readonly selectedVersion = signal<DiscogsVersionView | null>(
		null
	);
	protected readonly note = signal('');
	protected readonly discogsLink = signal('');
	/**
	 * The pressing chosen from the catalog, waiting on the number step. The
	 * copy is not added the moment a pressing is clicked, because a numbered
	 * record has to bring its number with it: the number is registered across
	 * the whole site, and it can only be taken before the copy is written.
	 */
	protected readonly chosenRelease = signal<ReleaseOptionView | null>(null);
	protected readonly serialNumber = signal('');
	protected readonly serialTotal = signal('');
	protected readonly noteMaxLength = NOTE_MAX_LENGTH;
	protected readonly formatLabels = FORMAT_LABELS;
	protected readonly matchLabels = MATCH_LABELS;

	protected readonly busy = computed(
		() => this.adding() || this.requesting() || this.photoScanning()
	);

	/** An image is being dragged over the dialog, ready to be dropped. */
	protected readonly dragging = signal(false);
	/**
	 * Why a paste did nothing. A copied *file* (from Finder or Explorer)
	 * reaches the page as a path the browser may not read, not as an image —
	 * without saying so, the paste just silently fails.
	 */
	protected readonly pasteHint = signal<string | null>(null);

	/**
	 * The photo is still there after a failed scan, so it can go again as it
	 * is: a busy reader is no reason to photograph the record twice.
	 */
	protected readonly canRetryPhoto = computed(
		() =>
			!!this.photoError() &&
			!!this.photoPreviewUrl() &&
			!this.photoScanning()
	);

	/** A photo was read and matched nothing to request. */
	protected readonly photoEmpty = computed(
		() =>
			this.photoScanned() &&
			!this.photoScanning() &&
			!this.photoError() &&
			this.photoVersions().length === 0
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

	protected readonly serialProblem = computed(() =>
		copySerialProblem(this.serialNumber(), this.serialTotal())
	);

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
	private readonly photoInput =
		viewChild.required<ElementRef<HTMLInputElement>>('photo');
	private readonly injector = inject(Injector);

	public constructor() {
		// Shown only while open; open it modally once rendered.
		afterNextRender(() => this.dialog().nativeElement.showModal());

		// A scan opens the picker on the pressing it recognised; select it as
		// soon as the list it lives in has arrived.
		effect(() => {
			const wanted = this.highlightDiscogsReleaseId();
			const versions = this.discogsVersions();

			if (!wanted || this.selectedVersion()) {
				return;
			}

			const version = versions.find((item) => item.id === wanted);

			if (version && !version.requested) {
				this.selectedVersion.set(version);
			}
		});

		// A picture of the record can also be pasted (a screenshot, a copied
		// image) or dropped on the dialog — on a desktop that beats finding
		// the file. The paste listener sits on the document because the
		// dialog may not hold the focus; this component only exists while
		// the picker is open, so it cannot catch anything else.
		effect((onCleanup) => {
			const dialog = this.dialog().nativeElement;
			const busy = this.busy();

			const onPaste = (event: ClipboardEvent) => {
				if (busy) {
					return;
				}

				const image = this.imageIn(event.clipboardData);

				if (image) {
					event.preventDefault();
					this.acceptImage(image);

					return;
				}

				// Only in the photo view: elsewhere pasting text (a Discogs
				// link into the description) is exactly what it should do.
				if (this.view() === 'photo') {
					this.pasteHint.set(
						event.clipboardData?.types.length
							? 'That was not an image. Copy the picture itself — in a browser, right-click it and choose “Copy image”. A file copied from Finder cannot be pasted, but you can drop it here.'
							: 'The clipboard is empty.'
					);
				}
			};
			const onDragOver = (event: DragEvent) => {
				if (!busy && event.dataTransfer?.types.includes('Files')) {
					event.preventDefault();
					this.dragging.set(true);
				}
			};
			const onDragLeave = (event: DragEvent) => {
				if (event.target === dialog) {
					this.dragging.set(false);
				}
			};
			const onDrop = (event: DragEvent) => {
				event.preventDefault();
				this.dragging.set(false);

				const image = busy ? null : this.imageIn(event.dataTransfer);

				if (image) {
					this.acceptImage(image);
				}
			};

			document.addEventListener('paste', onPaste);
			dialog.addEventListener('dragover', onDragOver);
			dialog.addEventListener('dragleave', onDragLeave);
			dialog.addEventListener('drop', onDrop);

			onCleanup(() => {
				document.removeEventListener('paste', onPaste);
				dialog.removeEventListener('dragover', onDragOver);
				dialog.removeEventListener('dragleave', onDragLeave);
				dialog.removeEventListener('drop', onDrop);
			});
		});

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

	protected takePhoto(): void {
		this.pasteHint.set(null);
		this.photoInput().nativeElement.click();
	}

	/**
	 * The first image in a clipboard or drop payload. Text is ignored on
	 * purpose: pasting a Discogs link into the description must keep working.
	 */
	private imageIn(data: DataTransfer | null): Blob | null {
		const file = Array.from(data?.files ?? []).find((item) =>
			item.type.startsWith('image/')
		);

		if (file) {
			return file;
		}

		const item = Array.from(data?.items ?? []).find(
			(entry) => entry.kind === 'file' && entry.type.startsWith('image/')
		);

		return item?.getAsFile() ?? null;
	}

	/**
	 * An image arrived by paste or drop: from wherever in the dialog, it
	 * means the same thing as taking a photo, so it opens that view.
	 */
	private acceptImage(image: Blob): void {
		this.view.set('photo');
		this.selectedVersion.set(null);
		this.dragging.set(false);
		this.pasteHint.set(null);
		this.photoPicked.emit(image);
	}

	protected onPhoto(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			this.selectedVersion.set(null);
			this.photoPicked.emit(file);
		}
		// Photographing the same record again must fire the event again.
		input.value = '';
	}

	/**
	 * The pressing is chosen; now the copy of it. Most records carry no
	 * number and the step is one press of Add, so the Add button takes the
	 * focus rather than the empty field: typing a number is the exception,
	 * and the common way through should be a keystroke.
	 */
	protected choose(release: ReleaseOptionView): void {
		if (release.owned || this.busy()) {
			return;
		}
		this.chosenRelease.set(release);
		this.serialNumber.set('');
		this.serialTotal.set('');
		afterNextRender(
			() =>
				this.dialog()
					.nativeElement.querySelector<HTMLElement>('.confirm-add')
					?.focus(),
			{ injector: this.injector }
		);
	}

	/** Back to the list; the pressing was not the one after all. */
	protected unchoose(): void {
		this.chosenRelease.set(null);
	}

	protected confirmChoice(): void {
		const release = this.chosenRelease();

		if (!release || this.busy() || this.serialProblem()) {
			return;
		}
		this.picked.emit({
			releaseId: release.id,
			serialNumber: this.serialNumber(),
			serialTotal: this.serialTotal(),
		});
	}

	protected onSerialInput(part: 'number' | 'total', event: Event): void {
		const value = (event.target as HTMLInputElement).value;

		(part === 'number' ? this.serialNumber : this.serialTotal).set(value);
	}

	protected show(view: PickerView): void {
		this.view.set(view);
		this.selectedVersion.set(null);
		this.chosenRelease.set(null);
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
