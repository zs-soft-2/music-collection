import { DatePipe, ViewportScroller } from '@angular/common';
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
	CopyPlacementComponent,
	DiscographyCardComponent,
	FormatBadgeComponent,
} from '../../shared/music-ui';
import { PlayerPanelComponent } from '../../shared/player';
import { AlbumPageStore } from './album-page.store';
import { AlbumCollectionsComponent } from './component/album-collections/album-collections.component';
import { AlbumCreditsComponent } from './component/album-credits/album-credits.component';
import { AlbumTracklistComponent } from './component/album-tracklist/album-tracklist.component';
import { CopyRemovalComponent } from './component/copy-removal/copy-removal.component';
import { ReleasePickerComponent } from './component/release-picker/release-picker.component';
import { WishlistDialogComponent } from './component/wishlist-dialog/wishlist-dialog.component';
import { PageBreadcrumbComponent } from '../../shared/page-breadcrumb';

type AlbumSection =
	'original' | 'listen' | 'tracklist' | 'credits' | 'copies' | 'more';

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
		PageBreadcrumbComponent,
		RouterLink,
		DiscographyCardComponent,
		FormatBadgeComponent,
		AlbumCollectionsComponent,
		AlbumCreditsComponent,
		AlbumTracklistComponent,
		AdminEditLinkComponent,
		PlayerPanelComponent,
		ReleasePickerComponent,
		CopyRemovalComponent,
		CopyPlacementComponent,
		WishlistDialogComponent,
		DatePipe,
	],
})
export class AlbumPageComponent {
	protected readonly store = inject(AlbumPageStore);
	private readonly viewportScroller = inject(ViewportScroller);
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly injector = inject(Injector);

	/** Compact view: sections show only their titles until opened. Kept for
	 * the user, so it follows them to the next browser. */
	protected readonly compact = this.store.compact;
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

		// Back on the page (closed or added): focus the wishlist button, which
		// is gone once the album is wanted — then the collect button.
		let wishlistWasOpen = false;
		effect(() => {
			const open = this.store.wishlistOpen();
			if (wishlistWasOpen && !open) {
				afterNextRender(
					() => {
						const root = this.host.nativeElement;
						(
							root.querySelector<HTMLElement>(
								'[data-wish-toggle]'
							) ??
							root.querySelector<HTMLElement>(
								'[data-collect-toggle]'
							)
						)?.focus();
					},
					{ injector: this.injector }
				);
			}
			wishlistWasOpen = open;
		});

		// Back from the removal dialog: focus its button, or the add button once
		// the copy is gone.
		let removingCopyId: string | null = null;
		effect(() => {
			const copyId = this.store.removingCopyId();
			if (removingCopyId && !copyId) {
				const closedFor = removingCopyId;
				afterNextRender(
					() => {
						const root = this.host.nativeElement;
						(
							root.querySelector<HTMLElement>(
								`[data-remove-copy="${closedFor}"]`
							) ??
							root.querySelector<HTMLElement>(
								'[data-collect-toggle]'
							)
						)?.focus();
					},
					{ injector: this.injector }
				);
			}
			removingCopyId = copyId;
		});

		// Back from the placement dialog: focus the button it opened from.
		let placingCopyId: string | null = null;
		effect(() => {
			const copyId = this.store.placingCopyId();
			if (placingCopyId && !copyId) {
				const closedFor = placingCopyId;
				afterNextRender(
					() => {
						this.host.nativeElement
							.querySelector<HTMLElement>(
								`[data-place-copy="${closedFor}"]`
							)
							?.focus();
					},
					{ injector: this.injector }
				);
			}
			placingCopyId = copyId;
		});
	}

	/** What the collector called the unit a copy stands in. */
	protected shelfName(unitId: string): string {
		return (
			this.store.shelfUnits().find((unit) => unit.id === unitId)?.name ||
			'Shelf'
		);
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
		this.store.toggleCompact();
		this.openSections.set(new Set());
	}

	protected onPickerClosed(): void {
		this.store.closePicker();
	}

	protected onWishlistClosed(): void {
		this.store.closeWishlist();
	}

	protected collapseAll(): void {
		this.openSections.set(new Set());
	}
}
