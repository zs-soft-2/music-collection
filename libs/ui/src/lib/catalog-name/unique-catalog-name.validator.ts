import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { normalizeCatalogName } from '@music-collection/common/engine';

/** The name already in the catalog, for the message under the field. */
export interface DuplicateCatalogName {
	match: string;
}

export const DUPLICATE_CATALOG_NAME = 'duplicateCatalogName';

/**
 * Refuses a name the catalog already holds, comparing names the way the
 * catalog compares them: "The Testament" and "Testament (2)" are one name.
 *
 * `taken` is read on every check rather than captured, so a field whose
 * rivals depend on another field — an album title, which only clashes within
 * its own artist — stays right as that other field changes.
 */
export function uniqueCatalogName(taken: () => Iterable<string>): ValidatorFn {
	return (control: AbstractControl): ValidationErrors | null => {
		const name = normalizeCatalogName(String(control.value ?? ''));

		// An empty name is `required`'s business, not ours.
		if (name === '') {
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
