/**
 * A catalog state service with the saving taken out.
 *
 * The catalog's own forms are the right place for a collector to say what
 * they would change — the same fields, the same lookups, the same duplicate
 * warning — and each of them talks to its entity's state service. So the page
 * gives the form this in place of the real one: every question is passed
 * straight through, and only the three writes are caught.
 *
 * Both writes are caught, not only the change: a collector adding a record
 * the catalog has never heard of is asking for the same thing in the same
 * words, and the form they fill is the same form.
 *
 * It is a proxy rather than a class per entity because the answer is the same
 * for all of them, while the interfaces are not: five subclasses would be a
 * hundred methods that do nothing but forward, and the next entity would be
 * twenty more. Methods are bound to the real service, so its own fields —
 * private ones included — are read off the real object rather than off this.
 */

/** What a form hands over when it would have saved an entity. */
export type ProposedUpdate = { uid: string } & Record<string, unknown>;

/** What a form hands over when it would have created one. */
export type ProposedEntity = Record<string, unknown>;

export interface ProposalHandlers {
	/** The form saved a change to something the catalog holds. */
	update: (update: ProposedUpdate) => void;
	/** The form built something the catalog does not have yet. */
	create: (entity: ProposedEntity) => void;
}

export function proposalStateProxy<T extends object>(
	real: T,
	{ update, create }: ProposalHandlers
): T {
	return new Proxy(real, {
		get(target, property) {
			if (property === 'dispatchUpdateEntityAction') {
				return update;
			}
			if (property === 'dispatchAddEntityAction') {
				return create;
			}
			// Nobody deletes from the catalog by proposing: there is no
			// request for it, and the pages that use this do not offer one.
			if (property === 'dispatchDeleteEntityAction') {
				return () => undefined;
			}

			const value = Reflect.get(target, property, target);

			return typeof value === 'function' ? value.bind(target) : value;
		},
	});
}
