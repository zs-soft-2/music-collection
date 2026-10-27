import {
	EnumCriterion,
	NumberCriterion,
	ReferenceCriterion,
} from '@music-collection/domain/music-collection/api';

/**
 * The operators the criteria are written in. Each one answers "does this
 * value satisfy this criterion", and a criterion left out is satisfied by
 * everything — the fields of a criteria object are ANDed, so an absent field
 * simply says nothing.
 */

export function matchesNumber(
	value: number | null,
	criterion?: NumberCriterion
): boolean {
	if (!criterion) {
		return true;
	}
	// A year is being asked for and the catalog does not know it.
	if (value === null) {
		return false;
	}
	if (criterion.equals !== undefined && value !== criterion.equals) {
		return false;
	}
	if (criterion.from !== undefined && value < criterion.from) {
		return false;
	}

	return criterion.to === undefined || value <= criterion.to;
}

export function matchesEnum<T extends string>(
	values: readonly T[],
	criterion?: EnumCriterion<T>
): boolean {
	if (!criterion) {
		return true;
	}
	if (
		criterion.includesAny !== undefined &&
		!criterion.includesAny.some((wanted) => values.includes(wanted))
	) {
		return false;
	}
	if (
		criterion.includesAll !== undefined &&
		!criterion.includesAll.every((wanted) => values.includes(wanted))
	) {
		return false;
	}

	return (
		criterion.excludes === undefined ||
		!criterion.excludes.some((unwanted) => values.includes(unwanted))
	);
}

/** A single-valued field, read as a list so the operators stay the same. */
export function matchesSingleEnum<T extends string>(
	value: T | null,
	criterion?: EnumCriterion<T>
): boolean {
	return matchesEnum(value === null ? [] : [value], criterion);
}

export function matchesReference(
	uid: string,
	criterion?: ReferenceCriterion
): boolean {
	return (
		!criterion ||
		criterion.includesAny === undefined ||
		criterion.includesAny.includes(uid)
	);
}
