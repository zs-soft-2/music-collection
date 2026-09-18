import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'mc-theme';

// Sötét / világos téma: a <html> osztálya és color-scheme-je váltja a --mc-*
// tokeneket és a PrimeNG light-dark() színeit. A választás megmarad.
@Injectable({ providedIn: 'root' })
export class ThemeService {
	private readonly document = inject(DOCUMENT);

	public readonly mode = signal<ThemeMode>(this.readStored());
	public readonly isDark = computed(() => this.mode() === 'dark');

	public constructor() {
		effect(() => {
			const mode = this.mode();
			const root = this.document.documentElement;

			root.classList.toggle('mc-light', mode === 'light');
			root.classList.toggle('mc-dark', mode === 'dark');

			try {
				localStorage.setItem(STORAGE_KEY, mode);
			} catch {
				// A tárolás nem elérhető (pl. privát ablak): a téma a munkamenetig él.
			}
		});
	}

	public toggle(): void {
		this.mode.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
	}

	private readStored(): ThemeMode {
		try {
			return localStorage.getItem(STORAGE_KEY) === 'light'
				? 'light'
				: 'dark';
		} catch {
			return 'dark';
		}
	}
}
