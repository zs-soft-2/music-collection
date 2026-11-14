/**
 * How rare a pressing is, in five steps from the one in every shop to the
 * one hardly anybody has seen.
 *
 * It says how many copies are out there, never what one costs: a tier is
 * worked out from how many were pressed and how many collectors hold one,
 * and no price is ever read to decide it.
 */
export type RarityTier =
	'common' | 'uncommon' | 'rare' | 'veryRare' | 'ultraRare';

/** The tiers, the commonest first — the order a rarer tier is compared in. */
export const RARITY_TIERS: readonly RarityTier[] = [
	'common',
	'uncommon',
	'rare',
	'veryRare',
	'ultraRare',
];

/** The rarer of two tiers. */
export function rarerTier(one: RarityTier, other: RarityTier): RarityTier {
	return RARITY_TIERS.indexOf(one) >= RARITY_TIERS.indexOf(other)
		? one
		: other;
}
