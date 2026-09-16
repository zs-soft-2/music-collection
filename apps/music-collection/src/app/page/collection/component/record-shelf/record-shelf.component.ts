import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	ElementRef,
	inject,
	input,
	viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { MediaFormat, ReleaseView } from '../../../../shared/music-ui';
import { ReleaseGroup } from '../../collection.model';

import { RecordShelfPeekComponent } from './record-shelf-peek.component';

interface Spine {
	release: ReleaseView;
	href: string;
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
 *
 * Built for hundreds of spines:
 * - compartments render when they approach the viewport (`@defer`), and
 *   off-screen ones skip rendering (`content-visibility`);
 * - pointer / focus / click listeners are delegated native listeners (not
 *   template bindings), so moving the mouse never marks the spines dirty;
 * - one shared cover preview in its own small view instead of one per spine;
 * - plain `href`s instead of a `RouterLink` per spine.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-record-shelf',
	templateUrl: './record-shelf.component.html',
	styleUrls: ['./record-shelf.component.scss'],
	imports: [RecordShelfPeekComponent],
})
export class RecordShelfComponent {
	public readonly compartments = input.required<ReleaseGroup[]>();

	private readonly router = inject(Router);
	private readonly peek = viewChild.required(RecordShelfPeekComponent);

	protected readonly shelf = computed<Compartment[]>(() =>
		this.compartments().map((group) => ({
			key: group.key,
			label: group.label,
			spines: group.items.map((release) => ({
				release,
				href: this.router.serializeUrl(
					this.router.createUrlTree(['/album', release.albumId])
				),
				...(release.boxSet ? BOX_SET_SIZE : SPINE_SIZE[release.format]),
				hue: hueOf(release.title + release.artistName),
			})),
		}))
	);

	private readonly releasesById = computed(
		() =>
			new Map(
				this.compartments().flatMap((group) =>
					group.items.map((release) => [release.id, release] as const)
				)
			)
	);

	public constructor() {
		const host: HTMLElement = inject(ElementRef).nativeElement;
		const listeners: [string, (event: never) => void][] = [
			['pointerover', this.onEnter],
			['focusin', this.onEnter],
			['pointerout', this.onLeave],
			['focusout', this.onLeave],
			['click', this.onClick],
		];

		listeners.forEach(([type, listener]) =>
			host.addEventListener(type, listener as EventListener)
		);
		inject(DestroyRef).onDestroy(() =>
			listeners.forEach(([type, listener]) =>
				host.removeEventListener(type, listener as EventListener)
			)
		);
	}

	private readonly onEnter = (event: Event): void => {
		const element = this.spineOf(event.target);
		const release =
			element && this.releasesById().get(element.dataset['id'] ?? '');

		if (element && release) {
			/* offset* ignores the hover lift transform and is relative to .unit. */
			this.peek().show(
				release,
				element.offsetLeft + element.offsetWidth / 2,
				element.offsetTop
			);
		}
	};

	private readonly onLeave = (event: FocusEvent | PointerEvent): void => {
		const from = this.spineOf(event.target);

		if (from && from !== this.spineOf(event.relatedTarget)) {
			this.peek().hide();
		}
	};

	private readonly onClick = (event: MouseEvent): void => {
		const element = this.spineOf(event.target);

		if (
			!element ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		) {
			return;
		}
		event.preventDefault();
		void this.router.navigateByUrl(element.getAttribute('href') ?? '/');
	};

	private spineOf(target: EventTarget | null): HTMLElement | null {
		return target instanceof Element
			? target.closest<HTMLElement>('.spine')
			: null;
	}
}
