/**
 * Reading the values the catalog actually holds. Dates arrive in several
 * shapes and the older documents spell countries and genres their own way,
 * so every layer has to normalise them the same way — which is why these
 * live here and not beside the components that first needed them.
 */

/**
 * Dates arrive in several shapes: a Firestore `Timestamp` (`{ seconds }`), a
 * `Date`, an ISO string or epoch milliseconds.
 */
export function toEpochMs(value: unknown): number | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}
	if (value instanceof Date) {
		return isNaN(value.getTime()) ? null : value.getTime();
	}
	if (typeof value === 'number') {
		return value;
	}
	if (typeof value === 'string') {
		const ms = Date.parse(value);
		return isNaN(ms) ? null : ms;
	}
	if (typeof value === 'object' && 'seconds' in value) {
		const seconds = (value as { seconds: unknown }).seconds;
		return typeof seconds === 'number' ? seconds * 1000 : null;
	}
	return null;
}

/** `formatDescription` is typed as one value but is stored as a list. */
export function toDescriptions(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.filter((item): item is string => typeof item === 'string');
	}
	return typeof value === 'string' && value ? [value] : [];
}

export function toYear(value: unknown): number | null {
	const ms = toEpochMs(value);
	return ms === null ? null : new Date(ms).getFullYear();
}

/** Countries are stored inconsistently: "USA", "Germany", "UNITED_KINGDOM". */
export function formatCountry(country: unknown): string | null {
	if (typeof country !== 'string' || !country.trim()) {
		return null;
	}
	if (country.length <= 3) {
		return country.toUpperCase();
	}
	return country
		.toLowerCase()
		.split(/[_\s]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/** Genres are stored as "Rock" or as enum keys like "THRASH_METAL". */
export function formatGenre(genre: unknown): string | null {
	if (typeof genre !== 'string' || !genre.trim()) {
		return null;
	}
	return genre
		.toLowerCase()
		.split(/[_\s]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}
