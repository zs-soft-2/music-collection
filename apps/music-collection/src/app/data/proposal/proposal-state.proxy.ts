/**
 * A catalog state service with the saving taken out.
 *
 * The catalog's own forms are the right place for a collector to say what
 * they would change — the same fields, the same lookups, the same duplicate
 * warning — and each of them talks to its entity's state service. So the page
 * gives the form this in place of the real one: every question is passed
 * straight through, and only the three writes are caught.
 *
 * It is a proxy rather than a class per entity because the answer is the same
 * for all of them, while the interfaces are not: five subclasses would be a
 * hundred methods that do nothing but forward, and the next entity would be
 * twenty more. Methods are bound to the real service, so its own fields —
 * private ones included — are read off the real object rather than off this.
 */

/** What a form hands over when it would have saved an entity. */
export type ProposedUpdate = { uid: string } & Record<string, unknown>;

const CAUGHT = new Set([
	'dispatchAddEntityAction',
	'dispatchDeleteEntityAction',
]);

export function proposalStateProxy<T extends object>(
	real: T,
	propose: (update: ProposedUpdate) => void
): T {
	return new Proxy(real, {
		get(target, property) {
			if (property === 'dispatchUpdateEntityAction') {
				return propose;
			}
			// A new entity is a request of its own, and nobody deletes from
			// the catalog by proposing: both are silently no writes here, and
			// the pages that use this do not offer either.
			if (CAUGHT.has(property as string)) {
				return () => undefined;
			}

			const value = Reflect.get(target, property, target);

			return typeof value === 'function' ? value.bind(target) : value;
		},
	});
}
