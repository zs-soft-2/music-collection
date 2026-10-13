/**
 * What the write callables can refuse, in the admin's words. The code comes
 * back as `functions/<code>`; anything unlisted is a failure the admin can do
 * nothing about, so it gets the general sentence.
 */
const ERRORS: Record<string, string> = {
	'already-exists': 'Another collection already uses this slug.',
	'failed-precondition':
		'Refused: a collection with no rule cannot be published, a parent cannot be a descendant, and a collection with children cannot be deleted.',
	'invalid-argument': 'The definition is not valid.',
	'not-found': 'This collection no longer exists.',
	'permission-denied': 'You may not change the collections.',
	// A badge generation runs on our bill, so the day has a ceiling.
	'resource-exhausted': "Today's badge allowance is used up.",
	internal: 'The image model refused the request. Try again later.',
};

export function describeWriteError(error: unknown): string {
	const code = ((error as { code?: string })?.code ?? '').replace(
		/^functions\//,
		''
	);
	const message = (error as { message?: string })?.message;

	// A validálási hiba mondata a szerveren pontosabb, mint bármi itt.
	if (
		(code === 'invalid-argument' || code === 'failed-precondition') &&
		message
	) {
		return message;
	}

	return ERRORS[code] ?? 'Something went wrong. Try again later.';
}

/**
 * Amit egy rajzolás hibájából az admin lát.
 *
 * A `describeWriteError` az `internal`-t egy kész mondatra cseréli, és jól
 * teszi: a legtöbb íráshiba olyasmi, amivel ő nem tud kezdeni semmit. Egy
 * rajzolás viszont más. A szerver pontosan tudja, mi jött vissza a
 * gatewaytől — és a próbapadon épp az a kérdés, mit írjon át a következő
 * próbához. Ezért ami okot hoz magával, annak az üzenete kimegy a képernyőre.
 */
export interface DrawFailure {
	message: string;
	/** `no-image`, `gateway-error`, `unexpected-shape` — vagy semmi. */
	reason: string | null;
}

export function describeDrawError(error: unknown): DrawFailure {
	const reason = (error as { details?: { reason?: unknown } })?.details
		?.reason;
	const message = (error as { message?: string })?.message;

	return typeof reason === 'string' && message
		? { message, reason }
		: { message: describeWriteError(error), reason: null };
}
