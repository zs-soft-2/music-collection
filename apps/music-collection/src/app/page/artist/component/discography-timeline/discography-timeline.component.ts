import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { DiscographyAlbum } from '../../../../shared/music-ui';

interface Marker {
	album: DiscographyAlbum;
	owned: boolean;
	/** Horizontal position on the year axis, 0–100 %. */
	left: number;
	/** Stack position among albums released the same year. */
	level: number;
	/** Tooltip alignment, so tooltips near an edge open inwards. */
	align: 'start' | 'center' | 'end';
	label: string;
}

/** Vertical distance between stacked markers (px). */
const LEVEL_STEP = 22;

/**
 * The artist's albums on a year axis. Two categories — collected (filled
 * marker) and not collected (ring) — named in the legend, so identity never
 * depends on color alone. Every marker links to its album and shows its
 * details on hover and keyboard focus.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-discography-timeline',
	imports: [...I18N_IMPORTS, RouterLink],
	templateUrl: './discography-timeline.component.html',
	styleUrls: ['./discography-timeline.component.scss'],
})
export class DiscographyTimelineComponent {
	public readonly albums = input.required<DiscographyAlbum[]>();

	private readonly range = computed(() => {
		const years = this.albums()
			.map((album) => album.year)
			.filter((year): year is number => year !== null);
		const first = Math.min(...years);
		const last = Math.max(...years);
		// Pad a single-year (or very short) career so markers are not at the edge.
		const span = Math.max(last - first, 4);
		const start = first - Math.ceil((span - (last - first)) / 2) - 1;

		return { start, end: start + span + 2 };
	});

	protected readonly markers = computed<Marker[]>(() => {
		const { start, end } = this.range();
		const levels = new Map<number, number>();

		return this.albums()
			.filter((album) => album.year !== null)
			.map((album) => {
				const year = album.year as number;
				const level = levels.get(year) ?? 0;
				const owned = album.ownedFormats.length > 0;

				levels.set(year, level + 1);

				const left = ((year - start) / (end - start)) * 100;

				return {
					album,
					owned,
					left,
					align: left < 35 ? 'start' : left > 65 ? 'end' : 'center',
					level,
					label: `${album.title}, ${year}${
						owned ? ', in your collection' : ''
					}`,
				};
			});
	});

	protected readonly height = computed(() => {
		const maxLevel = Math.max(0, ...this.markers().map((m) => m.level));
		return 48 + maxLevel * LEVEL_STEP;
	});

	protected readonly ticks = computed(() => {
		const { start, end } = this.range();
		const span = end - start;
		const step = span > 30 ? 10 : span > 12 ? 5 : 2;
		const ticks: { year: number; left: number }[] = [];

		for (
			let year = Math.ceil(start / step) * step;
			year <= end;
			year += step
		) {
			ticks.push({ year, left: ((year - start) / span) * 100 });
		}
		return ticks;
	});

	protected readonly levelStep = LEVEL_STEP;
}
