import { DOCUMENT, ViewportScroller } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	ElementRef,
	NgZone,
	afterNextRender,
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
import { ArtistLineupComponent } from './component/artist-lineup/artist-lineup.component';
import { DiscographyTimelineComponent } from './component/discography-timeline/discography-timeline.component';

/** Paragraphs shown before "Read more". */
const COLLAPSED_PARAGRAPHS = 2;

/** Extra room below the sticky navigation before a section counts as reached. */
const SECTION_REACHED_OFFSET = 24;

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
		ArtistLineupComponent,
	],
})
export class ArtistPageComponent {
	protected readonly store = inject(ArtistPageStore);
	private readonly viewportScroller = inject(ViewportScroller);
	private readonly document = inject(DOCUMENT);
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly zone = inject(NgZone);
	private readonly destroyRef = inject(DestroyRef);

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

	protected readonly hasLineup = computed(() => {
		const lineup = this.store.lineup();
		return lineup.members.length > 0 || lineup.guests.length > 0;
	});

	protected readonly hasTimeline = computed(() =>
		this.store.discography().some((album) => album.year !== null)
	);

	/** In-page sections present for this artist, in page order. */
	protected readonly sections = computed(() => {
		const artist = this.store.artist();
		const sections = [
			{ id: 'about', label: 'About', shown: !!artist?.paragraphs.length },
			{ id: 'lineup', label: 'Line-up', shown: this.hasLineup() },
			{ id: 'discography', label: 'Discography', shown: true },
			{
				id: 'in-collection',
				label: 'In your collection',
				shown: this.store.ownReleases().length > 0,
			},
			{
				id: 'similar',
				label: 'Similar artists',
				shown: this.store.similar().length > 0,
			},
		];
		return sections.filter((section) => section.shown);
	});

	/** The section currently in view; drives the navigation indicator. */
	protected readonly activeSection = signal<string | null>(null);

	/** Scroll-spy pauses while a navigation click scrolls the page. */
	private scrollLockUntil = 0;

	protected readonly placeholders = (count: number) =>
		Array.from({ length: count }, (_, i) => i);

	public constructor() {
		// Moving to another artist (e.g. a similar one) reuses this page.
		effect(() => {
			this.store.artistId();
			untracked(() => {
				this.bioExpanded.set(false);
				this.activeSection.set(null);
				this.viewportScroller.scrollToPosition([0, 0]);
			});
		});

		afterNextRender(() => this.trackActiveSection());
	}

	protected scrollTo(sectionId: string): void {
		const view = this.document.defaultView;
		const section = this.document.getElementById(sectionId);
		const nav =
			this.host.nativeElement.querySelector<HTMLElement>('.section-nav');
		if (!view || !section || !nav) {
			return;
		}
		// Land below the sticky app bar and section navigation.
		const top =
			section.getBoundingClientRect().top +
			view.scrollY -
			this.stuckNavBottom(nav) -
			16;
		const smooth = !view.matchMedia('(prefers-reduced-motion: reduce)')
			.matches;

		this.activeSection.set(sectionId);
		// Keep the clicked link active while the page scrolls past other sections.
		this.scrollLockUntil = Date.now() + (smooth ? 1000 : 0);
		view.scrollTo({
			top: Math.max(0, top),
			behavior: smooth ? 'smooth' : 'auto',
		});
	}

	/**
	 * Bottom edge of the section navigation once it sticks under the app bar —
	 * not its current position, which is lower while the page is at the top.
	 */
	private stuckNavBottom(nav: HTMLElement): number {
		const view = this.document.defaultView;
		const stickyTop = view ? parseFloat(view.getComputedStyle(nav).top) : 0;
		return (Number.isNaN(stickyTop) ? 0 : stickyTop) + nav.offsetHeight;
	}

	/**
	 * Scroll-spy: the active section is the last one whose top has passed the
	 * bottom of the sticky navigation. At the very bottom of the page the last
	 * section wins, even when it is too short to reach the navigation.
	 */
	private trackActiveSection(): void {
		const view = this.document.defaultView;
		if (!view) {
			return;
		}
		let frame = 0;

		const update = () => {
			frame = 0;
			if (Date.now() < this.scrollLockUntil) {
				return;
			}
			const nav =
				this.host.nativeElement.querySelector<HTMLElement>(
					'.section-nav'
				);
			const ids = this.sections().map((section) => section.id);
			if (!nav || !ids.length) {
				return;
			}
			const reached = this.stuckNavBottom(nav) + SECTION_REACHED_OFFSET;
			const atBottom =
				view.innerHeight + view.scrollY >=
				this.document.documentElement.scrollHeight - 2;

			let active: string | null = null;
			for (const id of ids) {
				const section = this.document.getElementById(id);
				if (section && section.getBoundingClientRect().top <= reached) {
					active = id;
				}
			}
			if (atBottom && view.scrollY > 0) {
				active = ids[ids.length - 1];
			}
			if (active !== this.activeSection()) {
				this.activeSection.set(active);
			}
		};

		const releaseLock = () => {
			this.scrollLockUntil = 0;
			schedule();
		};

		const schedule = () => {
			if (!frame) {
				frame = view.requestAnimationFrame(update);
			}
		};

		// Outside Angular: scrolling must not trigger change detection by itself;
		// the signal update does when the active section actually changes.
		this.zone.runOutsideAngular(() => {
			view.addEventListener('scroll', schedule, { passive: true });
			view.addEventListener('resize', schedule, { passive: true });
			view.addEventListener('scrollend', releaseLock, { passive: true });
		});
		this.destroyRef.onDestroy(() => {
			view.removeEventListener('scroll', schedule);
			view.removeEventListener('resize', schedule);
			view.removeEventListener('scrollend', releaseLock);
			if (frame) {
				view.cancelAnimationFrame(frame);
			}
		});
		schedule();
	}
}
