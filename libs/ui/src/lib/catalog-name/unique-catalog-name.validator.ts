import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { normalizeCatalogName } from '@music-collection/common/engine';

/** The name already in the catalog, for the message under the field. */
export interface DuplicateCatalogName {
	match: string;
}

/**
 * The record in the catalog the one in the form cannot be told apart from,
 * for the message under the name field and the link that leads to it.
 */
export interface CatalogDuplicate {
	/** Whether it stops the form saving: the name was typed into the clash. */
	blocking: boolean;
	name: string;
	uid: string;
}

export const DUPLICATE_CATALOG_NAME = 'duplicateCatalogName';

/**
 * Refuses a name the catalog already holds, comparing names the way the
 * catalog compares them: "The Testament" and "Testament (2)" are one name.
 *
 * `taken` is read on every check rather than captured, so a field whose
 * rivals depend on another field — an album title, which only clashes within
 * its own artist — stays right as that other field changes.
 *
 * `settled` is the name the record arrived with. A record that opened the
 * form already standing in a clash is not this form's to fix — one of the two
 * has to be merged away in the catalog — and refusing it here would lock the
 * record out of every other edit, down to its cover. So that one clash passes,
 * for the form to report as a warning; a name typed *into* a clash is still
 * refused.
 */
export function uniqueCatalogName(
	taken: () => Iterable<string>,
	settled: () => string | null = () => null
): ValidatorFn {
	return (control: AbstractControl): ValidationErrors | null => {
		const name = normalizeCatalogName(String(control.value ?? ''));

		// An empty name is `required`'s business, not ours.
		if (name === '') {
			return null;
		}

		// The clash the record walked in with; the catalog owns that one.
		if (name === normalizeCatalogName(settled() ?? '')) {
			return null;
		}

		for (const other of taken()) {
			if (normalizeCatalogName(other) === name) {
				return {
					[DUPLICATE_CATALOG_NAME]: {
						match: other,
					} satisfies DuplicateCatalogName,
				};
			}
		}

		return null;
	};
}
