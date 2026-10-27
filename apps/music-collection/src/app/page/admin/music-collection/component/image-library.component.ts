import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

/** One picture of the library: what it takes to show it and to pick it. */
export interface LibraryImage {
	/** The `document` entity over the file. */
	uid: string;
	name: string;
	/** The download URL, straight into `<img src>`. */
	filePath: string;
}

/** Thumbnails drawn at once; the search reaches the rest. */
const SHOWN = 24;

/**
 * The pictures already uploaded, to pick one instead of uploading again.
 *
 * Its own component rather than another block of the editor's template: it
 * has a behaviour of its own — a search, a chosen image, a way out — and it
 * is opened from three different fields, each of which only hands it a list
 * and hears back which picture was picked.
 *
 * What it shows are the images, not their records: an admin looking for the
 * right picture recognises it by sight, so the name is the caption and the
 * thumbnail is the button.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-image-library',
	imports: [...I18N_IMPORTS],
	template: `
		<div class="head">
			<strong>{{
				'ui.musicCollectionEdit.already-uploaded' | transloco
			}}</strong>
			<button type="button" class="close" (click)="closed.emit()">
				{{ 'ui.musicCollectionEdit.close-the-library' | transloco }}
			</button>
		</div>

		@if (images().length) {
			<input
				type="search"
				[placeholder]="
					'ui.musicCollectionEdit.search-images' | transloco
				"
				[value]="query()"
				(input)="onQuery($event)"
			/>
		}

		@if (matches().length) {
			<ul>
				@for (image of matches(); track image.uid) {
					<li [class.is-chosen]="image.uid === chosenUid()">
						<button
							type="button"
							[disabled]="busy()"
							[title]="image.name"
							(click)="picked.emit(image)"
						>
							<img
								[src]="image.filePath"
								[alt]="image.name"
								loading="lazy"
							/>
							<span>{{ image.name }}</span>
						</button>
					</li>
				}
			</ul>

			@if (hidden(); as hidden) {
				<p class="none">
					{{
						'ui.musicCollectionEdit.more-images'
							| transloco: { count: hidden }
					}}
				</p>
			}
		} @else if (query().trim()) {
			<p class="none">
				{{ 'ui.entityPicker.noMatch' | transloco: { query: query() } }}
			</p>
		} @else {
			<p class="none">
				{{ 'ui.musicCollectionEdit.no-uploaded-image' | transloco }}
			</p>
		}
	`,
	styles: `
		:host {
			display: block;
			margin-top: 0.75rem;
			padding: 0.75rem;
			background: var(--mc-surface-2);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);
		}

		.head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 1rem;
			margin-bottom: 0.6rem;
		}

		.close {
			padding: 0.2rem 0.6rem;
			font: inherit;
			font-size: 0.8rem;
			color: var(--mc-text);
			cursor: pointer;
			background: transparent;
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);
		}

		input {
			width: 100%;
			padding: 0.45rem 0.6rem;
			font: inherit;
			font-size: 0.9rem;
			color: var(--mc-text);
			background: var(--mc-bg);
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);
		}

		ul {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
			gap: 0.6rem;
			margin: 0.75rem 0 0;
			padding: 0;
			list-style: none;
		}

		li button {
			display: flex;
			flex-direction: column;
			gap: 0.3rem;
			width: 100%;
			padding: 0.3rem;
			font: inherit;
			color: var(--mc-text);
			text-align: center;
			cursor: pointer;
			background: transparent;
			border: 1px solid transparent;
			border-radius: var(--mc-radius-md);

			&:hover:not(:disabled),
			&:focus-visible {
				border-color: var(--mc-primary);
			}

			&:disabled {
				cursor: progress;
				opacity: 0.6;
			}
		}

		/* Az átlátszó pin mögött a lap színe látszik, ahogy a galériában is. */
		li img {
			width: 100%;
			aspect-ratio: 1;
			object-fit: contain;
			border-radius: var(--mc-radius-sm);
		}

		li.is-chosen img {
			outline: 2px solid var(--mc-accent);
			outline-offset: 2px;
		}

		li span {
			overflow: hidden;
			font-size: 0.7rem;
			color: var(--mc-text-muted);
			white-space: nowrap;
			text-overflow: ellipsis;
		}

		.none {
			margin: 0.75rem 0 0;
			font-size: 0.8rem;
			color: var(--mc-text-subtle);
		}
	`,
})
export class ImageLibraryComponent {
	public readonly images = input.required<LibraryImage[]>();
	/** The picture this field already wears, marked among the rest. */
	public readonly chosenUid = input<string | null>(null);
	/** A pick is on its way to the server; a second one would race it. */
	public readonly busy = input(false);
	public readonly picked = output<LibraryImage>();
	public readonly closed = output<void>();

	protected readonly query = signal('');

	protected readonly found = computed<LibraryImage[]>(() => {
		const query = this.query().trim().toLowerCase();

		return query
			? this.images().filter((image) =>
					image.name.toLowerCase().includes(query)
				)
			: this.images();
	});

	protected readonly matches = computed<LibraryImage[]>(() =>
		this.found().slice(0, SHOWN)
	);

	/** How many the search still has to reach, if any. */
	protected readonly hidden = computed<number>(() =>
		Math.max(this.found().length - SHOWN, 0)
	);

	protected onQuery(event: Event): void {
		this.query.set((event.target as HTMLInputElement).value);
	}
}
