import { DOCUMENT, ViewportScroller } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	computed,
	effect,
	inject,
	signal,
	untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
	AdminEditLinkComponent,
	CREDIT_CATEGORY_LABELS,
	DiscographyCardComponent,
	whenDeferredRendered,
} from '../../shared/music-ui';
import { MusicianBandView, bandsSpan } from './musician.mapper';
import { MusicianPageStore } from './musician-page.store';
import { BackLinkComponent } from '../../shared/back-link';

/** Paragraphs shown before "Read more". */
const COLLAPSED_PARAGRAPHS = 2;

/** Bandmates shown before "Show all". */
const BANDMATE_PREVIEW = 12;

const TYPE_LABELS: Record<string, string> = {
	band: 'Band',
	project: 'Project',
	formation: 'Formation',
};

/**
 * Musician page: one person's career — the bands they played in (with a time
 * bar each), guest appearances, the albums they are credited on and their
 * bandmates.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [MusicianPageStore],
	selector: 'mc-musician-page',
	templateUrl: './musician-page.component.html',
	styleUrls: ['./musician-page.component.scss'],
	imports: [
		BackLinkComponent,
		RouterLink,
		DiscographyCardComponent,
		AdminEditLinkComponent,
	],
})
export class MusicianPageComponent {
	protected readonly store = inject(MusicianPageStore);
	private readonly viewportScroller = inject(ViewportScroller);
	private readonly document = inject(DOCUMENT);
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

	protected readonly roleLabels = CREDIT_CATEGORY_LABELS;
	protected readonly typeLabels = TYPE_LABELS;
	protected readonly bandmatePreview = BANDMATE_PREVIEW;
	protected readonly showAllBandmates = signal(false);
	protected readonly bioExpanded = signal(false);

	/** Renders every deferred section at once (before an in-page jump). */
	protected readonly revealAll = signal(false);

	protected readonly visibleParagraphs = computed(() => {
		const paragraphs = this.store.header()?.paragraphs ?? [];
		return this.bioExpanded()
			? paragraphs
			: paragraphs.slice(0, COLLAPSED_PARAGRAPHS);
	});

	protected readonly canExpandBio = computed(
		() =>
			(this.store.header()?.paragraphs.length ?? 0) > COLLAPSED_PARAGRAPHS
	);

	/**
	 * Relationship network around this musician; guests are switched on when
	 * the musician has no band membership, otherwise the graph would be empty.
	 */
	protected readonly networkQueryParams = computed(() => {
		const uid = this.store.header()?.uid ?? '';
		return this.store.members().length
			? { focus: `musician:${uid}` }
			: { focus: `musician:${uid}`, guests: 1 };
	});

	protected readonly hasNetwork = computed(
		() =>
			this.store.members().length > 0 ||
			this.store.guestBands().length > 0
	);

	protected readonly span = computed(() => bandsSpan(this.store.members()));

	/** The current (or else the first) band's photo behind the name. */
	protected readonly backdropUrl = computed(() => {
		const bands = this.store.members();
		const band =
			bands.find((b) => b.active && b.artist?.headerUrl) ??
			bands.find((b) => b.artist?.headerUrl);
		return band?.artist?.headerUrl ?? null;
	});

	protected readonly initials = computed(() =>
		(this.store.header()?.name ?? '')
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0].toUpperCase())
			.join('')
	);

	protected readonly visibleBandmates = computed(() =>
		this.showAllBandmates()
			? this.store.bandmates()
			: this.store.bandmates().slice(0, BANDMATE_PREVIEW)
	);

	/** In-page sections present for this musician, in page order. */
	protected readonly sections = computed(() =>
		[
			{
				id: 'about',
				label: 'About',
				shown: !!this.store.header()?.paragraphs.length,
			},
			{
				id: 'bands',
				label: 'Bands',
				shown: this.store.members().length > 0,
			},
			{
				id: 'guest',
				label: 'Guest appearances',
				shown: this.store.guestBands().length > 0,
			},
			{
				id: 'albums',
				label: 'Albums',
				shown: this.store.albums().length > 0,
			},
			{
				id: 'bandmates',
				label: 'Bandmates',
				shown: this.store.bandmates().length > 0,
			},
		].filter((section) => section.shown)
	);

	protected readonly placeholders = (count: number) =>
		Array.from({ length: count }, (_, i) => i);

	public constructor() {
		// Moving to another musician (e.g. a bandmate) reuses this page.
		effect(() => {
			this.store.musicianId();
			untracked(() => {
				this.showAllBandmates.set(false);
				this.bioExpanded.set(false);
				this.viewportScroller.scrollToPosition([0, 0]);
			});
		});
	}

	/** Position of a band's time bar across all the musician's years. */
	protected bar(
		band: MusicianBandView
	): { left: number; width: number } | null {
		const all = this.span();
		if (!band.span || !all) {
			return null;
		}
		const total = Math.max(1, all.to - all.from + 1);
		return {
			left: ((band.span.from - all.from) / total) * 100,
			width: ((band.span.to - band.span.from + 1) / total) * 100,
		};
	}

	protected async scrollTo(sectionId: string): Promise<void> {
		// Sections above the target must have their final height first.
		this.revealAll.set(true);
		await whenDeferredRendered(this.host.nativeElement);

		const section = this.document.getElementById(sectionId);
		const smooth = !this.document.defaultView?.matchMedia(
			'(prefers-reduced-motion: reduce)'
		).matches;
		section?.scrollIntoView({
			behavior: smooth ? 'smooth' : 'auto',
			block: 'start',
		});
	}
}
