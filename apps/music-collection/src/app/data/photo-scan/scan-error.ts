/**
 * What the scan callables say about themselves when they fail.
 *
 * The server marks every scan error with a `details.source`, because the same
 * gRPC code means different things: a busy Discogs, a busy photo reader and a
 * spent daily allowance all arrive as `resource-exhausted`, and only two of
 * the three are worth retrying with the same picture.
 *
 * The allowance is the one every scan page phrases the same way, so the
 * sentence lives here instead of in each store. The rest stays with the page:
 * "Discogs is busy" and "the reading is busy" are not the same sentence.
 */

/** The daily photo allowance, as the server sends it (`photo-scan-quota.ts`). */
export function scanQuotaMessage(error: unknown): string | null {
	const { code = '', details } = (error ?? {}) as {
		code?: string;
		details?: { source?: string };
	};

	if (details?.source !== 'quota') return null;

	return code.endsWith('failed-precondition')
		? 'Photo scanning is switched off right now.'
		: "You have used up today's photo allowance. It starts over tomorrow.";
}
