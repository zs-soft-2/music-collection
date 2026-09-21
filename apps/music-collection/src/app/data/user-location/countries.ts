import { COUNTRY_POSITIONS } from './country-atlas';

/**
 * The countries a collector can say they are in. The codes and the points
 * their pins sit on are generated (`tools/generators/build-country-atlas.mjs`);
 * the names come from the browser (`Intl.DisplayNames`), so they arrive in
 * the reader's own language and there is no name list to maintain. A code
 * the browser cannot name is left out rather than shown as itself.
 */
export interface Country {
	/** ISO 3166-1 alpha-2, e.g. "HU". */
	code: string;
	name: string;
}

let names: Intl.DisplayNames | null | undefined;
let sorted: Country[] | null = null;

function displayNames(): Intl.DisplayNames | null {
	if (names === undefined) {
		try {
			names = new Intl.DisplayNames(undefined, { type: 'region' });
		} catch {
			// No ICU data for regions: the codes stand in for the names.
			names = null;
		}
	}

	return names;
}

/** The name of a country, or its code where the browser has no name. */
export function countryName(code: string): string {
	try {
		return displayNames()?.of(code) ?? code;
	} catch {
		return code;
	}
}

/** Where the country's pin sits, as [longitude, latitude]. */
export function countryPosition(code: string): [number, number] | null {
	return COUNTRY_POSITIONS[code] ?? null;
}

/** Every country that can be named, in the reader's alphabetical order. */
export function countries(): Country[] {
	if (!sorted) {
		sorted = Object.keys(COUNTRY_POSITIONS)
			.map((code) => ({ code, name: countryName(code) }))
			.filter((country) => country.name !== country.code)
			.sort((one, other) => one.name.localeCompare(other.name));
	}

	return sorted;
}

export function isCountryCode(code: unknown): code is string {
	return typeof code === 'string' && code in COUNTRY_POSITIONS;
}
