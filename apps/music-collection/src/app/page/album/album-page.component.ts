import { ViewportScroller } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	Injector,
	afterNextRender,
	effect,
	inject,
	signal,
	untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
	AdminEditLinkComponent,
	DiscographyCardComponent,
	FormatBadgeComponent,
} from '../../shared/music-ui';
import { PlayerPanelComponent } from '../../shared/player';
import { AlbumPageStore } from './album-page.store';
import { AlbumCreditsComponent } from './component/album-credits/album-credits.component';
import { AlbumTracklistComponent } from './component/album-tracklist/album-tracklist.component';
import { ReleasePickerComponent } from './component/release-picker/release-picker.component';
import { BackLinkComponent } from '../../shared/back-link';

type AlbumSection =
	'original' | 'listen' | 'tracklist' | 'credits' | 'copies' | 'more';

const COMPACT_STORAGE_KEY = 'mc-album-compact';

function readCompact(): boolean {
	try {
		return localStorage.getItem(COMPACT_STORAGE_KEY) === 'true';
	} catch {
		return false;
	}
}

/**
 * Album page: the album with its original release, tracklist, credits
 * (musicians and their roles), the collector's copies and more albums of the
 * artist.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [AlbumPageStore],
	selector: 'mc-album-page',
	templateUrl: './album-page.component.html',
	styleUrls: ['./album-page.component.scss'],
	imports: [
		BackLinkComponent,
		RouterLink,
		DiscographyCardComponent,
		FormatBadgeComponent,
		AlbumCreditsComponent,
		AlbumTracklistComponent,
		AdminEditLinkComponent,
		PlayerPanelComponent,
		ReleasePickerComponent,
	],
})
export class AlbumPageComponent {
	protected readonly store = inject(AlbumPageStore);
	private readonly viewportScroller = inject(ViewportScroller);
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly injector = inject(Injector);

	/** Compact view: sections show only their titles until opened. Remembered. */
	protected readonly compact = signal(readCompact());
	/** Sections opened in the compact view; a new album starts closed. */
	protected readonly openSections = signal(new Set<AlbumSection>());

	protected readonly placeholders = (count: number) =>
		Array.from({ length: count }, (_, i) => i);

	public constructor() {
		// Moving to another album of the artist reuses this page.
		effect(() => {
			this.store.albumId();
			untracked(() => {
				this.viewportScroller.scrollToPosition([0, 0]);
				this.openSections.set(new Set());
			});
		});

		// Back on the page (closed or added): focus the button that opened the
		// picker.
		let pickerWasOpen = false;
		effect(() => {
			const open = this.store.pickerOpen();
			if (pickerWasOpen && !open) {
				afterNextRender(
					() =>
						this.host.nativeElement
							.querySelector<HTMLElement>('[data-collect-toggle]')
							?.focus(),
					{ injector: this.injector }
				);
			}
			pickerWasOpen = open;
		});

		effect(() => {
			const compact = this.compact();
			try {
				localStorage.setItem(COMPACT_STORAGE_KEY, String(compact));
			} catch {
				// Storage unavailable (e.g. private window): lasts for the session.
			}
		});
	}

	protected isOpen(section: AlbumSection): boolean {
		return !this.compact() || this.openSections().has(section);
	}

	protected toggleSection(section: AlbumSection): void {
		this.openSections.update((open) => {
			const next = new Set(open);
			if (!next.delete(section)) {
				next.add(section);
			}
			return next;
		});
	}

	protected toggleCompact(): void {
		this.compact.update((compact) => !compact);
		this.openSections.set(new Set());
	}

	protected onPickerClosed(): void {
		this.store.closePicker();
	}

	protected collapseAll(): void {
		this.openSections.set(new Set());
	}
}
