import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/**
 * A single transparent pixel. The element keeps its box and its aspect ratio,
 * but the browser has nothing to fail at, so the torn-paper icon never
 * appears. What the collector sees instead is painted by `.mc-cover-failed`
 * in the global stylesheet, which can follow the theme the way a data URI
 * cannot.
 */
const BLANK =
	'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22%20width=%221%22%20height=%221%22/%3E';

const FAILED_CLASS = 'mc-cover-failed';

/**
 * The placeholder a cover falls back to when its picture cannot be fetched.
 *
 * Covers come from other people's servers — the Cover Art Archive, Discogs,
 * Spotify — and those answer with a 500 or a 404 often enough that a record
 * on the shelf should not look broken when they do. The archive serves one
 * item per release, so a bad item takes every size with it: there is no
 * smaller picture to fall back to, only this.
 *
 * It is deliberately not a service or a store: nothing is fetched, decided or
 * remembered here. One failed `<img>` is told to stop being broken.
 */
@Directive({
	selector: 'img[mcCoverFallback]',
})
export class CoverFallbackDirective {
	private readonly image =
		inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;

	@HostListener('error')
	protected onError(): void {
		// The blank pixel loads, so this cannot loop; the guard is for the
		// browser that reports an error on it anyway.
		if (this.image.getAttribute('src') === BLANK) {
			return;
		}

		this.image.setAttribute('src', BLANK);
		this.image.classList.add(FAILED_CLASS);
	}

	/**
	 * A list that rebinds the same `<img>` to the next record — a carousel, a
	 * filtered grid — must not keep the placeholder under a picture that
	 * loads. The blank pixel also loads, hence the check for it.
	 */
	@HostListener('load')
	protected onLoad(): void {
		if (this.image.getAttribute('src') !== BLANK) {
			this.image.classList.remove(FAILED_CLASS);
		}
	}
}
