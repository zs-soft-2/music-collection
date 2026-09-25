import { Membership } from '@music-collection/api';

/**
 * What the rule below reads off a membership — a stored document, a draft in
 * the line-up editor or a candidate from an import all qualify.
 */
export type MembershipYears = Pick<
	Membership,
	'kind' | 'from' | 'to' | 'active'
>;

/**
 * Whether the musician is still in the band.
 *
 * Where the years say it, they decide: a membership that started and has no
 * end year has not ended. The stored flag cannot carry that on its own —
 * Discogs marks a member inactive wherever nobody has said otherwise, and the
 * line-up editor leaves it off while the end year is still empty — so it only
 * has the last word the other way round, for the members an import knows are
 * current although it filled `to` with their last album year.
 */
export function isCurrentMember(membership: MembershipYears): boolean {
	return (
		membership.active === true ||
		(membership.kind === 'member' &&
			membership.from != null &&
			membership.to == null)
	);
}
