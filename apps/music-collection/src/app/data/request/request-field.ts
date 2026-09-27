import { EntityReferenceKind } from '@music-collection/api';

/**
 * How a request's fields are shown, wherever they are shown: the admin
 * deciding on them and the collector about to send them see the same value
 * formatted the same way, because they are looking at the same thing.
 */

/** Nothing there; an empty cell would read as a missing column. */
export const NOTHING = '—';

/** The dictionary key of a field's name, e.g. `country` → its label. */
export const requestFieldLabelKey = (field: string): string =>
	`admin.requestField.${field}`;

/**
 * A value as a reader takes it in. A list becomes its items, an object its
 * filled-in keys — what matters is that two values side by side can be
 * compared at a glance, not that the shape survives.
 */
export function formatRequestValue(value: unknown): string {
	if (value === null || value === undefined || value === '') {
		return NOTHING;
	}
	if (Array.isArray(value)) {
		return value.length
			? value.map(formatRequestValue).join(', ')
			: NOTHING;
	}
	if (typeof value === 'object') {
		const parts = Object.entries(value as Record<string, unknown>)
			.filter(
				([, held]) => held !== null && held !== undefined && held !== ''
			)
			.map(([field, held]) => `${field}: ${formatRequestValue(held)}`);

		return parts.length ? parts.join(' · ') : NOTHING;
	}

	return String(value);
}

/**
 * What kind of reference the collector typed. They are given one box, not a
 * kind to pick and then a value: a link is a link, and asking someone to
 * classify their own evidence before giving it is a way of not getting it.
 */
export function toReferenceKind(value: string): EntityReferenceKind {
	const held = value.trim().toLowerCase();

	if (!/^https?:\/\//.test(held)) {
		return 'note';
	}
	if (held.includes('discogs.com')) {
		return 'discogs';
	}
	if (held.includes('musicbrainz.org')) {
		return 'musicbrainz';
	}

	return 'url';
}
