import { DOCUMENT } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	computed,
	effect,
	inject,
	signal,
} from '@angular/core';
import {
	SongVisualProfile,
	resolveVisualProfile,
} from '@music-collection/ui/visual-engine';

import { PlayerStore } from '../player';
import { VisualSceneComponent } from '../visual-scene';
import { SceneBackdropService } from './scene-backdrop.service';

/**
 * How long the engine is given to settle before a still scene is frozen.
 *
 * Every field of the visual state eases towards its target with its own
 * half-life — fog and particle density take the longest — so a scene stopped
 * on its first frame is a half-built one. A second and a half is past the
 * slowest of them.
 */
const SETTLE_MS = 1600;

/**
 * Ahol a lap áll, amíg nem szól semmi: egy tető nélküli templomhajó
 * viharban. Nem valaki lemezborítója — számok a ködről, a fényről és a
 * koszról, ugyanúgy, ahogy a motor minden más világát leírjuk.
 *
 * Azért kézzel írt, és nem a motor üres bemenetre adott profilja: az
 * semleges, és egy semleges világ pont az, amiért nem érdemes jelenetet
 * rajzolni. A gyűjtemény otthona legyen olyan, mint a gyűjtemény.
 *
 * Végig halkan van véve — `energy` alacsony, a kamera alig mozdul, a
 * szemcse ritka. Ez háttér, nem színpad: ami itt feltűnő, az a lap elől
 * veszi el a figyelmet.
 */
const HOUSE_PROFILE: SongVisualProfile = {
	id: 'mc-house',
	world: 'mc-house',

	artist: '',
	album: '',
	song: '',

	genre: ['heavy metal'],
	mood: ['dark', 'still', 'heavy', 'weathered'],
	concepts: ['ruin', 'storm', 'keeping', 'time'],

	palette: {
		background: '#0a0a0a',
		primary: '#ff4444',
		secondary: '#3d5a6c',
		accent: '#ff8f2e',
	},

	environment: {
		type: 'cathedral',
		fog: 0.58,
		darkness: 0.62,
	},

	particles: {
		type: 'embers',
		density: 0.3,
		speed: 0.28,
	},

	camera: {
		movement: 'slow-drift',
		intensity: 0.16,
	},

	effects: {
		glow: 0.55,
		flicker: 0.3,
		shake: 0,
		vignette: 0.8,
	},

	energy: 0.3,
};

/**
 * The world the whole app stands in.
 *
 * It is the same engine the player's stage uses, put behind the pages
 * instead of behind the lyrics, and built from whatever is playing — so the
 * app is lit by the record on the turntable rather than by a picture
 * somebody chose once. With nothing playing it falls back to the world the
 * engine derives from nothing, which is stable rather than random: the app
 * has a home.
 *
 * Two things keep it honest. On `still` it is drawn once and frozen, so the
 * usual cost of this is a texture and no render loop at all. And it is only
 * ever on the dark theme: a dark world under a light page would take the
 * contrast the text needs, and there is no light-world version of it worth
 * drawing.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-scene-backdrop',
	imports: [VisualSceneComponent],
	host: { 'aria-hidden': 'true' },
	template: `
		@if (sceneOn()) {
			<mc-visual-scene
				class="scene"
				[profile]="profile()"
				mode="ambient"
				quality="low"
				[paused]="paused()"
				(unsupported)="onUnsupported()"
			/>

			<!--
				A sötétítő fátyol. A jelenet hangulatot ad, a szöveg
				kontrasztját viszont nem viheti el: a lap közepe a
				legsötétebb, ott áll a tartalom java.
			-->
			<div class="veil"></div>
		}
	`,
	styles: `
		:host {
			position: fixed;
			inset: 0;
			z-index: 0;
			overflow: hidden;
			pointer-events: none;
		}

		/*
		 * Világos témán nincs jelenet. Nem halványabb — nincs: egy sötét
		 * világ a világos lap alatt pont azt a kontrasztot enné meg, amiért
		 * a világos téma van.
		 */
		:host-context(html.mc-light) {
			display: none;
		}

		.scene {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			opacity: 0.8;
		}

		/*
		 * A fátyol lefelé sűrűsödik, és a lap aljára teljesen beér. Fent a
		 * jelenet ege látszik, mert ott nincs más — lejjebb a lapok úgyis
		 * eltakarják, és ami köztük kilátszik, annak halkulnia kell, hogy a
		 * lábjegyzet és a kártyák közti szöveg olvasható maradjon.
		 */
		.veil {
			position: absolute;
			inset: 0;
			background: linear-gradient(
				to bottom,
				color-mix(in srgb, var(--mc-bg) 18%, transparent) 0%,
				color-mix(in srgb, var(--mc-bg) 22%, transparent) 32%,
				color-mix(in srgb, var(--mc-bg) 55%, transparent) 70%,
				var(--mc-bg) 100%
			);
		}
	`,
})
export class SceneBackdropComponent {
	private readonly document = inject(DOCUMENT);
	private readonly destroyRef = inject(DestroyRef);
	private readonly player = inject(PlayerStore);
	private readonly backdrop = inject(SceneBackdropService);

	/** WebGL2 was not there; the page keeps its plain background. */
	private readonly failed = signal(false);
	/** The still scene has had its time to settle and may be frozen. */
	private readonly settled = signal(false);
	private readonly hidden = signal(false);

	protected readonly sceneOn = computed(
		() => !this.failed() && this.backdrop.effectiveMode() !== 'off'
	);

	/**
	 * The record on the turntable decides the world. The album and the band
	 * are what the engine keys on, so the scene holds through a whole record
	 * rather than changing with every track.
	 */
	protected readonly profile = computed<SongVisualProfile>(() => {
		const request = this.player.shown().request;
		const now = this.player.now();
		const artist = request?.artistName ?? now?.subtitle ?? null;

		if (!artist) {
			return HOUSE_PROFILE;
		}

		return resolveVisualProfile({
			artist,
			album: request?.albumTitle ?? null,
			song: now?.title ?? request?.trackName ?? null,
			genre: request?.styles ?? null,
		});
	});

	protected readonly paused = computed(() => {
		if (this.hidden()) {
			return true;
		}

		return this.backdrop.effectiveMode() === 'still' && this.settled();
	});

	public constructor() {
		const view = this.document.defaultView;

		/*
		 * A new world has to be drawn before it can be frozen, so the clock
		 * restarts whenever the profile changes — a record put on while a
		 * still scene stands gets its own scene, not the last one.
		 */
		effect((onCleanup) => {
			this.profile();
			this.settled.set(false);

			if (this.backdrop.effectiveMode() !== 'still') {
				return;
			}

			const timer = view?.setTimeout(
				() => this.settled.set(true),
				SETTLE_MS
			);

			onCleanup(() => view?.clearTimeout(timer));
		});

		if (view) {
			const onVisibility = (): void =>
				this.hidden.set(this.document.visibilityState === 'hidden');

			this.document.addEventListener('visibilitychange', onVisibility);
			onVisibility();

			this.destroyRef.onDestroy(() =>
				this.document.removeEventListener(
					'visibilitychange',
					onVisibility
				)
			);
		}
	}

	protected onUnsupported(): void {
		this.failed.set(true);
	}
}
