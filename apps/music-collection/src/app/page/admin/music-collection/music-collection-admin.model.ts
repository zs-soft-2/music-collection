import {
	CountryList,
	FormatList,
	StyleList,
} from '@music-collection/common/api';
import {
	CreditCriterion,
	MusicCollectionStatus,
	MusicCollectionVisibility,
} from '@music-collection/domain/music-collection/api';

/** How an enum criterion reads its list. */
export type EnumOperator = 'includesAny' | 'includesAll' | 'excludes';

export const ENUM_OPERATOR_OPTIONS: {
	value: EnumOperator;
	label: string;
}[] = [
	{ value: 'includesAny', label: 'any of' },
	{ value: 'includesAll', label: 'all of' },
	{ value: 'excludes', label: 'none of' },
];

export interface EnumCriterionForm {
	operator: EnumOperator;
	values: string[];
}

/**
 * The criteria as the editor holds them: every criterion is present, and an
 * empty one simply does not reach the definition. The shape is flat on
 * purpose — a form field maps onto one property, and turning it into a rule
 * happens in one place (`toCriteria`).
 */
export interface CriteriaForm {
	yearFrom: number | null;
	yearTo: number | null;
	styles: EnumCriterionForm;
	artistStyles: EnumCriterionForm;
	albumFormats: EnumCriterionForm;
	artistCountries: EnumCriterionForm;
	/** Artist uids. */
	artists: string[];
	/**
	 * Carried through untouched: the credits criterion has no editor yet (it
	 * needs a musician picker), and what the form cannot write it must not
	 * drop either.
	 */
	credits: CreditCriterion | null;
}

export interface CollectionForm {
	name: string;
	slug: string;
	description: string;
	icon: string;
	coverImageUrl: string;
	status: MusicCollectionStatus;
	visibility: MusicCollectionVisibility;
	parentUid: string;
	badgeName: string;
	badgeDescription: string;
	badgeIcon: string;
	badgeArtworkUrl: string;
	criteria: CriteriaForm;
}

/** Which enum criteria the editor offers, and what they choose from. */
export const ENUM_CRITERIA: {
	key: keyof Pick<
		CriteriaForm,
		'styles' | 'artistStyles' | 'albumFormats' | 'artistCountries'
	>;
	label: string;
	hint: string;
	options: string[];
}[] = [
	{
		key: 'styles',
		label: 'Album styles',
		hint: 'The style the record was written in.',
		options: StyleList,
	},
	{
		key: 'artistStyles',
		label: 'Artist styles',
		hint: 'What the artist is known for — it may be decades from the album.',
		options: StyleList,
	},
	{
		key: 'albumFormats',
		label: 'Album formats',
		hint: '`lp` for studio albums; take in `ep` or `live` deliberately.',
		options: FormatList,
	},
	{
		key: 'artistCountries',
		label: 'Artist countries',
		hint: 'Where the artist is from, not where the pressing was made.',
		options: CountryList,
	},
];

export const STATUS_OPTIONS: MusicCollectionStatus[] = ['draft', 'published'];

export const VISIBILITY_OPTIONS: {
	value: MusicCollectionVisibility;
	label: string;
}[] = [
	{ value: 'public', label: 'Public — listed to everyone' },
	{ value: 'link', label: 'Link — readable by whoever knows it' },
	{ value: 'private', label: 'Private — only an admin' },
];

const emptyEnumCriterion = (): EnumCriterionForm => ({
	operator: 'includesAny',
	values: [],
});

export const emptyCriteriaForm = (): CriteriaForm => ({
	yearFrom: null,
	yearTo: null,
	styles: emptyEnumCriterion(),
	artistStyles: emptyEnumCriterion(),
	albumFormats: emptyEnumCriterion(),
	artistCountries: emptyEnumCriterion(),
	artists: [],
	credits: null,
});

export const emptyCollectionForm = (): CollectionForm => ({
	name: '',
	slug: '',
	description: '',
	icon: '',
	coverImageUrl: '',
	status: 'draft',
	visibility: 'public',
	parentUid: '',
	badgeName: '',
	badgeDescription: '',
	badgeIcon: '',
	badgeArtworkUrl: '',
	criteria: emptyCriteriaForm(),
});

/** One definition as the admin list shows it. */
export interface CollectionRow {
	uid: string;
	name: string;
	slug: string;
	status: MusicCollectionStatus;
	visibility: MusicCollectionVisibility;
	/** What the rule catches in the catalog right now. */
	total: number;
	badgeName: string | null;
	/** The criteria in one line, so the list says what the rule is. */
	summary: string;
	parentName: string | null;
}
