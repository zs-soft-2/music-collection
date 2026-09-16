import { ViewportScroller } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	signal,
	untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
	ArtistTileComponent,
	DiscographyCardComponent,
	FORMAT_LABELS,
	ReleaseCardComponent,
} from '../../shared/music-ui';
import { ArtistPageStore } from './artist-page.store';
import { DiscographyTimelineComponent } from './component/discography-timeline/discography-timeline.component';

/** Paragraphs shown before "Read more". */
const COLLAPSED_PARAGRAPHS = 2;

/**
 * Artist page: everything known about one artist — profile, biography,
 * discography on a timeline and as cards, the collected releases and
 * similar artists.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ArtistPageStore],
	selector: 'mc-artist-page',
	templateUrl: './artist-page.component.html',
	styleUrls: ['./artist-page.component.scss'],
	imports: [
		RouterLink,
		ArtistTileComponent,
		ReleaseCardComponent,
		DiscographyCardComponent,
		DiscographyTimelineComponent,
	],
})
export class ArtistPageComponent {
	protected readonly store = inject(ArtistPageStore);
	private readonly viewportScroller = inject(ViewportScroller);

	protected readonly formatLabels = FORMAT_LABELS;
	protected readonly bioExpanded = signal(false);

	protected readonly visibleParagraphs = computed(() => {
		const paragraphs = this.store.artist()?.paragraphs ?? [];
		return this.bioExpanded()
			? paragraphs
			: paragraphs.slice(0, COLLAPSED_PARAGRAPHS);
	});

	protected readonly canExpandBio = computed(
		() =>
			(this.store.artist()?.paragraphs.length ?? 0) > COLLAPSED_PARAGRAPHS
	);

	protected readonly hasTimeline = computed(() =>
		this.store.discography().some((album) => album.year !== null)
	);

	protected readonly placeholders = (count: number) =>
		Array.from({ length: count }, (_, i) => i);

	public constructor() {
		// Moving to another artist (e.g. a similar one) reuses this page.
		effect(() => {
			this.store.artistId();
			untracked(() => {
				this.bioExpanded.set(false);
				this.viewportScroller.scrollToPosition([0, 0]);
			});
		});
	}

	protected scrollTo(sectionId: string): void {
		this.viewportScroller.scrollToAnchor(sectionId);
	}
}
