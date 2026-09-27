import { EntityRequestChange } from '@music-collection/api';

/**
 * What a collector's submission differs from the catalog in, field by field.
 *
 * The admin decides a request one field at a time, so the request has to say
 * what its fields are. It is computed here rather than on the server because
 * it is what the collector is shown before they send it — and it is not
 * trusted there: the decision writes values from the submitted state, with
 * its own list of what may be written at all.
 *
 * It lives under the app rather than in `libs/api`, whose barrel is in the
 * main bundle: nothing here is needed to open a page.
 */

/**
 * The bookkeeping of a document, which is nobody's decision: the id, the
 * owner, the sync stamp and the search terms are written by whoever writes
 * the document, catalog or collector.
 */
const IGNORED_FIELDS = new Set([
	'uid',
	'entityType',
	'meta',
	'updatedAt',
	'searchParameters',
	'artistSearchParameters',
]);

/**
 * A field nobody filled in. A form saves an untouched text field as an empty
 * string where the catalog has no field at all, and an empty list the same
 * way — neither is a change worth an admin's time, let alone a reference.
 */
const isEmpty = (value: unknown): boolean =>
	value === null ||
	value === undefined ||
	value === '' ||
	(Array.isArray(value) && value.length === 0);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' &&
	value !== null &&
	!Array.isArray(value) &&
	!(value instanceof Date);

/** Deep equality, with every shape of emptiness reading as the same. */
export function isSameValue(one: unknown, other: unknown): boolean {
	if (isEmpty(one) || isEmpty(other)) {
		return isEmpty(one) && isEmpty(other);
	}
	if (one instanceof Date || other instanceof Date) {
		return (
			one instanceof Date &&
			other instanceof Date &&
			one.valueOf() === other.valueOf()
		);
	}
	if (Array.isArray(one) || Array.isArray(other)) {
		return (
			Array.isArray(one) &&
			Array.isArray(other) &&
			one.length === other.length &&
			one.every((item, index) => isSameValue(item, other[index]))
		);
	}
	if (isPlainObject(one) && isPlainObject(other)) {
		const fields = new Set([...Object.keys(one), ...Object.keys(other)]);

		return [...fields].every((field) =>
			isSameValue(one[field], other[field])
		);
	}

	return one === other;
}

/**
 * The value as Firestore can hold it: `undefined` is not a value there, and a
 * document carrying one is refused whole — the field is simply absent
 * instead, and a missing field reads as empty anyway.
 */
export function toStorableValue(value: unknown): unknown {
	if (value === undefined) {
		return null;
	}
	if (Array.isArray(value)) {
		return value.map((item) => toStorableValue(item));
	}
	if (isPlainObject(value)) {
		return Object.fromEntries(
			Object.entries(value)
				.filter(([, held]) => held !== undefined)
				.map(([field, held]) => [field, toStorableValue(held)])
		);
	}

	return value;
}

/**
 * The state a request carries: the document without its bookkeeping, and
 * without anything Firestore would refuse.
 */
export function toRequestSnapshot(
	entity: Record<string, unknown>
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(entity)
			.filter(
				([field, value]) =>
					!IGNORED_FIELDS.has(field) && value !== undefined
			)
			.map(([field, value]) => [field, toStorableValue(value)])
	);
}

/**
 * The fields the submitted state differs from the catalog in, in a settled
 * order so two requests about the same thing read the same way. `before` is
 * null on a create, where every filled-in field is a change from nothing.
 *
 * The references are left empty: what backs a field is the collector's to
 * give, and an update may not be sent without them.
 */
export function toRequestChanges(
	before: Record<string, unknown> | null,
	after: Record<string, unknown>
): EntityRequestChange[] {
	const fields = new Set(
		[...Object.keys(before ?? {}), ...Object.keys(after)].filter(
			(field) => !IGNORED_FIELDS.has(field)
		)
	);

	return [...fields]
		.sort()
		.filter((field) => !isSameValue(before?.[field], after[field]))
		.map((field) => ({
			field,
			before: toStorableValue(before?.[field] ?? null),
			after: toStorableValue(after[field]),
			reference: null,
		}));
}
