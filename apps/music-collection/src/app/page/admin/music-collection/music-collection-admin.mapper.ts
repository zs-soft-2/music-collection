import {
	EnumCriterion,
	MusicCollectionCriteria,
	MusicCollectionDraft,
	MusicCollectionEntity,
} from '@music-collection/domain/music-collection/api';
import { MusicCollectionResolution } from '@music-collection/domain/music-collection/core';

import {
	CollectionForm,
	CollectionRow,
	CriteriaForm,
	ENUM_CRITERIA,
	EnumCriterionForm,
	EnumOperator,
	emptyCollectionForm,
	emptyCriteriaForm,
} from './music-collection-admin.model';

/**
 * Between the editor's form and the definition the callable takes. The rule
 * itself is decided here and nowhere else: an empty criterion is left out
 * rather than sent as an empty list, because the resolver reads a missing
 * field as "says nothing" and an empty list as "matches nothing".
 *
 * The credits criterion has no editor yet — it needs a musician picker — so
 * the form carries it through untouched rather than dropping it: what the
 * editor cannot express, it must not silently delete either.
 */

/** A readable slug from the name: lowercase words joined by hyphens. */
export function slugify(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

const trimmed = (value: string): string | null => value.trim() || null;

function toEnumCriterion(
	criterion: EnumCriterionForm
): EnumCriterion<never> | undefined {
	return criterion.values.length
		? ({
				[criterion.operator]: [...criterion.values],
			} as EnumCriterion<never>)
		: undefined;
}

/** The rule as the resolver reads it; everything empty is left out. */
export function toCriteria(form: CriteriaForm): MusicCollectionCriteria {
	const criteria: MusicCollectionCriteria = {};

	if (form.yearFrom !== null || form.yearTo !== null) {
		criteria.years = {
			...(form.yearFrom !== null ? { from: form.yearFrom } : {}),
			...(form.yearTo !== null ? { to: form.yearTo } : {}),
		};
	}

	for (const { key } of ENUM_CRITERIA) {
		const criterion = toEnumCriterion(form[key]);

		if (criterion) {
			criteria[key] = criterion as never;
		}
	}

	if (form.artists.length) {
		criteria.artists = { includesAny: [...form.artists] };
	}
	if (form.credits) {
		criteria.credits = form.credits;
	}

	return criteria;
}

function toEnumCriterionForm(
	criterion: EnumCriterion<string> | undefined
): EnumCriterionForm {
	for (const operator of [
		'includesAny',
		'includesAll',
		'excludes',
	] as EnumOperator[]) {
		const values = criterion?.[operator];

		if (values?.length) {
			return { operator, values: [...values] };
		}
	}

	return { operator: 'includesAny', values: [] };
}

export function toCriteriaForm(
	criteria: MusicCollectionCriteria
): CriteriaForm {
	const form = emptyCriteriaForm();

	form.yearFrom = criteria.years?.from ?? criteria.years?.equals ?? null;
	form.yearTo = criteria.years?.to ?? criteria.years?.equals ?? null;

	for (const { key } of ENUM_CRITERIA) {
		form[key] = toEnumCriterionForm(
			criteria[key] as EnumCriterion<string> | undefined
		);
	}

	form.artists = [...(criteria.artists?.includesAny ?? [])];
	form.credits = criteria.credits ?? null;

	return form;
}

export function toForm(collection: MusicCollectionEntity): CollectionForm {
	return {
		...emptyCollectionForm(),
		name: collection.name,
		slug: collection.slug,
		description: collection.description ?? '',
		icon: collection.icon ?? '',
		coverImageUrl: collection.coverImageUrl ?? '',
		status: collection.status,
		visibility: collection.visibility,
		parentUid: collection.parentUid ?? '',
		badgeName: collection.badge?.name ?? '',
		badgeDescription: collection.badge?.description ?? '',
		badgeIcon: collection.badge?.icon ?? '',
		badgeArtworkUrl: collection.badge?.artworkUrl ?? '',
		criteria: toCriteriaForm(collection.criteria),
	};
}

export function toDraft(form: CollectionForm): MusicCollectionDraft {
	const badgeName = trimmed(form.badgeName);

	return {
		name: form.name.trim(),
		slug: slugify(form.slug || form.name),
		description: trimmed(form.description),
		coverImageUrl: trimmed(form.coverImageUrl),
		icon: trimmed(form.icon),
		criteria: toCriteria(form.criteria),
		badge: badgeName
			? {
					name: badgeName,
					description: trimmed(form.badgeDescription),
					icon: trimmed(form.badgeIcon),
					artworkUrl: trimmed(form.badgeArtworkUrl),
				}
			: null,
		parentUid: trimmed(form.parentUid),
		status: form.status,
		visibility: form.visibility,
	};
}

/** The rule in one line, so the list says what a collection asks for. */
export function describeCriteria(criteria: MusicCollectionCriteria): string {
	const parts: string[] = [];
	const { years } = criteria;

	if (years) {
		if (years.equals !== undefined) {
			parts.push(String(years.equals));
		} else {
			parts.push(`${years.from ?? '…'}–${years.to ?? '…'}`);
		}
	}

	for (const { key, label } of ENUM_CRITERIA) {
		const criterion = criteria[key] as EnumCriterion<string> | undefined;
		const form = toEnumCriterionForm(criterion);

		if (form.values.length) {
			const operator =
				form.operator === 'excludes'
					? 'not '
					: form.operator === 'includesAll'
						? 'all '
						: '';

			parts.push(
				`${label.toLowerCase()} ${operator}${form.values.join(', ')}`
			);
		}
	}

	if (criteria.artists?.includesAny?.length) {
		parts.push(`${criteria.artists.includesAny.length} artist(s)`);
	}
	if (criteria.credits) {
		parts.push('credits');
	}

	return parts.join(' · ') || 'No rule — matches the whole catalog';
}

/** Alphabetical: the admin looks a collection up by name, not by progress. */
export function toRows(
	resolutions: MusicCollectionResolution[]
): CollectionRow[] {
	const names = new Map(
		resolutions.map(({ collection }) => [collection.uid, collection.name])
	);

	return resolutions
		.map(({ collection, resolved }) => ({
			uid: collection.uid,
			name: collection.name,
			slug: collection.slug,
			status: collection.status,
			visibility: collection.visibility,
			total: resolved.total,
			badgeName: collection.badge?.name ?? null,
			summary: describeCriteria(collection.criteria),
			parentName: collection.parentUid
				? (names.get(collection.parentUid) ?? null)
				: null,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
