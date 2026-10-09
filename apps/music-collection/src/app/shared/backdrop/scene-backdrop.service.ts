import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

const STORAGE_KEY = 'mc-scene-backdrop';

/**
 * How much of a world stands behind the app.
 *
 * `still` is the default and the interesting one: the engine draws the scene,
 * settles, and then stops. What is left is a painted backdrop that costs
 * nothing to keep on screen — the look of the mood art without a render loop
 * running under every page of the app.
 */
export type SceneBackdropMode = 'off' | 'still' | 'live';

const ORDER: SceneBackdropMode[] = ['off', 'still', 'live'];

/** Ugyanaz a töréspont, ahol az alsó lapsáv átveszi a navigációt. */
const NARROW = '(max-width: 720px)';

/**
 * Whether the app stands in a world, and how alive that world is.
 *
 * Kept in this browser rather than on the account: it is a decision about
 * this machine's graphics card as much as about taste, and a laptop that
 * cannot carry a live scene should not be told to by a desktop.
 */
@Injectable({ providedIn: 'root' })
export class SceneBackdropService {
	private readonly document = inject(DOCUMENT);

	/** What the collector asked for, before the machine has its say. */
	public readonly mode = signal<SceneBackdropMode>(this.readStored());

	/**
	 * A reader who asked for less movement gets the still scene instead of
	 * the live one — the mood without anything that moves. This is read once:
	 * the setting does not change mid-session in any browser that matters,
	 * and a scene that rebuilt itself on a media query would cost more than
	 * it saves.
	 */
	private readonly reducedMotion = this.readReducedMotion();

	/**
	 * Telefonon nincs világ. Egy WebGL-jelenet ott a legdrágább és a
	 * leghaszontalanabb: a lapok kitöltik a képernyőt, úgyhogy a szélükön
	 * kiderengő néhány képpontért járatnánk egy GPU-t.
	 */
	private readonly narrow = signal(this.matches(NARROW));

	/** What is actually drawn, the machine and the reader taken into account. */
	public readonly effectiveMode = computed<SceneBackdropMode>(() => {
		if (this.narrow()) {
			return 'off';
		}

		const mode = this.mode();

		return mode === 'live' && this.reducedMotion ? 'still' : mode;
	});

	public constructor() {
		/*
		 * Az ablak átméretezése számít — egy böngészőablak széthúzása éppúgy
		 * átlépi a töréspontot, mint a telefon elforgatása —, a mozgásról
		 * szóló kérdés viszont nem: azt egyszer olvassuk.
		 */
		this.document.defaultView
			?.matchMedia?.(NARROW)
			?.addEventListener?.('change', (event) =>
				this.narrow.set(event.matches)
			);

		effect(() => {
			/*
			 * A lap felületei ebből tudják meg, hogy van mögöttük világ: a
			 * kártyák ilyenkor áttetszővé válnak, hogy a jelenet átderengjen
			 * köztük. Osztály és nem komponens-állapot, mert a tokeneket a
			 * globális stíluslap írja — minden kártya egyszerre fordul át,
			 * nem csak az, amelyik tud a háttérről.
			 */
			this.document.documentElement.classList.toggle(
				'mc-scene',
				this.effectiveMode() !== 'off'
			);

			try {
				localStorage.setItem(STORAGE_KEY, this.mode());
			} catch {
				// A tárolás nem elérhető (pl. privát ablak): a munkamenetig él.
			}
		});
	}

	/** Off → still → live → off, which is the order of how much it costs. */
	public cycle(): void {
		this.mode.update(
			(mode) => ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]
		);
	}

	/** False wherever the question cannot be asked, which is the safe answer. */
	private readReducedMotion(): boolean {
		return this.matches('(prefers-reduced-motion: reduce)');
	}

	private matches(query: string): boolean {
		return this.document.defaultView?.matchMedia?.(query)?.matches ?? false;
	}

	private readStored(): SceneBackdropMode {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);

			return ORDER.includes(stored as SceneBackdropMode)
				? (stored as SceneBackdropMode)
				: 'still';
		} catch {
			return 'still';
		}
	}
}
