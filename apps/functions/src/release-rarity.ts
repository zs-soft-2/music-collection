/**
 * Egy kiadás ritkasága: öt szint a mindenhol kapható nyomástól a kuriózumig.
 *
 * A szint azt mondja meg, hány példány van belőle — soha nem azt, hogy mibe
 * kerül. Amiből számolunk: hány darab készült (ha tudjuk), hány Discogs-
 * gyűjtőnek van meg, és ezek híján a katalógus címkéi. Árat, piactér-adatot
 * ez a modul nem kap és nem kér: ami pénz, az nem ritkaság.
 *
 * Tiszta logika, `firebase-functions` nélkül, hogy tesztelhető maradjon; a
 * Discogs-hívás és a Firestore a `release-rarity-refresh.ts`-ben van.
 */

/** `libs/common/api` RarityTier — a functions a libs-et nem látja. */
export type RarityTier =
	'common' | 'uncommon' | 'rare' | 'veryRare' | 'ultraRare';

/** A szintek a leggyakoribbtól; a „ritkább" ebben a sorrendben dől el. */
export const RARITY_TIERS: readonly RarityTier[] = [
	'common',
	'uncommon',
	'rare',
	'veryRare',
	'ultraRare',
];

export type RaritySource = 'manual' | 'edition' | 'discogs' | 'catalog';

/** `libs/api` ReleaseRarity. */
export interface ReleaseRarity {
	tier: RarityTier;
	source: RaritySource;
	/** A Discogs „have" a számításkor; null, ha a szint nem ebből jött. */
	have: number | null;
	calculatedAt: number;
}

/**
 * A küszöbök: a megadott szám *alatt* (a példányszámnál: legfeljebb annyi)
 * jár a szint. Kiinduló értékek — a katalógus tényleges eloszlásához a
 * `tools/discogs/rarity-report.mjs` riportja alapján igazítjuk (Q-SCORE-002).
 */
export const RARITY_THRESHOLDS = {
	/** Ennél kevesebb Discogs-gyűjtőnek van meg. */
	have: { ultraRare: 25, veryRare: 100, rare: 300, uncommon: 1000 },
	/** Legfeljebb ennyi darab készült. */
	edition: { ultraRare: 100, veryRare: 300, rare: 1000, uncommon: 3000 },
} as const;

/** Ennél fiatalabb kiadásnál a kevés gyűjtő újdonságot jelent, nem ritkaságot. */
export const YOUNG_RELEASE_YEARS = 2;
/** Ennyi év után számít valamit, hogy egy nyomás eredeti. */
export const ORIGINAL_PRESSING_YEARS = 20;

const LIMITED_EDITION = 'limited edition';
const REISSUE = 'reissue';

/** Amit a kiadásról tudni kell a szinthez. */
export interface RarityInput {
	/** Általános példány: nem nyomás, tehát nincs minek ritkának lennie. */
	generic: boolean;
	/** A kurátor szintje; mindent felülír. */
	override: RarityTier | null;
	/** Hány darab készült; null, ha nem tudjuk. */
	editionSize: number | null;
	/** A Discogs „have"; null, ha a kiadásnak nincs Discogs-azonosítója. */
	have: number | null;
	/** A nyomás éve. */
	releaseYear: number | null;
	/** Az album éve — az eredeti nyomás ehhez mérve eredeti. */
	albumYear: number | null;
	/** A katalógus címkéi (`formatDescription`), kisbetűvel. */
	descriptions: string[];
}

export function rarerTier(one: RarityTier, other: RarityTier): RarityTier {
	return RARITY_TIERS.indexOf(one) >= RARITY_TIERS.indexOf(other)
		? one
		: other;
}

function commonerTier(one: RarityTier, other: RarityTier): RarityTier {
	return RARITY_TIERS.indexOf(one) <= RARITY_TIERS.indexOf(other)
		? one
		: other;
}

/** Hány Discogs-gyűjtőnek van meg → szint. */
export function tierFromHave(have: number): RarityTier {
	const { ultraRare, veryRare, rare, uncommon } = RARITY_THRESHOLDS.have;

	if (have < ultraRare) return 'ultraRare';
	if (have < veryRare) return 'veryRare';
	if (have < rare) return 'rare';
	if (have < uncommon) return 'uncommon';

	return 'common';
}

/** Hány darab készült → szint. */
export function tierFromEdition(size: number): RarityTier {
	const { ultraRare, veryRare, rare, uncommon } = RARITY_THRESHOLDS.edition;

	if (size <= ultraRare) return 'ultraRare';
	if (size <= veryRare) return 'veryRare';
	if (size <= rare) return 'rare';
	if (size <= uncommon) return 'uncommon';

	return 'common';
}

const yearOf = (now: number): number => new Date(now).getUTCFullYear();

/**
 * A címkék szerinti szint, ahol sem példányszám, sem Discogs nincs. Legfeljebb
 * „ritka": amit senki nem számolt meg, arról nem állítjuk, hogy kuriózum.
 */
export function tierFromTags(
	input: Pick<RarityInput, 'descriptions' | 'releaseYear' | 'albumYear'>,
	now: number
): RarityTier {
	const limited = input.descriptions.includes(LIMITED_EDITION);
	const oldOriginal =
		input.releaseYear !== null &&
		input.albumYear !== null &&
		input.releaseYear === input.albumYear &&
		!input.descriptions.includes(REISSUE) &&
		yearOf(now) - input.releaseYear >= ORIGINAL_PRESSING_YEARS;

	if (limited && oldOriginal) return 'rare';

	return limited || oldOriginal ? 'uncommon' : 'common';
}

/**
 * A kiadás szintje, és hogy melyik forrás döntött.
 *
 * Sorrend: a kurátor szava; különben a példányszám és a Discogs közül a
 * ritkább; ezek híján a címkék. A friss kiadás Discogs-szintje korlátozott,
 * a példányszámé nem — ötszáz darabból ötszáz van az első napon is.
 */
export function rateRelease(input: RarityInput, now: number): ReleaseRarity {
	const rarity = (
		tier: RarityTier,
		source: RaritySource,
		have: number | null = null
	): ReleaseRarity => ({ tier, source, have, calculatedAt: now });

	if (input.generic) {
		return rarity('common', 'catalog');
	}
	if (input.override) {
		return rarity(input.override, 'manual', input.have);
	}

	const edition =
		input.editionSize !== null && input.editionSize > 0
			? tierFromEdition(input.editionSize)
			: null;
	let discogs = input.have !== null ? tierFromHave(input.have) : null;

	if (
		discogs !== null &&
		input.releaseYear !== null &&
		yearOf(now) - input.releaseYear < YOUNG_RELEASE_YEARS
	) {
		discogs = commonerTier(discogs, 'uncommon');
	}

	if (edition !== null && discogs !== null) {
		const tier = rarerTier(edition, discogs);

		// Egyenlőnél a példányszám a forrás: az tény, a „have" becslés.
		return rarity(
			tier,
			tier === edition ? 'edition' : 'discogs',
			input.have
		);
	}
	if (edition !== null) {
		return rarity(edition, 'edition');
	}
	if (discogs !== null) {
		return rarity(discogs, 'discogs', input.have);
	}

	return rarity(tierFromTags(input, now), 'catalog');
}

const isTier = (value: unknown): value is RarityTier =>
	RARITY_TIERS.includes(value as RarityTier);

/** Érvényes szint, vagy null — a hívó adatát nem hisszük el. */
export function toTier(value: unknown): RarityTier | null {
	return isTier(value) ? value : null;
}

function yearFromMillis(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) && value > 0
		? new Date(value).getUTCFullYear()
		: null;
}

function positiveInteger(value: unknown): number | null {
	return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
		? value
		: null;
}

/**
 * A kiadás dokumentumából az, ami a szinthez kell. A `have` kívülről jön: azt
 * a Discogs mondja meg, nem a dokumentum.
 */
export function toRarityInput(
	release: Record<string, unknown>,
	have: number | null
): RarityInput {
	const description = release['formatDescription'];
	const descriptions = (
		Array.isArray(description) ? description : [description]
	)
		.filter((item): item is string => typeof item === 'string')
		.map((item) => item.toLowerCase());
	const album = (release['album'] ?? {}) as Record<string, unknown>;
	const override = (release['rarityOverride'] ?? {}) as Record<
		string,
		unknown
	>;
	const albumYear = album['year'];

	return {
		generic: release['generic'] === true,
		override: toTier(override['tier']),
		editionSize: positiveInteger(release['editionSize']),
		have,
		releaseYear: yearFromMillis(release['date']),
		albumYear:
			typeof albumYear === 'number' && Number.isFinite(albumYear)
				? albumYear
				: yearFromMillis(
						(albumYear as { toMillis?: () => number })?.toMillis?.()
					),
		descriptions,
	};
}

/**
 * A Discogs kiadás-válaszából a „have". Csak ezt az egy számot vesszük ki —
 * a válaszban ár és piactér-adat is van, és az nem jöhet tovább.
 */
export function haveOf(response: unknown): number | null {
	const community = (response as { community?: unknown } | null)?.community;
	const have = (community as { have?: unknown } | undefined)?.have;

	return typeof have === 'number' && Number.isFinite(have) && have >= 0
		? Math.floor(have)
		: null;
}

/** Változott-e annyit, hogy írni kelljen: a szint vagy a forrása. */
export function rarityChanged(
	previous: Record<string, unknown> | null | undefined,
	next: ReleaseRarity
): boolean {
	return (
		previous?.['tier'] !== next.tier || previous?.['source'] !== next.source
	);
}

/** A mezők, amikből a szint adódik — a `rarity` maga nincs köztük. */
const RARITY_INPUT_FIELDS = [
	'discogsReleaseId',
	'editionSize',
	'formatDescription',
	'date',
	'generic',
] as const;

/**
 * Kell-e újraszámolni egy írás után: új a kiadás, vagy változott valami,
 * amiből a szint adódik. A szint saját beírása nem ilyen — különben a trigger
 * a saját írására futna újra, a végtelenségig.
 */
export function rarityInputsChanged(
	before: Record<string, unknown> | undefined,
	after: Record<string, unknown> | undefined
): boolean {
	if (!after) {
		return false;
	}
	if (!before) {
		return true;
	}

	return RARITY_INPUT_FIELDS.some(
		(field) =>
			JSON.stringify(before[field] ?? null) !==
			JSON.stringify(after[field] ?? null)
	);
}
