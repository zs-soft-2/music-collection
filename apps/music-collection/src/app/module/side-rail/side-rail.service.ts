import { Injectable, signal } from '@angular/core';

/**
 * Whether the left-hand rail is open.
 *
 * The rail is a drawer rather than a column the page is laid out beside:
 * opening it slides it over whatever is already on the page, so nothing
 * reflows and the reader does not lose their place. That only works if it
 * starts closed — an open drawer covers the left edge of the page — so the
 * state deliberately outlives nothing: every load begins with the page in
 * full width.
 *
 * It lives apart from the rail itself because the button that opens it is
 * on the top bar, which is a sibling, not a parent.
 */
@Injectable({ providedIn: 'root' })
export class SideRailService {
	private readonly open = signal(false);

	public readonly isOpen = this.open.asReadonly();

	public toggle(): void {
		this.open.update((open) => !open);
	}

	public close(): void {
		this.open.set(false);
	}
}
