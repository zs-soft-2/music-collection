/**
 * A collection-definíció validálása — keretrendszer nélkül, hogy tesztelni is
 * lehessen: a `firebase-functions` behúzná az admin SDK-t, azon át egy ESM
 * modult, amit a jest nem tud betölteni. A hibát ezért `DefinitionError`
 * jelzi, és a hívó (music-collection-write.ts) fordítja `HttpsError`-ra.
 *
 * A validálás nem formaság. Az ismeretlen kulcsot a resolver nem nézi, az
 * üres criteria pedig a teljes katalógusra illeszkedik — egy elgépelt szűrő
 * így csendben kiosztana egy megszerezhetetlen badge-et. Ezért a kulcsok
 * fehérlistásak, és publikálni csak tényleges szűrővel lehet.
 *
 * Az értékek (stílus, ország, formátum) enumtagságát NEM ellenőrizzük: a
 * listák a `libs/common/api`-ban élnek, amit a functions nem lát, és egy
 * ismeretlen érték legrosszabb esetben nem illeszkedik semmire.
 */

/** A hívó adatának baja; a `code` a callable hibakódja lesz. */
export class DefinitionError extends Error {
	public constructor(
		message: string,
		public readonly code:
			'invalid-argument' | 'failed-precondition' = 'invalid-argument'
	) {
		super(message);
		this.name = 'DefinitionError';
	}
}

const STATUSES = ['draft', 'published'];
const VISIBILITIES = ['private', 'link', 'public'];

/** A criteria kulcsai és operátorai — a `MusicCollectionCriteria` mása. */
const NUMBER_OPERATORS = ['equals', 'from', 'to'];
const ENUM_OPERATORS = ['includesAny', 'includesAll', 'excludes'];
const ENUM_CRITERIA = [
	'styles',
	'artistStyles',
	'albumFormats',
	'artistCountries',
];
const CRITERIA_KEYS = [...ENUM_CRITERIA, 'years', 'artists', 'credits'];
const BADGE_KEYS = ['name', 'description', 'icon', 'artworkUrl'];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_NAME_LENGTH = 120;
const MAX_TEXT_LENGTH = 2000;
/** Egy lista ennyi elemet vehet fel; ennél a szabály már nem szabály. */
const MAX_LIST_LENGTH = 200;
/** A kiadás éve; a katalógus ennél régebbi lemezt nem ismer. */
const MIN_YEAR = 1000;
const MAX_YEAR = 3000;

export interface NumberCriterion {
	equals?: number;
	from?: number;
	to?: number;
}

export interface EnumCriterion {
	includesAny?: string[];
	includesAll?: string[];
	excludes?: string[];
}

export interface MusicCollectionCriteria {
	years?: NumberCriterion;
	styles?: EnumCriterion;
	artistStyles?: EnumCriterion;
	albumFormats?: EnumCriterion;
	artistCountries?: EnumCriterion;
	artists?: { includesAny?: string[] };
	credits?: { musicians?: string[]; roles?: string[] };
}

export interface MusicCollectionDefinition {
	name: string;
	slug: string;
	description: string | null;
	coverImageUrl: string | null;
	icon: string | null;
	criteria: MusicCollectionCriteria;
	badge: {
		name: string;
		description: string | null;
		icon: string | null;
		artworkUrl: string | null;
	} | null;
	parentUid: string | null;
	status: string;
	visibility: string;
}

function invalid(message: string): never {
	throw new DefinitionError(message);
}

function object(value: unknown, field: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		invalid(`A(z) ${field} nem objektum.`);
	}

	return value as Record<string, unknown>;
}

function onlyKeys(
	value: Record<string, unknown>,
	allowed: string[],
	field: string
): void {
	const unknown = Object.keys(value).find((key) => !allowed.includes(key));

	if (unknown) {
		invalid(`Ismeretlen mező a(z) ${field} alatt: ${unknown}.`);
	}
}

function text(value: unknown, field: string, max = MAX_TEXT_LENGTH): string {
	if (typeof value !== 'string' || !value.trim()) {
		invalid(`Hiányzó ${field}.`);
	}

	const trimmed = value.trim();

	if (trimmed.length > max) {
		invalid(`Túl hosszú ${field}.`);
	}

	return trimmed;
}

/** Az üres szöveg és a hiányzó mező ugyanaz: nincs megadva. */
function optionalText(
	value: unknown,
	field: string,
	max = MAX_TEXT_LENGTH
): string | null {
	return value === undefined || value === null || value === ''
		? null
		: text(value, field, max);
}

function choice(value: unknown, allowed: string[], field: string): string {
	if (typeof value !== 'string' || !allowed.includes(value)) {
		invalid(`Érvénytelen ${field}.`);
	}

	return value;
}

/** Nem üres lista nem üres szövegekből, ismétlés nélkül. */
function stringList(value: unknown, field: string): string[] {
	if (!Array.isArray(value) || !value.length) {
		invalid(`A(z) ${field} üres lista.`);
	}
	if (value.length > MAX_LIST_LENGTH) {
		invalid(`Túl hosszú lista: ${field}.`);
	}

	const items = value.map((item) =>
		text(item, `${field} eleme`, MAX_NAME_LENGTH)
	);

	return [...new Set(items)];
}

function year(value: unknown, field: string): number {
	if (
		typeof value !== 'number' ||
		!Number.isSafeInteger(value) ||
		value < MIN_YEAR ||
		value > MAX_YEAR
	) {
		invalid(`Érvénytelen évszám: ${field}.`);
	}

	return value;
}

function numberCriterion(value: unknown, field: string): NumberCriterion {
	const source = object(value, field);

	onlyKeys(source, NUMBER_OPERATORS, field);

	const criterion: NumberCriterion = {};

	for (const operator of NUMBER_OPERATORS) {
		if (source[operator] !== undefined && source[operator] !== null) {
			criterion[operator as keyof NumberCriterion] = year(
				source[operator],
				`${field}.${operator}`
			);
		}
	}

	if (!Object.keys(criterion).length) {
		invalid(`A(z) ${field} nem mond semmit.`);
	}
	if (
		criterion.from !== undefined &&
		criterion.to !== undefined &&
		criterion.from > criterion.to
	) {
		invalid(`A(z) ${field} intervalluma fordítva van.`);
	}

	return criterion;
}

function enumCriterion(value: unknown, field: string): EnumCriterion {
	const source = object(value, field);

	onlyKeys(source, ENUM_OPERATORS, field);

	const criterion: EnumCriterion = {};

	for (const operator of ENUM_OPERATORS) {
		if (source[operator] !== undefined && source[operator] !== null) {
			criterion[operator as keyof EnumCriterion] = stringList(
				source[operator],
				`${field}.${operator}`
			);
		}
	}

	if (!Object.keys(criterion).length) {
		invalid(`A(z) ${field} nem mond semmit.`);
	}

	return criterion;
}

/**
 * A szabály, ahogy a resolver olvassa. A megadott mezők ÉS kapcsolatban
 * vannak, a hiányzó mező pedig nem mond semmit — ezért kell a fehérlista.
 */
export function validateCriteria(value: unknown): MusicCollectionCriteria {
	const source = object(value ?? {}, 'criteria');

	onlyKeys(source, CRITERIA_KEYS, 'criteria');

	const criteria: MusicCollectionCriteria = {};

	for (const key of ENUM_CRITERIA) {
		if (source[key] !== undefined && source[key] !== null) {
			criteria[key as keyof MusicCollectionCriteria] = enumCriterion(
				source[key],
				key
			) as never;
		}
	}

	if (source['years'] !== undefined && source['years'] !== null) {
		criteria.years = numberCriterion(source['years'], 'years');
	}

	if (source['artists'] !== undefined && source['artists'] !== null) {
		const artists = object(source['artists'], 'artists');

		onlyKeys(artists, ['includesAny'], 'artists');
		criteria.artists = {
			includesAny: stringList(
				artists['includesAny'],
				'artists.includesAny'
			),
		};
	}

	if (source['credits'] !== undefined && source['credits'] !== null) {
		const credits = object(source['credits'], 'credits');

		onlyKeys(credits, ['musicians', 'roles'], 'credits');

		const criterion: MusicCollectionCriteria['credits'] = {};

		if (
			credits['musicians'] !== undefined &&
			credits['musicians'] !== null
		) {
			criterion.musicians = stringList(
				credits['musicians'],
				'credits.musicians'
			);
		}
		if (credits['roles'] !== undefined && credits['roles'] !== null) {
			criterion.roles = stringList(credits['roles'], 'credits.roles');
		}
		if (!Object.keys(criterion).length) {
			invalid('A credits nem mond semmit.');
		}

		criteria.credits = criterion;
	}

	return criteria;
}

/** A definíció, ahogy a dokumentumba kerül. A hívó adatát nem hisszük el. */
export function prepareDefinition(data: unknown): MusicCollectionDefinition {
	const source = object(data ?? {}, 'collection');

	onlyKeys(
		source,
		[
			'name',
			'slug',
			'description',
			'coverImageUrl',
			'icon',
			'criteria',
			'badge',
			'parentUid',
			'status',
			'visibility',
		],
		'collection'
	);

	const criteria = validateCriteria(source['criteria']);
	const status =
		source['status'] === undefined
			? 'draft'
			: choice(source['status'], STATUSES, 'status');

	// Szűrő nélkül a collection az egész katalógus. Vázlatként ez még csak
	// befejezetlen, publikálva viszont teljesíthetetlen badge.
	if (status === 'published' && !Object.keys(criteria).length) {
		throw new DefinitionError(
			'Szűrő nélküli collectiont nem lehet publikálni.',
			'failed-precondition'
		);
	}

	const badge = source['badge'] ? object(source['badge'], 'badge') : null;

	if (badge) {
		onlyKeys(badge, BADGE_KEYS, 'badge');
	}

	const slug = text(source['slug'], 'slug', MAX_NAME_LENGTH).toLowerCase();

	if (!SLUG_PATTERN.test(slug)) {
		invalid('A slug csak kisbetűt, számot és kötőjelet tartalmazhat.');
	}

	return {
		name: text(source['name'], 'név', MAX_NAME_LENGTH),
		slug,
		description: optionalText(source['description'], 'leírás'),
		coverImageUrl: optionalText(source['coverImageUrl'], 'borító'),
		icon: optionalText(source['icon'], 'ikon', MAX_NAME_LENGTH),
		criteria,
		badge: badge && {
			name: text(badge['name'], 'badge neve', MAX_NAME_LENGTH),
			description: optionalText(badge['description'], 'badge leírása'),
			icon: optionalText(badge['icon'], 'badge ikonja', MAX_NAME_LENGTH),
			artworkUrl: optionalText(badge['artworkUrl'], 'badge képe'),
		},
		parentUid: optionalText(source['parentUid'], 'szülő', MAX_NAME_LENGTH),
		status,
		visibility:
			source['visibility'] === undefined
				? 'public'
				: choice(source['visibility'], VISIBILITIES, 'visibility'),
	};
}

/** Kulcssorrendtől független ujjlenyomat: ebből látszik, változott-e. */
export function criteriaFingerprint(criteria: unknown): string {
	if (Array.isArray(criteria)) {
		return `[${criteria.map(criteriaFingerprint).join(',')}]`;
	}
	if (typeof criteria !== 'object' || criteria === null) {
		return JSON.stringify(criteria) ?? 'null';
	}

	const source = criteria as Record<string, unknown>;

	return `{${Object.keys(source)
		.sort()
		.map((key) => `${key}:${criteriaFingerprint(source[key])}`)
		.join(',')}}`;
}
