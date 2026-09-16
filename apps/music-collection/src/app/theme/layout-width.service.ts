import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

const STORAGE_KEY = 'mc-layout-wide';

// Széles nézet: a <html> mc-wide osztálya feloldja a lapok szélességkorlátját
// (--mc-page-max-width), hogy nagy képernyőn a teljes szélességet kitöltsék.
// A választás megmarad.
@Injectable({ providedIn: 'root' })
export class LayoutWidthService {
	private readonly document = inject(DOCUMENT);

	public readonly isWide = signal(this.readStored());

	public constructor() {
		effect(() => {
			const wide = this.isWide();

			this.document.documentElement.classList.toggle('mc-wide', wide);

			try {
				localStorage.setItem(STORAGE_KEY, String(wide));
			} catch {
				// A tárolás nem elérhető (pl. privát ablak): a munkamenetig él.
			}
		});
	}

	public toggle(): void {
		this.isWide.update((wide) => !wide);
	}

	private readStored(): boolean {
		try {
			return localStorage.getItem(STORAGE_KEY) === 'true';
		} catch {
			return false;
		}
	}
}
