import { Translator } from '@music-collection/core/i18n';
import {
	EnumCriterion,
	MusicCollectionCriteria,
	MusicCollectionDraft,
	MusicCollectionEntity,
} from '@music-collection/domain/music-collection/api';
import { MusicCollectionResolution } from '@music-collection/domain/music-collection/core';
import { derivedBasePoints } from '@music-collection/domain/music-collection/engine';

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
 * The credits criterion is split in two here — the musicians and the roles —
 * because that is how the form asks for them; they go back together as one
 * criterion, which is what makes "this musician in this role" a single
 * condition rather than two.
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

/**
 * The curator's score, or null to leave it to the rule. Anything that is not
 * a whole number is left to the rule too — the server would refuse it, and
 * "no number" is what a half-typed one means anyway.
 */
export function toBasePoints(value: string): number | null {
	const points = Number(value.trim());

	return value.trim() && Number.isSafeInteger(points) && points >= 0
		? points
		: null;
}

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
	/*
	 * One credit must satisfy the whole criterion: "Gene Hoglan on drums" is
	 * not met by Hoglan guesting on vocals while somebody else drums.
	 */
	if (form.creditMusicians.length || form.creditRoles.length) {
		criteria.credits = {
			...(form.creditMusicians.length
				? { musicians: [...form.creditMusicians] }
				: {}),
			...(form.creditRoles.length
				? { roles: [...form.creditRoles] }
				: {}),
		};
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
	form.creditMusicians = [...(criteria.credits?.musicians ?? [])];
	form.creditRoles = [...(criteria.credits?.roles ?? [])];

	return form;
}

export function toForm(collection: MusicCollectionEntity): CollectionForm {
	return {
		...emptyCollectionForm(),
		basePoints:
			collection.basePoints === null ? '' : String(collection.basePoints),
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
		basePoints: toBasePoints(form.basePoints),
		parentUid: trimmed(form.parentUid),
		status: form.status,
		visibility: form.visibility,
	};
}

/**
 * The rule in one line, so the list says what a collection asks for.
 *
 * The words come in rather than being written here: this is a sentence a
 * German admin reads too, and the pieces of it — the field names, the "not"
 * and the "all" — are the app's own words, not the catalog's.
 */
export function describeCriteria(
	criteria: MusicCollectionCriteria,
	t: Translator
): string {
	const parts: string[] = [];
	const { years } = criteria;

	if (years) {
		if (years.equals !== undefined) {
			parts.push(String(years.equals));
		} else {
			parts.push(`${years.from ?? '…'}–${years.to ?? '…'}`);
		}
	}

	for (const { key, labelKey } of ENUM_CRITERIA) {
		const criterion = criteria[key] as EnumCriterion<string> | undefined;
		const form = toEnumCriterionForm(criterion);

		if (form.values.length) {
			const operator =
				form.operator === 'excludes'
					? t('admin.summary.not')
					: form.operator === 'includesAll'
						? t('admin.summary.all')
						: '';

			parts.push(
				`${t(labelKey).toLocaleLowerCase()} ${operator}${form.values.join(', ')}`.replace(
					/\s+/g,
					' '
				)
			);
		}
	}

	if (criteria.artists?.includesAny?.length) {
		parts.push(
			t('admin.summary.artists', {
				count: criteria.artists.includesAny.length,
			})
		);
	}
	if (criteria.credits) {
		const credited = [];

		if (criteria.credits.musicians?.length) {
			credited.push(
				t('admin.summary.musicians', {
					count: criteria.credits.musicians.length,
				})
			);
		}
		if (criteria.credits.roles?.length) {
			credited.push(criteria.credits.roles.join(', '));
		}

		parts.push(
			t('admin.summary.credited', {
				credited: credited.join(t('admin.summary.as')),
			})
		);
	}

	return parts.join(' · ') || t('admin.summary.noRule');
}

/** Alphabetical: the admin looks a collection up by name, not by progress. */
export function toRows(
	resolutions: MusicCollectionResolution[],
	t: Translator
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
			points: collection.basePoints ?? derivedBasePoints(resolved.albums),
			derivedPoints: collection.basePoints === null,
			badgeName: collection.badge?.name ?? null,
			summary: describeCriteria(collection.criteria, t),
			parentName: collection.parentUid
				? (names.get(collection.parentUid) ?? null)
				: null,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
