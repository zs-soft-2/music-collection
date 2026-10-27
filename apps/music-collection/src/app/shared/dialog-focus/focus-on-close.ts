import {
	ElementRef,
	Injector,
	Signal,
	afterNextRender,
	effect,
	inject,
} from '@angular/core';

/**
 * Hands the focus back to the page when a dialog closes.
 *
 * A modal takes the focus with it when it goes; the browser then drops it on
 * `<body>`, and the next Tab starts from the top of the page while a screen
 * reader reads from the top too. Someone working by keyboard has to find
 * their way back to the record they were just looking at.
 *
 * `openFor` holds the id of whatever the dialog is open for and `null` once
 * it is closed, which is also what says where to go back to: the button that
 * opened it. `targets` names the candidates for that id in order, so a page
 * can offer a fallback for the case the button is gone — a copy let go of
 * takes its own remove button with it.
 *
 * Call it from a component constructor; the host element it looks in is the
 * component's own.
 */
export function focusOnClose(
	openFor: Signal<string | null>,
	targets: (closedFor: string) => string[]
): void {
	const host = inject<ElementRef<HTMLElement>>(ElementRef);
	const injector = inject(Injector);
	let openBefore: string | null = null;

	effect(() => {
		const open = openFor();
		const closedFor = openBefore;

		openBefore = open;
		if (open || !closedFor) {
			return;
		}
		// The page it goes back to is drawn in the same change detection the
		// dialog leaves in, so the button is only there a render later.
		afterNextRender(
			() => {
				const root = host.nativeElement;

				for (const selector of targets(closedFor)) {
					const target = root.querySelector<HTMLElement>(selector);

					if (target) {
						target.focus();
						return;
					}
				}
			},
			{ injector }
		);
	});
}
