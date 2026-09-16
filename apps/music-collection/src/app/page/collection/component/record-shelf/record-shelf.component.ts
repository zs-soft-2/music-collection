import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { MediaFormat, ReleaseView } from '../../../../shared/music-ui';
import { ReleaseGroup } from '../../collection.model';

interface Spine {
	release: ReleaseView;
	width: number;
	height: number;
	hue: number;
}

interface Compartment {
	key: string;
	label: string;
	spines: Spine[];
}

/**
 * Spine size per format (px), scaled from real media: a vinyl sleeve is the
 * tallest but thinnest, a cassette is short but chunky.
 */
const SPINE_SIZE: Record<MediaFormat, { width: number; height: number }> = {
	vinyl: { width: 7, height: 190 },
	dvd: { width: 15, height: 116 },
	cd: { width: 11, height: 80 },
	cassette: { width: 17, height: 70 },
	other: { width: 11, height: 100 },
};

const BOX_SET_SIZE = { width: 30, height: 196 };

/** A stable pseudo-random hue per release, so spines are not all identical. */
function hueOf(text: string): number {
	let hash = 0;

	for (let i = 0; i < text.length; i++) {
		hash = (hash * 31 + text.charCodeAt(i)) | 0;
	}
	return Math.abs(hash) % 360;
}

/**
 * Collection shelf — releases stand spine-out in square, Kallax-like
 * compartments. Hovering or focusing a spine pulls it out and shows the cover.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-record-shelf',
	templateUrl: './record-shelf.component.html',
	styleUrls: ['./record-shelf.component.scss'],
	imports: [RouterLink],
})
export class RecordShelfComponent {
	public readonly compartments = input.required<ReleaseGroup[]>();

	protected readonly shelf = computed<Compartment[]>(() =>
		this.compartments().map((group) => ({
			key: group.key,
			label: group.label,
			spines: group.items.map((release) => ({
				release,
				...(release.boxSet ? BOX_SET_SIZE : SPINE_SIZE[release.format]),
				hue: hueOf(release.title + release.artistName),
			})),
		}))
	);
}
