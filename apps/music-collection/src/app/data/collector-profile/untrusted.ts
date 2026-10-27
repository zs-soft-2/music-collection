/**
 * What a published collector document is worth before a page draws it.
 *
 * These documents are written by collectors' own browsers, and the security
 * rules can only hold their shape: Firestore rules have no iteration, so the
 * fields are checked up there while the contents of the lists are not.
 * Everything that comes out of a list is therefore somebody else's writing,
 * and it leaves here as one of three things — a clipped string, a picture a
 * page may load, or nothing.
 *
 * They live next to the documents rather than inside one page, because both
 * the collector's page and the wall of collectors read the same writing, and
 * two different ideas of what is safe would be one idea too many.
 */

/** The last character code a line of text has no business carrying. */
const LAST_CONTROL_CODE = 0x1f;
const DELETE_CODE = 0x7f;

/** As much of a text as there is room for, and nothing that breaks a line. */
export function clipText(value: unknown, max: number): string {
	if (typeof value !== 'string') {
		return '';
	}

	let plain = '';

	for (const character of value.slice(0, max * 2)) {
		const code = character.codePointAt(0) ?? 0;

		plain +=
			code <= LAST_CONTROL_CODE || code === DELETE_CODE ? ' ' : character;
	}

	return plain.trim().slice(0, max);
}

/**
 * A picture a page may load, or nothing.
 *
 * Held to `https://`: a `javascript:` or `data:` URL in an `<img src>` or an
 * `<a href>` would be our own domain handing a visitor something a stranger
 * wrote. The hosting CSP would catch much of that, but a page that relies on
 * a header to be safe is a page that is not.
 */
export function pictureUrl(value: unknown): string | null {
	return typeof value === 'string' && value.startsWith('https://')
		? value
		: null;
}

/** A whole number at least zero, or null where the document said otherwise. */
export function wholeNumber(value: unknown): number | null {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0
		? value
		: null;
}

/** A number at least zero — points are not always whole. */
export function positiveNumber(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0
		? value
		: null;
}

export function listOf(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}
