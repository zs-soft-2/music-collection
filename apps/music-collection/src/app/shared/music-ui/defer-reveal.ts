/** Class of the `@placeholder` root of a deferred page section. */
export const DEFER_PLACEHOLDER_CLASS = 'defer-placeholder';

/** Longest wait for deferred blocks (their code may still be downloading). */
const REVEAL_TIMEOUT_MS = 1500;

/**
 * Resolves once no deferred placeholder is left inside `host`, or after a
 * timeout. Call it after triggering every `@defer` block (e.g. through a
 * `when` condition) and before measuring positions for in-page navigation,
 * so a jump lands where the section ends up.
 */
export function whenDeferredRendered(host: HTMLElement): Promise<void> {
	const view = host.ownerDocument.defaultView;
	const start = Date.now();

	return new Promise((resolve) => {
		const check = () => {
			const pending = host.querySelector(`.${DEFER_PLACEHOLDER_CLASS}`);

			if (!pending || !view || Date.now() - start > REVEAL_TIMEOUT_MS) {
				resolve();
			} else {
				view.requestAnimationFrame(check);
			}
		};
		check();
	});
}
